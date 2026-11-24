import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from backend.app.database import Base

def utcnow():
    return datetime.datetime.now(datetime.timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    role = Column(String, default="student", index=True) # "student", "driver", "admin"
    display_name = Column(String, nullable=False)
    auth_provider_id = Column(String, nullable=True)

class Stop(Base):
    __tablename__ = "stops"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    sequence_hint = Column(Integer, default=0)

class Route(Base):
    __tablename__ = "routes"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    ordered_stop_ids = Column(Text, nullable=False) # JSON encoded list e.g. '["stop-1","stop-2",...]'
    active = Column(Boolean, default=True)

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(String, primary_key=True, index=True)
    label = Column(String, nullable=False)
    capacity = Column(Integer, default=40)
    status = Column(String, default="idle") # "active", "idle", "maintenance"

class Trip(Base):
    __tablename__ = "trips"

    id = Column(String, primary_key=True, index=True)
    route_id = Column(String, ForeignKey("routes.id"), nullable=False)
    vehicle_id = Column(String, ForeignKey("vehicles.id"), nullable=False)
    driver_id = Column(String, nullable=True)
    start_time = Column(DateTime(timezone=True), default=utcnow)
    end_time = Column(DateTime(timezone=True), nullable=True)
    state = Column(String, default="in_progress") # "scheduled", "in_progress", "completed", "cancelled"

class Position(Base):
    __tablename__ = "positions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trip_id = Column(String, ForeignKey("trips.id"), index=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    accuracy_m = Column(Float, default=5.0)
    speed_mps = Column(Float, default=6.0)
    bearing = Column(Float, default=0.0)
    recorded_at = Column(DateTime(timezone=True), default=utcnow, index=True)

class OccupancyEvent(Base):
    __tablename__ = "occupancy_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trip_id = Column(String, ForeignKey("trips.id"), index=True, nullable=False)
    stop_id = Column(String, ForeignKey("stops.id"), nullable=True)
    boarded = Column(Integer, default=0)
    alighted = Column(Integer, default=0)
    total_occupancy = Column(Integer, default=0)
    timestamp = Column(DateTime(timezone=True), default=utcnow)
    source = Column(String, default="driver") # "driver", "admin", "sensor"

class BoardingIntent(Base):
    __tablename__ = "boarding_intents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    anonymous_session_or_user_id = Column(String, index=True, nullable=False)
    stop_id = Column(String, ForeignKey("stops.id"), nullable=False)
    window_start = Column(DateTime(timezone=True), default=utcnow)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class EtaPrediction(Base):
    __tablename__ = "eta_predictions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trip_id = Column(String, ForeignKey("trips.id"), index=True, nullable=False)
    stop_id = Column(String, ForeignKey("stops.id"), index=True, nullable=False)
    predicted_at = Column(DateTime(timezone=True), default=utcnow)
    eta_seconds = Column(Integer, default=0)

class ArrivalEvent(Base):
    __tablename__ = "arrival_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trip_id = Column(String, ForeignKey("trips.id"), index=True, nullable=False)
    stop_id = Column(String, ForeignKey("stops.id"), nullable=False)
    scheduled_arrival_at = Column(DateTime(timezone=True), nullable=True)
    actual_arrival_at = Column(DateTime(timezone=True), default=utcnow)

class DispatchRecommendation(Base):
    __tablename__ = "dispatch_recommendations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    stop_id = Column(String, ForeignKey("stops.id"), nullable=False)
    window = Column(String, nullable=False) # e.g. "16:00 - 16:15"
    demand = Column(Integer, default=0)
    free_capacity = Column(Integer, default=0)
    shortfall = Column(Integer, default=0)
    suggested_vehicle_id = Column(String, nullable=True)
    suggestion = Column(String, nullable=False)
    status = Column(String, default="pending") # "pending", "accepted", "rejected"
    reason = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    actioned_at = Column(DateTime(timezone=True), nullable=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    actor = Column(String, nullable=False)
    action = Column(String, nullable=False)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), default=utcnow)

class DriverRegistration(Base):
    __tablename__ = "driver_registrations"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    license_number = Column(String, nullable=False)
    assigned_vehicle_id = Column(String, ForeignKey("vehicles.id"), nullable=False)
    is_on_duty = Column(Boolean, default=False)
    status = Column(String, default="registered") # "registered", "on_duty", "off_duty"
    registered_at = Column(DateTime(timezone=True), default=utcnow)
    last_active_at = Column(DateTime(timezone=True), default=utcnow)

class ShuttleTicketPayment(Base):
    __tablename__ = "shuttle_ticket_payments"

    id = Column(String, primary_key=True, index=True)
    student_id = Column(String, index=True, nullable=False, default="student_demo")
    student_name = Column(String, default="Aarav Sharma")
    vehicle_id = Column(String, ForeignKey("vehicles.id"), nullable=False)
    vehicle_label = Column(String, nullable=False)
    boarded_stop_id = Column(String, nullable=True)
    boarded_stop_name = Column(String, nullable=True)
    fare_amount = Column(Float, default=20.0) # Original cost of one turn is 20
    penalty_rate_per_day = Column(Float, default=10.0) # Penalty for each day overdue
    scan_timestamp = Column(DateTime(timezone=True), default=utcnow)
    due_at = Column(DateTime(timezone=True), nullable=False) # 24 hours from scan
    status = Column(String, default="pending") # "pending", "paid", "overdue"
    days_overdue = Column(Integer, default=0)
    penalty_amount = Column(Float, default=0.0)
    total_amount = Column(Float, default=20.0)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    payment_method = Column(String, nullable=True) # "UPI", "CampusCard", "NetBanking", "Cash", "VTOP_ACCOUNT"
    transaction_ref = Column(String, nullable=True)
    qr_code_data = Column(String, nullable=True)
    vtop_reg_no = Column(String, default="22BCE1042")
    vtop_receipt_no = Column(String, nullable=True)
    vtop_synced = Column(Boolean, default=True)
    is_single_use_burned = Column(Boolean, default=False) # Valid for 1 scan only!
    validated_by_driver_id = Column(String, nullable=True)
    validated_at = Column(DateTime(timezone=True), nullable=True)


