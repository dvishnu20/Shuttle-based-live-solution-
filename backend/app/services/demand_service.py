import math
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.app.models import Stop, BoardingIntent, Trip, Vehicle, Route, DispatchRecommendation, AuditLog
from backend.app.services.occupancy_service import OccupancyService

class DemandService:
    @staticmethod
    def get_stop_queue_demand(db: Session, stop_id: str, window_minutes: int = 15) -> int:
        """
        Counts active, unexpired boarding intents for stop_id within the active time window.
        """
        now = datetime.now(timezone.utc)
        count = db.query(BoardingIntent).filter(
            BoardingIntent.stop_id == stop_id,
            BoardingIntent.expires_at >= now
        ).count()
        return count

    @staticmethod
    def record_boarding_intent(
        db: Session,
        stop_id: str,
        session_id: str,
        window_minutes: int = 15
    ) -> BoardingIntent:
        """
        Registers an opt-in intent. Prevents duplicates from same session/user while active (FR-08).
        """
        now = datetime.now(timezone.utc)
        existing = db.query(BoardingIntent).filter(
            BoardingIntent.anonymous_session_or_user_id == session_id,
            BoardingIntent.stop_id == stop_id,
            BoardingIntent.expires_at >= now
        ).first()

        if existing:
            # Update expiry
            existing.expires_at = now + timedelta(minutes=window_minutes)
            db.commit()
            db.refresh(existing)
            return existing

        intent = BoardingIntent(
            anonymous_session_or_user_id=session_id,
            stop_id=stop_id,
            window_start=now,
            expires_at=now + timedelta(minutes=window_minutes)
        )
        db.add(intent)
        db.commit()
        db.refresh(intent)
        return intent

    @staticmethod
    def calculate_stop_demand_and_supply(
        db: Session,
        stop_id: str,
        simulated_historical_demand: int = 0,
        target_total_demand: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Calculates demand vs free capacity for the current 15-minute departure window.
        """
        confirmed_intents = DemandService.get_stop_queue_demand(db, stop_id)
        if target_total_demand is not None:
            total_demand = target_total_demand
            historical_estimate = max(0, target_total_demand - confirmed_intents)
        else:
            total_demand = confirmed_intents + simulated_historical_demand
            historical_estimate = simulated_historical_demand

        # Calculate free capacity on all active trips approaching this stop
        active_trips = db.query(Trip).filter(Trip.state == "in_progress").all()
        total_free_capacity = 0

        for trip in active_trips:
            capacity, current_occ, avail, _, _, _ = OccupancyService.get_trip_occupancy_status(db, trip.id)
            total_free_capacity += avail

        shortfall = max(0, total_demand - total_free_capacity)

        return {
            "stop_id": stop_id,
            "confirmed_intents": confirmed_intents,
            "historical_estimate": historical_estimate,
            "total_demand": total_demand,
            "free_capacity": total_free_capacity,
            "shortfall": shortfall
        }

