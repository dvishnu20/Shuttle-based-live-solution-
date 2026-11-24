import asyncio
import json
import math
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from backend.app.database import SessionLocal
from backend.app.models import (
    Stop, Route, Trip, Vehicle, Position, OccupancyEvent, DispatchRecommendation, DriverRegistration
)
from backend.app.services.eta_service import ETAService, calculate_bearing
from backend.app.services.occupancy_service import OccupancyService
from backend.app.services.recommendation_service import RecommendationService
from backend.app.services.connection_manager import manager

class CampusSimulator:
    def __init__(self):
        self.is_running: bool = False
        self.speed_multiplier: float = 1.0
        self.active_scenario: str = "normal"
        self._task: Optional[asyncio.Task] = None
        self.step_counter: int = 0
        self.stale_gps_simulated: bool = False

    def start(self, speed: float = 1.0):
        self.speed_multiplier = speed
        self.is_running = True
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._simulation_loop())

    def stop(self):
        self.is_running = False
        if self._task and not self._task.done():
            self._task.cancel()

    def set_scenario(self, scenario_name: str, speed: float = 1.0):
        self.active_scenario = scenario_name
        self.speed_multiplier = speed
        db = SessionLocal()
        try:
            # Find first hostel stop dynamically
            target_stop = db.query(Stop).filter(Stop.id.like("%mh%")).first() or db.query(Stop).first()
            target_stop_id = target_stop.id if target_stop else "stop-mh"

            if scenario_name == "crowd_spike":
                # Clear extra trips and reset spare vehicles to idle
                db.query(Trip).filter(Trip.id.like("trip-extra%")).delete()
                for sp in db.query(Vehicle).filter(Vehicle.id.like("%spare%")).all():
                    sp.status = "idle"
                # Keep exactly 2 active in-progress shuttles (80 seats capacity as per SRS Sec 3.5)
                active_trips = db.query(Trip).filter(Trip.state == "in_progress").all()
                if len(active_trips) > 2:
                    for extra_t in active_trips[2:]:
                        extra_t.state = "completed"
                for t in db.query(Trip).filter(Trip.state == "in_progress").all():
                    OccupancyService.update_occupancy(db, t.id, direct_count=0, source="simulator")
                db.commit()

                # Generate recommendation for Hostel Stop (95 expected - 80 seats = 15 shortfall)
                RecommendationService.evaluate_and_generate_recommendation(
                    db,
                    stop_id=target_stop_id,
                    target_total_demand=95,
                    window_label="16:00 - 16:15"
                )
            elif scenario_name == "stale_gps":
                self.stale_gps_simulated = True
            elif scenario_name == "full_bus":
                # Set Trip 1 to full capacity (40/40)
                trip1 = db.query(Trip).filter(Trip.id == "trip-1").first()
                if trip1:
                    veh = db.query(Vehicle).filter(Vehicle.id == trip1.vehicle_id).first()
                    cap = veh.capacity if veh else 40
                    OccupancyService.update_occupancy(db, trip1.id, direct_count=cap, source="simulator")
            elif scenario_name == "no_spare_bus":
                # Clear extra trips
                db.query(Trip).filter(Trip.id.like("trip-extra%")).delete()
                # Set all spare vehicles to maintenance so count is 0
                for sp in db.query(Vehicle).filter(Vehicle.status == "idle").all():
                    sp.status = "maintenance"
                # Keep exactly 2 active in-progress shuttles (80 seats)
                active_trips = db.query(Trip).filter(Trip.state == "in_progress").all()
                if len(active_trips) > 2:
                    for extra_t in active_trips[2:]:
                        extra_t.state = "completed"
                for t in db.query(Trip).filter(Trip.state == "in_progress").all():
                    OccupancyService.update_occupancy(db, t.id, direct_count=0, source="simulator")
                db.commit()

                # Now trigger crowd spike with zero spares
                RecommendationService.evaluate_and_generate_recommendation(
                    db,
                    stop_id=target_stop_id,
                    target_total_demand=95,
                    window_label="16:00 - 16:15"
                )

            elif scenario_name == "reset":
                self.stale_gps_simulated = False
                # Remove extra trips
                db.query(Trip).filter(Trip.id.like("trip-extra%")).delete()
                # Reset spare vehicles
                for sp in db.query(Vehicle).filter(Vehicle.id.like("%spare%")).all():
                    sp.status = "idle"
                # Reset occupancy
                for t in db.query(Trip).filter(Trip.state == "in_progress").all():
                    OccupancyService.update_occupancy(db, t.id, direct_count=15, source="simulator")
                # Clear recommendations
                db.query(DispatchRecommendation).delete()
                db.commit()


        finally:
            db.close()

    async def _simulation_loop(self):
        while self.is_running:
            try:
                await self._tick()
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[Simulator Exception] {e}")

            # Steady, stable tick interval (0.8s for smooth continuous animation)
            interval = max(0.4, 0.8 / max(0.2, self.speed_multiplier))
            await asyncio.sleep(interval)

    async def _tick(self):
        self.step_counter += 1
        if not hasattr(self, 'trip_progress'):
            self.trip_progress = {}

        db = SessionLocal()
        try:
            route = db.query(Route).filter(Route.id == "route-1").first()
            if not route:
                return

            stop_ids = json.loads(route.ordered_stop_ids)
            stops = db.query(Stop).filter(Stop.id.in_(stop_ids)).all()
            stops_dict = {s.id: s for s in stops}
            ordered_stops = [stops_dict[sid] for sid in stop_ids if sid in stops_dict]

            if len(ordered_stops) < 2:
                return

            trips = db.query(Trip).filter(Trip.state == "in_progress").all()
            now = datetime.now(timezone.utc)
            total_stops = len(ordered_stops)

            # Move each shuttle smoothly along the loop waypoint path
            for index, trip in enumerate(trips):
                # Initialize steady offset if not yet recorded
                if trip.id not in self.trip_progress:
                    self.trip_progress[trip.id] = (index * (total_stops / max(1, len(trips)))) % total_stops

                # Check if this shuttle has an on-duty registered driver
                driver_reg = db.query(DriverRegistration).filter(
                    DriverRegistration.assigned_vehicle_id == trip.vehicle_id
                ).first()
                if driver_reg and not driver_reg.is_on_duty:
                    # Off-duty driver -> Shuttle stays steadily stationed
                    t_val = self.trip_progress[trip.id]
                else:
                    # On-duty -> Advance smoothly
                    if not (self.stale_gps_simulated and trip.id == "trip-1"):
                        # Advance by ~0.016 segment per 0.8s (~18 km/h campus speed)
                        step_delta = 0.016 * max(0.1, self.speed_multiplier)
                        self.trip_progress[trip.id] = (self.trip_progress[trip.id] + step_delta) % total_stops
                    t_val = self.trip_progress[trip.id]

                from_idx = int(t_val) % total_stops
                to_idx = (from_idx + 1) % total_stops
                fraction = t_val - int(t_val)

                s_from = ordered_stops[from_idx]
                s_to = ordered_stops[to_idx]

                lat = s_from.latitude + fraction * (s_to.latitude - s_from.latitude)
                lng = s_from.longitude + fraction * (s_to.longitude - s_from.longitude)
                bearing = calculate_bearing(s_from.latitude, s_from.longitude, s_to.latitude, s_to.longitude)

                pos = Position(
                    trip_id=trip.id,
                    latitude=lat,
                    longitude=lng,
                    accuracy_m=3.5,
                    speed_mps=6.2,
                    bearing=bearing,
                    recorded_at=now
                )
                db.add(pos)

                # Stable, realistic passenger boarding modulation once per stop transition
                if not hasattr(self, 'last_modulated_stop'):
                    self.last_modulated_stop = {}
                stop_key = f"{trip.id}-{from_idx}"
                if fraction < 0.08 and self.last_modulated_stop.get(trip.id) != from_idx:
                    self.last_modulated_stop[trip.id] = from_idx
                    latest_occ = OccupancyService.get_latest_occupancy(db, trip.id)
                    curr = latest_occ.total_occupancy if latest_occ else 15
                    veh = db.query(Vehicle).filter(Vehicle.id == trip.vehicle_id).first()
                    cap = veh.capacity if veh else 40
                    # Gentle, realistic campus boarding flux
                    flux = (from_idx % 3) - 1 # -1, 0, or +1
                    new_c = min(cap - 2, max(5, curr + flux))
                    if new_c != curr:
                        OccupancyService.update_occupancy(db, trip.id, direct_count=new_c, stop_id=s_from.id, source="simulator")

            db.commit()

            # Broadcast live state update via WebSocket
            await self._broadcast_live_state(db)

        finally:
            db.close()

    async def _broadcast_live_state(self, db):
        # Package live vehicle positions, upcoming ETAs for each stop
        trips = db.query(Trip).filter(Trip.state == "in_progress").all()
        now = datetime.now(timezone.utc)
        vehicles_live = []

        for trip in trips:
            pos = ETAService.get_latest_position(db, trip.id)
            veh = db.query(Vehicle).filter(Vehicle.id == trip.vehicle_id).first()
            if pos and veh:
                pos_time = pos.recorded_at.replace(tzinfo=timezone.utc) if pos.recorded_at.tzinfo is None else pos.recorded_at
                freshness = max(0.0, (now - pos_time).total_seconds())
                is_stale = freshness > 30.0
                cap, occ, avail, cat, src, _ = OccupancyService.get_trip_occupancy_status(db, trip.id)
                driver_reg = db.query(DriverRegistration).filter(
                    DriverRegistration.assigned_vehicle_id == veh.id
                ).first()

                vehicles_live.append({
                    "trip_id": trip.id,
                    "vehicle_id": veh.id,
                    "vehicle_label": veh.label,
                    "latitude": pos.latitude,
                    "longitude": pos.longitude,
                    "accuracy_m": pos.accuracy_m,
                    "speed_mps": pos.speed_mps,
                    "bearing": pos.bearing,
                    "is_stale": is_stale,
                    "freshness_seconds": round(freshness, 1),
                    "capacity": cap,
                    "occupancy": occ,
                    "available_seats": avail,
                    "crowd_category": cat,
                    "occupancy_source": src,
                    "driver_name": driver_reg.name if driver_reg else "Awaiting Driver",
                    "driver_id": driver_reg.id if driver_reg else None,
                    "driver_license": driver_reg.license_number if driver_reg else None,
                    "is_driver_on_duty": driver_reg.is_on_duty if driver_reg else False,
                    "tracking_status": "ACTIVE_TRACKING" if (driver_reg and driver_reg.is_on_duty) else "PAUSED_OFF_DUTY"
                })

        # Send broadcast message
        payload = {
            "type": "LIVE_TICK",
            "timestamp": now.isoformat(),
            "scenario": self.active_scenario,
            "is_simulated": True,
            "vehicles": vehicles_live
        }
        await manager.broadcast(payload)

simulator = CampusSimulator()
