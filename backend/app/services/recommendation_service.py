import math
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from backend.app.models import (
    Stop, Trip, Vehicle, DispatchRecommendation, AuditLog
)
from backend.app.services.demand_service import DemandService

class RecommendationService:
    @staticmethod
    def get_spare_vehicles(db: Session) -> List[Vehicle]:
        """
        Finds vehicles with status='idle' that are not in an active in_progress trip.
        """
        active_vehicle_ids = [
            t.vehicle_id for t in db.query(Trip.vehicle_id).filter(Trip.state == "in_progress").all()
        ]
        return db.query(Vehicle).filter(
            Vehicle.status == "idle",
            ~Vehicle.id.in_(active_vehicle_ids)
        ).all()

    @staticmethod
    def evaluate_and_generate_recommendation(
        db: Session,
        stop_id: str,
        simulated_historical_demand: int = 0,
        target_total_demand: Optional[int] = None,
        window_label: str = "16:00 - 16:15"
    ) -> Optional[DispatchRecommendation]:
        """
        Calculates shortfall and generates explainable dispatch recommendation.
        Follows SRS Section 3.5, 8.3 & Test T06, T07.
        """
        stop = db.query(Stop).filter(Stop.id == stop_id).first()
        if not stop:
            return None

        demand_data = DemandService.calculate_stop_demand_and_supply(
            db, stop_id, simulated_historical_demand=simulated_historical_demand, target_total_demand=target_total_demand
        )
        total_demand = demand_data["total_demand"]
        free_capacity = demand_data["free_capacity"]
        shortfall = demand_data["shortfall"]


        if shortfall <= 0:
            return None

        # Check existing pending recommendation for this stop & window
        existing = db.query(DispatchRecommendation).filter(
            DispatchRecommendation.stop_id == stop_id,
            DispatchRecommendation.status == "pending"
        ).first()

        spare_vehicles = RecommendationService.get_spare_vehicles(db)
        selected_spare: Optional[Vehicle] = spare_vehicles[0] if spare_vehicles else None

        if selected_spare:
            usable_cap = max(1, selected_spare.capacity)
            extra_buses_needed = math.ceil(shortfall / usable_cap)
            suggestion_text = (
                f"Peak crowd detected at {stop.name}. Total expected demand: {total_demand} riders. "
                f"Approaching free capacity: {free_capacity} seats. Shortfall: {shortfall} riders. "
                f"Recommend dispatching {extra_buses_needed} additional shuttle ({selected_spare.label}, "
                f"{selected_spare.capacity} seats) from depot. Driver available."
            )
            suggested_vehicle_id = selected_spare.id
        else:
            # T07 mitigation: Flag unmet demand, never fictional dispatch
            suggestion_text = (
                f"Peak crowd detected at {stop.name}. Total expected demand: {total_demand} riders. "
                f"Approaching free capacity: {free_capacity} seats. Critical shortfall: {shortfall} riders. "
                f"WARNING: Zero spare shuttles available in fleet. Recommendation is advisory only; "
                f"no additional vehicle can be dispatched at this time."
            )
            suggested_vehicle_id = None

        if existing:
            existing.demand = total_demand
            existing.free_capacity = free_capacity
            existing.shortfall = shortfall
            existing.suggestion = suggestion_text
            existing.suggested_vehicle_id = suggested_vehicle_id
            db.commit()
            db.refresh(existing)
            return existing

        now = datetime.now(timezone.utc)
        rec = DispatchRecommendation(
            stop_id=stop_id,
            window=window_label,
            demand=total_demand,
            free_capacity=free_capacity,
            shortfall=shortfall,
            suggested_vehicle_id=suggested_vehicle_id,
            suggestion=suggestion_text,
            status="pending",
            created_at=now
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        return rec

    @staticmethod
    def action_recommendation(
        db: Session,
        recommendation_id: int,
        action: str, # "accept" or "reject"
        actor: str = "transport_admin",
        reason: Optional[str] = None
    ) -> DispatchRecommendation:
        """
        Accepts or rejects recommendation and creates audit log (FR-16).
        """
        rec = db.query(DispatchRecommendation).filter(DispatchRecommendation.id == recommendation_id).first()
        if not rec:
            raise ValueError(f"Recommendation {recommendation_id} not found")

        now = datetime.now(timezone.utc)
        rec.status = "accepted" if action == "accept" else "rejected"
        rec.reason = reason or ("Approved by transport admin" if action == "accept" else "Dismissed by admin")
        rec.actioned_at = now

        # If accepted and vehicle assigned, activate vehicle
        if action == "accept" and rec.suggested_vehicle_id:
            veh = db.query(Vehicle).filter(Vehicle.id == rec.suggested_vehicle_id).first()
            if veh:
                veh.status = "active"
                # Start extra trip
                new_trip = Trip(
                    id=f"trip-extra-{int(now.timestamp())}",
                    route_id="route-1",
                    vehicle_id=veh.id,
                    driver_id="driver_backup",
                    start_time=now,
                    state="in_progress"
                )
                db.add(new_trip)

        # Audit trail (FR-16)
        audit = AuditLog(
            actor=actor,
            action=f"RECOMMENDATION_{action.upper()}",
            details=f"Recommendation #{rec.id} for stop {rec.stop_id} was {rec.status}. Reason: {rec.reason}",
            timestamp=now
        )
        db.add(audit)
        db.commit()
        db.refresh(rec)
        return rec
