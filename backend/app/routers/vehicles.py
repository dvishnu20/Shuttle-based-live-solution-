from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import Vehicle, Trip, Position
from backend.app.schemas import VehicleOut, VehicleCreate, PositionOut
from backend.app.services.eta_service import ETAService
from backend.app.services.occupancy_service import OccupancyService

router = APIRouter(prefix="/api/vehicles", tags=["Vehicles"])

@router.get("", response_model=List[VehicleOut])
def get_all_vehicles(db: Session = Depends(get_db)):
    """List all registered campus vehicles and statuses."""
    return db.query(Vehicle).all()

@router.post("", response_model=VehicleOut)
def create_vehicle(veh_in: VehicleCreate, db: Session = Depends(get_db)):
    """Register a new vehicle in fleet."""
    existing = db.query(Vehicle).filter(Vehicle.id == veh_in.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Vehicle ID already exists")
    v = Vehicle(
        id=veh_in.id,
        label=veh_in.label,
        capacity=veh_in.capacity,
        status=veh_in.status
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    return v

@router.get("/live", response_model=List[PositionOut])
def get_live_vehicles(db: Session = Depends(get_db)):
    """
    Returns latest GPS location, bearing, speed, and freshness for all active shuttles.
    Stale coordinates are clearly flagged (FR-02, FR-04).
    """
    active_trips = db.query(Trip).filter(Trip.state == "in_progress").all()
    results = []
    now = datetime.now(timezone.utc)

    for trip in active_trips:
        veh = db.query(Vehicle).filter(Vehicle.id == trip.vehicle_id).first()
        if not veh:
            continue

        pos = ETAService.get_latest_position(db, trip.id)
        if not pos:
            continue

        pos_time = pos.recorded_at.replace(tzinfo=timezone.utc) if pos.recorded_at.tzinfo is None else pos.recorded_at
        freshness = max(0.0, (now - pos_time).total_seconds())
        is_stale = freshness > 30.0

        results.append(PositionOut(
            trip_id=trip.id,
            vehicle_id=veh.id,
            vehicle_label=veh.label,
            latitude=pos.latitude,
            longitude=pos.longitude,
            accuracy_m=pos.accuracy_m,
            speed_mps=pos.speed_mps,
            bearing=pos.bearing,
            recorded_at=pos_time,
            is_stale=is_stale,
            freshness_seconds=round(freshness, 1)
        ))

    return results
