import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import Stop
from backend.app.schemas import BoardingIntentCreate, BoardingIntentOut
from backend.app.services.demand_service import DemandService
from backend.app.services.connection_manager import manager

router = APIRouter(prefix="/api/intents", tags=["Intents"])

@router.post("", response_model=BoardingIntentOut)
async def submit_boarding_intent(
    intent_in: BoardingIntentCreate,
    db: Session = Depends(get_db)
):
    """
    Records an opt-in student boarding intent for a specific stop.
    Prevents duplicate intents per session (FR-08).
    """
    stop = db.query(Stop).filter(Stop.id == intent_in.stop_id).first()
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")

    intent = DemandService.record_boarding_intent(
        db=db,
        stop_id=intent_in.stop_id,
        session_id=intent_in.session_id,
        window_minutes=intent_in.window_minutes
    )

    demand = DemandService.get_stop_queue_demand(db, intent_in.stop_id)

    # Broadcast updated demand
    asyncio.create_task(manager.broadcast({
        "type": "DEMAND_UPDATE",
        "stop_id": intent_in.stop_id,
        "stop_name": stop.name,
        "queue_demand": demand,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }))

    return intent

@router.get("/{stop_id}/demand")
def get_stop_demand(stop_id: str, db: Session = Depends(get_db)):
    """Returns active queue demand count for stop."""
    demand = DemandService.get_stop_queue_demand(db, stop_id)
    return {"stop_id": stop_id, "queue_demand": demand}
