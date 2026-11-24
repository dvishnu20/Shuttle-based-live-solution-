import math
import json
from datetime import datetime, timezone
from typing import List, Optional, Tuple, Dict
from sqlalchemy.orm import Session
from backend.app.models import Stop, Route, Trip, Position, Vehicle, EtaPrediction
from backend.app.config import settings

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000.0 # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_lambda = math.radians(lon2 - lon1)
    
    y = math.sin(delta_lambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)
    bearing_rad = math.atan2(y, x)
    return (math.degrees(bearing_rad) + 360) % 360

class ETAService:
    @staticmethod
    def get_latest_position(db: Session, trip_id: str) -> Optional[Position]:
        return db.query(Position).filter(Position.trip_id == trip_id).order_by(Position.recorded_at.desc()).first()

    @staticmethod
    def calculate_eta_for_stop(
        db: Session,
        trip: Trip,
        target_stop_id: str
    ) -> Tuple[Optional[int], bool, float, int]:
        """
        Calculates ETA in seconds and distance in meters from trip's latest position to target_stop_id.
        Returns: (eta_seconds, is_stale, freshness_seconds, distance_meters)
        """
        latest_pos = ETAService.get_latest_position(db, trip.id)
        if not latest_pos:
            return None, True, 999.0, 0

        now = datetime.now(timezone.utc)
        # Ensure latest_pos.recorded_at is timezone-aware
        pos_time = latest_pos.recorded_at
        if pos_time.tzinfo is None:
            pos_time = pos_time.replace(tzinfo=timezone.utc)

        freshness_seconds = max(0.0, (now - pos_time).total_seconds())
        is_stale = freshness_seconds > settings.STALE_GPS_THRESHOLD_SECONDS

        route = db.query(Route).filter(Route.id == trip.route_id).first()
        if not route:
            return None, is_stale, freshness_seconds, 0

        try:
            stop_ids = json.loads(route.ordered_stop_ids)
        except Exception:
            stop_ids = []

        if target_stop_id not in stop_ids:
            return None, is_stale, freshness_seconds, 0


        # Fetch all stops in route
        stops_by_id = {s.id: s for s in db.query(Stop).filter(Stop.id.in_(stop_ids)).all()}
        target_index = stop_ids.index(target_stop_id)

        # Find closest stop or current segment
        # In a closed loop or linear route, find the closest stop to current GPS
        min_dist = float("inf")
        closest_stop_idx = 0
        for idx, sid in enumerate(stop_ids):
            if sid in stops_by_id:
                st = stops_by_id[sid]
                d = haversine_distance_meters(latest_pos.latitude, latest_pos.longitude, st.latitude, st.longitude)
                if d < min_dist:
                    min_dist = d
                    closest_stop_idx = idx

        # Determine segment progress
        # If closest stop is target stop and within 35 meters, it's arriving now (0s)
        if closest_stop_idx == target_index and min_dist < 40.0:
            return 0, is_stale, freshness_seconds, int(min_dist)

        # Compute route distance along the loop from current position to target stop
        # Check average speed (fallback to 6.5 m/s ~ 23.4 km/h campus speed)
        speed = latest_pos.speed_mps if (latest_pos.speed_mps and latest_pos.speed_mps > 2.0) else 6.5
        
        # Calculate intermediate segments
        num_stops = len(stop_ids)
        total_distance = 0.0
        stops_count_between = 0

        curr_idx = closest_stop_idx
        next_idx = (curr_idx + 1) % num_stops
        next_stop = stops_by_id.get(stop_ids[next_idx])
        curr_stop = stops_by_id.get(stop_ids[curr_idx])

        if closest_stop_idx == target_index:
            total_distance = min_dist
        else:
            dist_to_next = 0.0
            if next_stop:
                dist_to_next = haversine_distance_meters(latest_pos.latitude, latest_pos.longitude, next_stop.latitude, next_stop.longitude)
            
            travel_idx = next_idx
            total_distance = dist_to_next
            while travel_idx != target_index:
                stops_count_between += 1
                from_st = stops_by_id.get(stop_ids[travel_idx])
                travel_idx = (travel_idx + 1) % num_stops
                to_st = stops_by_id.get(stop_ids[travel_idx])
                if from_st and to_st:
                    total_distance += haversine_distance_meters(from_st.latitude, from_st.longitude, to_st.latitude, to_st.longitude)
                if stops_count_between > num_stops * 2:
                    break

        travel_seconds = total_distance / speed
        dwell_seconds = stops_count_between * settings.DEFAULT_DWELL_SECONDS
        eta_seconds = int(travel_seconds + dwell_seconds)
        distance_meters = int(total_distance)

        # Store prediction for historical analysis / MAE
        try:
            pred = EtaPrediction(
                trip_id=trip.id,
                stop_id=target_stop_id,
                predicted_at=now,
                eta_seconds=eta_seconds
            )
            db.add(pred)
            db.commit()
        except Exception:
            db.rollback()

        return eta_seconds, is_stale, freshness_seconds, distance_meters

    @staticmethod
    def format_distance(distance_meters: Optional[int]) -> str:
        if distance_meters is None or distance_meters <= 0:
            return "At stop"
        if distance_meters < 1000:
            return f"{distance_meters} m away"
        return f"{distance_meters / 1000.0:.1f} km away"

    @staticmethod
    def format_eta(eta_seconds: Optional[int], is_stale: bool) -> str:
        if is_stale or eta_seconds is None:
            return "Unavailable"
        if eta_seconds <= 45:
            return "Arriving"
        minutes = round(eta_seconds / 60)
        if minutes <= 1:
            return "1 min"
        return f"{minutes} mins"

