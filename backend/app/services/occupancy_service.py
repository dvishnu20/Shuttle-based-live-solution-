from datetime import datetime, timezone
from typing import Tuple, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
from backend.app.models import Trip, Vehicle, OccupancyEvent
from backend.app.config import settings

class OccupancyService:
    @staticmethod
    def get_latest_occupancy(db: Session, trip_id: str) -> Optional[OccupancyEvent]:
        return db.query(OccupancyEvent).filter(
            OccupancyEvent.trip_id == trip_id
        ).order_by(OccupancyEvent.timestamp.desc()).first()

    @staticmethod
    def categorize_occupancy(current: int, capacity: int, is_outdated: bool = False) -> str:
        if is_outdated or capacity <= 0:
            return "Unknown"
        pct = (current / capacity) * 100.0
        if pct >= 100.0:
            return "Full"
        elif pct >= settings.MAX_CROWD_FILLING_PCT:
            return "Nearly full"
        elif pct >= settings.MAX_CROWD_AVAILABLE_PCT:
            return "Filling"
        else:
            return "Available"

    @staticmethod
    def update_occupancy(
        db: Session,
        trip_id: str,
        boarded: int = 0,
        alighted: int = 0,
        direct_count: Optional[int] = None,
        stop_id: Optional[str] = None,
        source: str = "driver"
    ) -> Tuple[int, int, str]:
        """
        Updates trip occupancy. Validates bounds: 0 <= count <= capacity.
        Returns: (current_occupancy, available_seats, category)
        """
        trip = db.query(Trip).filter(Trip.id == trip_id).first()
        if not trip:
            raise HTTPException(status_code=404, detail=f"Trip {trip_id} not found")

        vehicle = db.query(Vehicle).filter(Vehicle.id == trip.vehicle_id).first()
        capacity = vehicle.capacity if vehicle else 40

        latest = OccupancyService.get_latest_occupancy(db, trip_id)
        prev_occupancy = latest.total_occupancy if latest else 0

        if direct_count is not None:
            new_occupancy = direct_count
        else:
            new_occupancy = prev_occupancy + boarded - alighted

        # Strict SRS validation (FR-06 & T05): 0 <= count <= capacity
        if new_occupancy < 0 or new_occupancy > capacity:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid passenger count {new_occupancy}. Must be between 0 and vehicle capacity {capacity}."
            )

        now = datetime.now(timezone.utc)
        event = OccupancyEvent(
            trip_id=trip_id,
            stop_id=stop_id,
            boarded=boarded if direct_count is None else max(0, new_occupancy - prev_occupancy),
            alighted=alighted if direct_count is None else max(0, prev_occupancy - new_occupancy),
            total_occupancy=new_occupancy,
            timestamp=now,
            source=source
        )
        db.add(event)
        db.commit()
        db.refresh(event)

        available_seats = max(0, capacity - new_occupancy)
        category = OccupancyService.categorize_occupancy(new_occupancy, capacity)

        return new_occupancy, available_seats, category

    @staticmethod
    def get_trip_occupancy_status(db: Session, trip_id: str) -> Tuple[int, int, int, str, str, datetime]:
        """
        Returns: (capacity, current_occupancy, available_seats, category, source, last_updated)
        """
        trip = db.query(Trip).filter(Trip.id == trip_id).first()
        if not trip:
            return 40, 0, 40, "Unknown", "none", datetime.now(timezone.utc)

        vehicle = db.query(Vehicle).filter(Vehicle.id == trip.vehicle_id).first()
        capacity = vehicle.capacity if vehicle else 40

        latest = OccupancyService.get_latest_occupancy(db, trip_id)
        if not latest:
            return capacity, 0, capacity, "Available", "default", datetime.now(timezone.utc)

        now = datetime.now(timezone.utc)
        ts = latest.timestamp
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        
        # If no update for over 2 hours, flag unknown
        is_outdated = (now - ts).total_seconds() > 7200
        category = OccupancyService.categorize_occupancy(latest.total_occupancy, capacity, is_outdated)
        available_seats = max(0, capacity - latest.total_occupancy)

        return capacity, latest.total_occupancy, available_seats, category, latest.source, ts
