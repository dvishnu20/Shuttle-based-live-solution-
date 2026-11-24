import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import SessionLocal, Base, engine
from backend.seed_data import seed
from backend.app.models import Trip, Vehicle, Position
from backend.app.services.occupancy_service import OccupancyService
from backend.app.services.recommendation_service import RecommendationService

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    seed()
    yield

def test_t01_list_stops_and_live_locations():
    """T01: Live location and stops check"""
    res = client.get("/api/stops")
    assert res.status_code == 200
    stops = res.json()
    assert len(stops) == 10
    assert any("mh" in s["id"] for s in stops)

    res_live = client.get("/api/vehicles/live")
    assert res_live.status_code == 200
    vehicles = res_live.json()
    assert len(vehicles) >= 2
    assert "latitude" in vehicles[0]
    assert "freshness_seconds" in vehicles[0]

def test_t02_eta_calculation():
    """T02: ETA calculated for each reachable stop"""
    res = client.get("/api/stops/stop-vit-mh-qrst/arrivals")
    assert res.status_code == 200
    data = res.json()
    assert "arrivals" in data
    assert len(data["arrivals"]) >= 1
    arrival = data["arrivals"][0]
    assert arrival["eta_seconds"] >= 0
    assert arrival["eta_formatted"] is not None
    assert arrival["distance_meters"] >= 0

def test_t03_stale_gps_flagged():
    """T03: Stale GPS beyond threshold is flagged, never shows stale as live"""
    db = SessionLocal()
    try:
        # Simulate an old position (60s ago)
        old_time = datetime.now(timezone.utc) - timedelta(seconds=65)
        pos = db.query(Position).filter(Position.trip_id == "trip-1").first()
        pos.recorded_at = old_time
        db.commit()
    finally:
        db.close()

    res = client.get("/api/stops/stop-vit-mh-qrst/arrivals")
    assert res.status_code == 200
    arrivals = res.json()["arrivals"]
    trip1_arr = next((a for a in arrivals if a["trip_id"] == "trip-1"), None)
    assert trip1_arr is not None
    assert trip1_arr["is_stale"] is True
    assert trip1_arr["eta_formatted"] == "Unavailable"

def test_t04_full_shuttle_alternative_offered():
    """T04: When shuttle is full, next alternative is flagged"""
    db = SessionLocal()
    try:
        OccupancyService.update_occupancy(db, "trip-1", direct_count=40)
    finally:
        db.close()

    res = client.get("/api/stops/stop-vit-mh-qrst/arrivals")
    assert res.status_code == 200
    arrivals = res.json()["arrivals"]
    assert arrivals[0]["occupancy_category"] == "Full"
    if len(arrivals) > 1:
        assert arrivals[1]["is_alternate"] is True

def test_t05_invalid_count_rejected():
    """T05: Submit negative / over-capacity count -> rejected (400), valid count retained"""
    # Test over-capacity (e.g. 50 on 40-capacity shuttle)
    res_over = client.post("/api/driver/occupancy", json={
        "trip_id": "trip-1",
        "current_count": 55,
        "source": "driver"
    }, headers={"role": "driver"})
    assert res_over.status_code == 400

    # Test negative count
    res_neg = client.post("/api/driver/occupancy", json={
        "trip_id": "trip-1",
        "current_count": -5,
        "source": "driver"
    }, headers={"role": "driver"})
    assert res_neg.status_code == 400

def test_t06_demand_spike_shortfall_recommendation():
    """T06: 95 waiting, 80 free seats -> shortfall 15, suggests one 40-seat spare vehicle"""
    # Trigger scenario
    client.post("/api/simulation/scenario", json={"scenario": "crowd_spike"})

    res = client.get("/api/admin/recommendations", headers={"role": "admin"})
    assert res.status_code == 200
    recs = res.json()
    assert len(recs) >= 1
    rec = recs[0]
    assert "mh" in rec["stop_id"]
    assert rec["shortfall"] == 15
    assert rec["suggested_vehicle_id"] is not None
    assert "Recommend dispatching 1 additional shuttle" in rec["suggestion"]

    # Test admin action accept
    res_act = client.post("/api/admin/recommendations/action", json={
        "recommendation_id": rec["id"],
        "action": "accept",
        "reason": "Hostel peak hour demand verified"
    }, headers={"role": "admin"})
    assert res_act.status_code == 200
    assert res_act.json()["status"] == "accepted"

def test_t07_no_spare_vehicle_flags_unmet_demand():
    """T07: Set spare fleet to zero -> flag unmet demand, no fictional dispatch"""
    client.post("/api/simulation/scenario", json={"scenario": "no_spare_bus"})

    res = client.get("/api/admin/recommendations", headers={"role": "admin"})
    assert res.status_code == 200
    recs = res.json()
    assert len(recs) >= 1
    rec = recs[0]
    assert rec["suggested_vehicle_id"] is None
    assert "Zero spare shuttles available" in rec["suggestion"]

def test_t08_unauthorized_role_blocked():
    """T08: Student calls driver write endpoint -> 403 forbidden"""
    res = client.post("/api/driver/positions", json={
        "trip_id": "trip-1",
        "latitude": 12.97520,
        "longitude": 79.16460
    }, headers={"role": "student"})
    assert res.status_code == 403

def test_fr08_duplicate_intent_prevention():
    """FR-08: Prevents duplicate boarding intents for same session"""
    res1 = client.post("/api/intents", json={
        "stop_id": "stop-vit-mh-qrst",
        "session_id": "session_student_xyz",
        "window_minutes": 15
    })
    assert res1.status_code == 200
    id1 = res1.json()["id"]

    res2 = client.post("/api/intents", json={
        "stop_id": "stop-vit-mh-qrst",
        "session_id": "session_student_xyz",
        "window_minutes": 15
    })
    assert res2.status_code == 200
    id2 = res2.json()["id"]
    assert id1 == id2 # Same intent record refreshed, no duplicate count



