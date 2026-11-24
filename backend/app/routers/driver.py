import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import Trip, Vehicle, Position, Route, AuditLog
from backend.app.schemas import (
    TripStartRequest, TripOut, PositionInput, OccupancyUpdate, OccupancyOut
)
from backend.app.services.occupancy_service import OccupancyService
from backend.app.services.connection_manager import manager

router = APIRouter(prefix="/api/driver", tags=["Driver"])

def verify_driver_role(role: str = Header(default="driver")):
    # Role validation (FR-15 / T08)
    if role not in ["driver", "admin"]:
        raise HTTPException(status_code=403, detail="Forbidden: Driver role required")
    return role

@router.post("/trips/start", response_model=TripOut)
def start_trip(
    req: TripStartRequest,
    db: Session = Depends(get_db),
    role: str = Depends(verify_driver_role)
):
    """Starts an authorized shuttle trip and marks vehicle active."""
    route = db.query(Route).filter(Route.id == req.route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")

    vehicle = db.query(Vehicle).filter(Vehicle.id == req.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    trip_id = f"trip-{int(datetime.now(timezone.utc).timestamp())}"
    trip = Trip(
        id=trip_id,
        route_id=req.route_id,
        vehicle_id=req.vehicle_id,
        driver_id=req.driver_id,
        start_time=datetime.now(timezone.utc),
        state="in_progress"
    )
    vehicle.status = "active"
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip

@router.post("/trips/{trip_id}/end")
def end_trip(
    trip_id: str,
    db: Session = Depends(get_db),
    role: str = Depends(verify_driver_role)
):
    """Ends an active shuttle trip."""
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    trip.state = "completed"
    trip.end_time = datetime.now(timezone.utc)
    vehicle = db.query(Vehicle).filter(Vehicle.id == trip.vehicle_id).first()
    if vehicle:
        vehicle.status = "idle"

    db.commit()
    return {"message": f"Trip {trip_id} completed successfully"}

@router.post("/positions")
async def record_position(
    pos_in: PositionInput,
    db: Session = Depends(get_db),
    role: str = Depends(verify_driver_role)
):
    """
    Ingests live GPS coordinate and broadcast to student clients.
    """
    trip = db.query(Trip).filter(Trip.id == pos_in.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail=f"Active trip {pos_in.trip_id} not found")

    now = datetime.now(timezone.utc)
    pos = Position(
        trip_id=pos_in.trip_id,
        latitude=pos_in.latitude,
        longitude=pos_in.longitude,
        accuracy_m=pos_in.accuracy_m,
        speed_mps=pos_in.speed_mps or 6.0,
        bearing=pos_in.bearing or 0.0,
        recorded_at=now
    )
    db.add(pos)
    db.commit()

    # Broadcast position update
    vehicle = db.query(Vehicle).filter(Vehicle.id == trip.vehicle_id).first()
    label = vehicle.label if vehicle else "Shuttle"
    asyncio.create_task(manager.broadcast({
        "type": "POSITION_UPDATE",
        "trip_id": trip.id,
        "vehicle_id": trip.vehicle_id,
        "vehicle_label": label,
        "latitude": pos_in.latitude,
        "longitude": pos_in.longitude,
        "bearing": pos_in.bearing or 0.0,
        "speed_mps": pos_in.speed_mps or 6.0,
        "recorded_at": now.isoformat()
    }))

    return {"status": "ok", "recorded_at": now.isoformat()}

@router.post("/occupancy", response_model=OccupancyOut)
async def update_occupancy(
    occ_in: OccupancyUpdate,
    db: Session = Depends(get_db),
    role: str = Depends(verify_driver_role)
):
    """
    Ingests passenger boarding/alighting counts. Validates bounds: 0 <= count <= capacity (FR-06, T05).
    """
    curr, avail, cat = OccupancyService.update_occupancy(
        db=db,
        trip_id=occ_in.trip_id,
        boarded=occ_in.boarded,
        alighted=occ_in.alighted,
        direct_count=occ_in.current_count,
        stop_id=occ_in.stop_id,
        source=occ_in.source
    )

    trip = db.query(Trip).filter(Trip.id == occ_in.trip_id).first()
    vehicle = db.query(Vehicle).filter(Vehicle.id == trip.vehicle_id).first()
    capacity = vehicle.capacity if vehicle else 40
    now = datetime.now(timezone.utc)

    # Broadcast crowd status update
    asyncio.create_task(manager.broadcast({
        "type": "OCCUPANCY_UPDATE",
        "trip_id": occ_in.trip_id,
        "vehicle_id": vehicle.id if vehicle else "",
        "occupancy": curr,
        "capacity": capacity,
        "available_seats": avail,
        "crowd_category": cat,
        "source": occ_in.source,
        "timestamp": now.isoformat()
    }))

    return OccupancyOut(
        trip_id=occ_in.trip_id,
        vehicle_id=vehicle.id if vehicle else "",
        capacity=capacity,
        current_occupancy=curr,
        available_seats=avail,
        category=cat,
        source=occ_in.source,
        last_updated=now
    )

from pydantic import BaseModel
from backend.app.models import DriverRegistration

class DriverRegisterRequest(BaseModel):
    name: str
    phone: str
    license_number: str
    assigned_vehicle_id: str

class DriverDutyRequest(BaseModel):
    driver_id: str
    is_on_duty: bool

@router.post("/register")
def register_driver(
    req: DriverRegisterRequest,
    db: Session = Depends(get_db)
):
    """
    Registers a shuttle driver. Tracking is dependent on this registered driver being on-duty.
    """
    # Check if driver with license already exists
    driver = db.query(DriverRegistration).filter(
        DriverRegistration.license_number == req.license_number
    ).first()

    now = datetime.now(timezone.utc)
    if not driver:
        driver_id = f"DRV-{int(now.timestamp()) % 10000:04d}"
        driver = DriverRegistration(
            id=driver_id,
            name=req.name,
            phone=req.phone,
            license_number=req.license_number,
            assigned_vehicle_id=req.assigned_vehicle_id,
            is_on_duty=True, # Automatically go on-duty upon registration for instant live demo tracking
            status="on_duty",
            registered_at=now,
            last_active_at=now
        )
        db.add(driver)
    else:
        driver.name = req.name
        driver.phone = req.phone
        driver.assigned_vehicle_id = req.assigned_vehicle_id
        driver.is_on_duty = True
        driver.status = "on_duty"
        driver.last_active_at = now

    # Mark vehicle as active and associate with trip
    vehicle = db.query(Vehicle).filter(Vehicle.id == req.assigned_vehicle_id).first()
    if vehicle:
        vehicle.status = "active"

    db.add(AuditLog(
        actor=driver.name,
        action="DRIVER_REGISTRATION",
        details=f"Driver {driver.name} (License: {driver.license_number}) registered and went On-Duty for {req.assigned_vehicle_id}."
    ))
    db.commit()
    db.refresh(driver)

    # Broadcast driver duty update
    asyncio.create_task(manager.broadcast({
        "type": "DRIVER_DUTY_UPDATE",
        "driver_id": driver.id,
        "driver_name": driver.name,
        "vehicle_id": driver.assigned_vehicle_id,
        "is_on_duty": driver.is_on_duty,
        "license_number": driver.license_number
    }))

    return {
        "success": True,
        "message": f"Driver {driver.name} registered and On-Duty. Live GPS tracking active for {req.assigned_vehicle_id}.",
        "driver": {
            "id": driver.id,
            "name": driver.name,
            "phone": driver.phone,
            "license_number": driver.license_number,
            "assigned_vehicle_id": driver.assigned_vehicle_id,
            "is_on_duty": driver.is_on_duty,
            "status": driver.status
        }
    }

@router.get("/registered")
def get_registered_drivers(db: Session = Depends(get_db)):
    """Returns all registered shuttle drivers."""
    drivers = db.query(DriverRegistration).order_by(DriverRegistration.registered_at.desc()).all()
    return [
        {
            "id": d.id,
            "name": d.name,
            "phone": d.phone,
            "license_number": d.license_number,
            "assigned_vehicle_id": d.assigned_vehicle_id,
            "is_on_duty": d.is_on_duty,
            "status": d.status,
            "registered_at": d.registered_at.isoformat() if d.registered_at else None,
            "last_active_at": d.last_active_at.isoformat() if d.last_active_at else None
        }
        for d in drivers
    ]

@router.post("/duty-status")
def toggle_driver_duty(
    req: DriverDutyRequest,
    db: Session = Depends(get_db)
):
    """
    Toggles driver on-duty/off-duty state. Live tracking depends on this.
    """
    driver = db.query(DriverRegistration).filter(DriverRegistration.id == req.driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    driver.is_on_duty = req.is_on_duty
    driver.status = "on_duty" if req.is_on_duty else "off_duty"
    driver.last_active_at = datetime.now(timezone.utc)

    vehicle = db.query(Vehicle).filter(Vehicle.id == driver.assigned_vehicle_id).first()
    if vehicle:
        vehicle.status = "active" if req.is_on_duty else "idle"

    db.add(AuditLog(
        actor=driver.name,
        action="DRIVER_DUTY_TOGGLE",
        details=f"Driver {driver.name} set duty status to {'ON_DUTY' if req.is_on_duty else 'OFF_DUTY'} for {driver.assigned_vehicle_id}."
    ))
    db.commit()

    asyncio.create_task(manager.broadcast({
        "type": "DRIVER_DUTY_UPDATE",
        "driver_id": driver.id,
        "driver_name": driver.name,
        "vehicle_id": driver.assigned_vehicle_id,
        "is_on_duty": driver.is_on_duty,
        "license_number": driver.license_number
    }))

    return {
        "success": True,
        "driver_id": driver.id,
        "is_on_duty": driver.is_on_duty,
        "status": driver.status,
        "assigned_vehicle_id": driver.assigned_vehicle_id,
        "message": f"Driver {driver.name} is now {'ON-DUTY (Tracking Active)' if driver.is_on_duty else 'OFF-DUTY (Tracking Paused)'}."
    }

