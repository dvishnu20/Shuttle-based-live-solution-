import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.database import engine, Base
from backend.seed_data import seed
from backend.app.routers import (
    stops, vehicles, driver, intents, admin, simulation, analytics, payments
)
from backend.app.services.connection_manager import manager
from backend.app.services.simulator import simulator

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist and seed default campus dataset
    Base.metadata.create_all(bind=engine)
    try:
        seed()
    except Exception as e:
        print(f"Seed note: {e}")

    # Start simulator automatically for instant live demonstration
    simulator.start(speed=1.0)
    print("CampusMove AI Simulator running in background.")
    yield
    # Shutdown
    simulator.stop()
    print("CampusMove AI Simulator stopped.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Smart College Shuttle Arrival, Crowd Prediction & Demand Management System — SRS Implementation",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(stops.router)
app.include_router(vehicles.router)
app.include_router(driver.router)
app.include_router(intents.router)
app.include_router(admin.router)
app.include_router(simulation.router)
app.include_router(analytics.router)
app.include_router(payments.router)


@app.get("/")
def root():
    return {
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "operational",
        "documentation": "/docs",
        "simulation_mode": simulator.is_running
    }

@app.websocket("/ws/live")
async def websocket_live_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint streaming live GPS movements, ETA recalculations,
    occupancy status changes, and dispatch recommendations.
    """
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, listen for ping or client events
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
