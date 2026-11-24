from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class StopBase(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    sequence_hint: int = 0

class StopOut(StopBase):
    model_config = {"from_attributes": True}

class RouteBase(BaseModel):
    id: str
    name: str
    ordered_stop_ids: List[str]
    active: bool = True

class RouteOut(BaseModel):
    id: str
    name: str
    ordered_stop_ids: List[str]
    active: bool
    model_config = {"from_attributes": True}


class VehicleBase(BaseModel):
    id: str
    label: str
    capacity: int = 40
    status: str = "idle"

class VehicleCreate(VehicleBase):
    pass

class VehicleOut(VehicleBase):
    model_config = {"from_attributes": True}


class TripStartRequest(BaseModel):
    route_id: str
    vehicle_id: str
    driver_id: Optional[str] = "driver_1"

class TripOut(BaseModel):
    id: str
    route_id: str
    vehicle_id: str
    driver_id: Optional[str]
    start_time: datetime
    end_time: Optional[datetime]
    state: str
    model_config = {"from_attributes": True}

class PositionInput(BaseModel):
    trip_id: str
    latitude: float
    longitude: float
    accuracy_m: float = 5.0
    speed_mps: Optional[float] = 6.0
    bearing: Optional[float] = 0.0

class PositionOut(BaseModel):
    trip_id: str
    vehicle_id: str
    vehicle_label: str
    latitude: float
    longitude: float
    accuracy_m: float
    speed_mps: float
    bearing: float
    recorded_at: datetime
    is_stale: bool = False
    freshness_seconds: float = 0.0

class OccupancyUpdate(BaseModel):
    trip_id: str
    stop_id: Optional[str] = None
    boarded: int = 0
    alighted: int = 0
    current_count: Optional[int] = None # Direct override or driver tally
    source: str = "driver"

class OccupancyOut(BaseModel):
    trip_id: str
    vehicle_id: str
    capacity: int
    current_occupancy: int
    available_seats: int
    category: str # "Available", "Filling", "Nearly full", "Full", "Unknown"
    source: str
    last_updated: datetime

class BoardingIntentCreate(BaseModel):
    stop_id: str
    session_id: str
    window_minutes: int = 15

class BoardingIntentOut(BaseModel):
    id: int
    stop_id: str
    anonymous_session_or_user_id: str
    window_start: datetime
    expires_at: datetime
    model_config = {"from_attributes": True}


class StopArrivalDetail(BaseModel):
    trip_id: str
    vehicle_id: str
    vehicle_label: str
    route_id: str
    route_name: str
    eta_seconds: int
    eta_formatted: str # e.g. "3 mins" or "Due"
    distance_meters: int = 0
    distance_formatted: str = "Nearby"
    is_stale: bool
    freshness_seconds: float
    occupancy_category: str # "Available", "Filling", "Nearly full", "Full", "Unknown"
    occupancy_count: int
    capacity: int
    available_seats: int
    occupancy_source: str
    is_alternate: bool = False
    driver_name: Optional[str] = "Registered Driver"
    is_driver_on_duty: bool = True



class StopArrivalsResponse(BaseModel):
    stop: StopOut
    arrivals: List[StopArrivalDetail]
    queue_demand: int = 0
    last_refreshed: datetime

class DemandSummaryItem(BaseModel):
    stop_id: str
    stop_name: str
    window: str
    confirmed_intents: int
    historical_estimate: int
    total_expected_demand: int
    scheduled_free_capacity: int
    shortfall: int
    has_active_recommendation: bool

class RecommendationAction(BaseModel):
    recommendation_id: int
    action: str # "accept" or "reject"
    reason: Optional[str] = None

class RecommendationOut(BaseModel):
    id: int
    stop_id: str
    stop_name: str
    window: str
    demand: int
    free_capacity: int
    shortfall: int
    suggested_vehicle_id: Optional[str]
    suggested_vehicle_label: Optional[str]
    suggestion: str
    status: str
    reason: Optional[str]
    created_at: datetime
    actioned_at: Optional[datetime]

class AnalyticsMetrics(BaseModel):
    eta_mae_minutes: float
    total_trips_tracked: int
    total_passengers_served: int
    overcrowding_events_count: int
    avg_student_wait_minutes: float
    peak_demand_stop: str

class SimulationScenarioRequest(BaseModel):
    scenario: str # "normal", "crowd_spike", "stale_gps", "full_bus", "reset"
    speed: Optional[float] = 1.0
