import json
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import Stop, Route, Trip, Vehicle, DriverRegistration
from backend.app.schemas import StopOut, StopArrivalsResponse, StopArrivalDetail
from backend.app.services.eta_service import ETAService
from backend.app.services.occupancy_service import OccupancyService
from backend.app.services.demand_service import DemandService

router = APIRouter(prefix="/api/stops", tags=["Stops"])

@router.get("", response_model=List[StopOut])
def list_stops(db: Session = Depends(get_db)):
    """List all registered campus shuttle stops."""
    return db.query(Stop).order_by(Stop.sequence_hint.asc()).all()

@router.get("/hostel-directory")
def get_hostel_directory():
    """Returns official VIT Vellore Hostel Blocks directory (landlines and emails)."""
    from backend.seed_data import VIT_HOSTEL_DIRECTORY
    return VIT_HOSTEL_DIRECTORY

@router.get("/{stop_id}/arrivals", response_model=StopArrivalsResponse)
def get_stop_arrivals(stop_id: str, db: Session = Depends(get_db)):

    """
    Returns upcoming shuttles arriving at stop_id, sorted by ETA.
    Displays verified occupancy, freshness, and marks alternative shuttles if the first is full.
    """
    stop = db.query(Stop).filter(Stop.id == stop_id).first()
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")

    active_trips = db.query(Trip).filter(Trip.state == "in_progress").all()
    arrivals_list: List[StopArrivalDetail] = []

    for trip in active_trips:
        route = db.query(Route).filter(Route.id == trip.route_id).first()
        veh = db.query(Vehicle).filter(Vehicle.id == trip.vehicle_id).first()
        if not route or not veh:
            continue

        eta_sec, is_stale, freshness, dist_m = ETAService.calculate_eta_for_stop(db, trip, stop_id)
        if eta_sec is None:
            # Shuttle is not scheduled to reach this stop or off-route
            continue

        capacity, occ, avail, cat, src, _ = OccupancyService.get_trip_occupancy_status(db, trip.id)
        eta_formatted = ETAService.format_eta(eta_sec, is_stale)
        dist_formatted = ETAService.format_distance(dist_m)

        driver_reg = db.query(DriverRegistration).filter(
            DriverRegistration.assigned_vehicle_id == veh.id
        ).first()

        arrivals_list.append(StopArrivalDetail(
            trip_id=trip.id,
            vehicle_id=veh.id,
            vehicle_label=veh.label,
            route_id=route.id,
            route_name=route.name,
            eta_seconds=eta_sec,
            eta_formatted=eta_formatted,
            distance_meters=dist_m,
            distance_formatted=dist_formatted,
            is_stale=is_stale,
            freshness_seconds=round(freshness, 1),
            occupancy_category=cat,
            occupancy_count=occ,
            capacity=capacity,
            available_seats=avail,
            occupancy_source=src,
            is_alternate=False,
            driver_name=driver_reg.name if driver_reg else "Awaiting Driver",
            is_driver_on_duty=driver_reg.is_on_duty if driver_reg else True
        ))


    # Sort primarily by ETA
    arrivals_list.sort(key=lambda x: (x.is_stale, x.eta_seconds))

    # Mark second shuttle as alternative if the first is Full or Nearly Full
    if len(arrivals_list) > 1 and arrivals_list[0].occupancy_category in ["Full", "Nearly full"]:
        arrivals_list[1].is_alternate = True

    queue_demand = DemandService.get_stop_queue_demand(db, stop_id)

    return StopArrivalsResponse(
        stop=StopOut.model_validate(stop),
        arrivals=arrivals_list,
        queue_demand=queue_demand,
        last_refreshed=datetime.now(timezone.utc)
    )
