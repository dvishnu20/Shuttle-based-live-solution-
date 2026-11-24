from fastapi import APIRouter
from backend.app.schemas import SimulationScenarioRequest
from backend.app.services.simulator import simulator

router = APIRouter(prefix="/api/simulation", tags=["Simulation"])

@router.get("/status")
def get_simulation_status():
    """Returns current autonomous simulator state."""
    return {
        "is_running": simulator.is_running,
        "speed": simulator.speed_multiplier,
        "scenario": simulator.active_scenario,
        "is_simulated": True
    }

@router.post("/start")
def start_simulation(speed: float = 1.0):
    """Starts campus shuttle movement simulation."""
    simulator.start(speed)
    return {"message": "Simulation started", "speed": speed}

@router.post("/stop")
def stop_simulation():
    """Stops campus shuttle movement simulation."""
    simulator.stop()
    return {"message": "Simulation stopped"}

@router.post("/scenario")
def set_scenario(req: SimulationScenarioRequest):
    """
    Triggers designated demonstration scenario (e.g. crowd spike, stale GPS, full bus).
    """
    simulator.set_scenario(req.scenario, req.speed or 1.0)
    return {
        "scenario": req.scenario,
        "speed": req.speed or 1.0,
        "message": f"Scenario {req.scenario} activated successfully"
    }
