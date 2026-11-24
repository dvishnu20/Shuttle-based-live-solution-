import math
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import ShuttleTicketPayment, Vehicle, Stop, AuditLog, Trip
from backend.app.services.occupancy_service import OccupancyService
from backend.app.services.connection_manager import manager
import asyncio

router = APIRouter(prefix="/api/payments", tags=["Shuttle Payments, V-TOP & Single-Use Metro Pass"])

class QRScanRequest(BaseModel):
    qr_data: str
    student_id: Optional[str] = "student_demo"
    student_name: Optional[str] = "Aarav Sharma"
    vtop_reg_no: Optional[str] = "22BCE1042"
    stop_id: Optional[str] = None

class BookMetroPassRequest(BaseModel):
    student_id: Optional[str] = "student_demo"
    student_name: Optional[str] = "Aarav Sharma"
    vtop_reg_no: Optional[str] = "22BCE1042"
    vehicle_id: str = "veh-vit-mh-qrst"
    stop_id: Optional[str] = "stop-vit-mh-qrst"

class ValidatePassRequest(BaseModel):
    ticket_id: str
    driver_id: Optional[str] = "DRV-101"
    vehicle_id: Optional[str] = "veh-vit-mh-qrst"

class PayTicketRequest(BaseModel):
    ticket_id: str
    payment_method: str = "UPI (Google Pay / PhonePe)"

class SimulateOverdueRequest(BaseModel):
    ticket_id: str
    hours_ago: int = 30 # Over 24 hours to trigger penalty

@router.get("/tickets")
def get_student_tickets(
    student_id: str = Query("student_demo"),
    db: Session = Depends(get_db)
):
    """
    Returns all shuttle ride tickets with real-time 24-hour due check,
    dynamic daily penalty calculation, and V-TOP synchronization status.
    Original cost: ₹20 per turn.
    """
    tickets = db.query(ShuttleTicketPayment).filter(
        ShuttleTicketPayment.student_id == student_id
    ).order_by(ShuttleTicketPayment.scan_timestamp.desc()).all()

    now = datetime.now(timezone.utc)
    updated = False

    for t in tickets:
        if t.status not in ["paid", "vtop_debited"]:
            due = t.due_at
            if due.tzinfo is None:
                due = due.replace(tzinfo=timezone.utc)

            if now > due:
                seconds_past = (now - due).total_seconds()
                # 1 day penalty for each full or partial day beyond 24h
                days = max(1, math.ceil(seconds_past / 86400))
                t.days_overdue = days
                t.penalty_amount = round(days * (t.penalty_rate_per_day or 10.0), 2)
                t.total_amount = round(t.fare_amount + t.penalty_amount, 2)
                t.status = "overdue"
                updated = True
            else:
                t.days_overdue = 0
                t.penalty_amount = 0.0
                t.total_amount = t.fare_amount
                t.status = "pending"

    if updated:
        db.commit()

    total_pending = sum(t.total_amount for t in tickets if t.status in ["pending", "overdue"])
    total_paid = sum(t.total_amount for t in tickets if t.status in ["paid", "vtop_debited"])
    overdue_count = sum(1 for t in tickets if t.status == "overdue")

    return {
        "student_id": student_id,
        "vtop_reg_no": "22BCE1042",
        "student_name": "Aarav Sharma",
        "total_pending_dues": round(total_pending, 2),
        "total_paid": round(total_paid, 2),
        "overdue_count": overdue_count,
        "tickets": [
            {
                "id": t.id,
                "student_id": t.student_id,
                "student_name": t.student_name,
                "vtop_reg_no": t.vtop_reg_no or "22BCE1042",
                "vtop_receipt_no": t.vtop_receipt_no or f"VTOP-TR-2026-{t.id.split('-')[-1]}",
                "vtop_synced": t.vtop_synced if t.vtop_synced is not None else True,
                "vehicle_id": t.vehicle_id,
                "vehicle_label": t.vehicle_label,
                "boarded_stop_id": t.boarded_stop_id,
                "boarded_stop_name": t.boarded_stop_name,
                "fare_amount": t.fare_amount,
                "scan_timestamp": t.scan_timestamp.isoformat() if t.scan_timestamp else None,
                "due_at": t.due_at.isoformat() if t.due_at else None,
                "status": t.status,
                "days_overdue": t.days_overdue,
                "penalty_rate_per_day": t.penalty_rate_per_day,
                "penalty_amount": t.penalty_amount,
                "total_amount": t.total_amount,
                "paid_at": t.paid_at.isoformat() if t.paid_at else None,
                "payment_method": t.payment_method,
                "transaction_ref": t.transaction_ref,
                "qr_code_data": t.qr_code_data,
                "is_single_use_burned": t.is_single_use_burned or False,
                "validated_at": t.validated_at.isoformat() if t.validated_at else None,
                "validated_by_driver_id": t.validated_by_driver_id
            }
            for t in tickets
        ]
    }

@router.post("/book-metro-pass")
def book_metro_pass(
    req: BookMetroPassRequest,
    db: Session = Depends(get_db)
):
    """
    Metro-Style Digital Single-Use Boarding Pass:
    - Generates dynamic 1-time scannable QR ticket
    - Directly links ₹20 fare to student's V-TOP Transit Ledger
    - Generates official V-TOP Fee Receipt: VTOP-TR-2026-XXXX
    - Valid for 1 single scan by the driver
    """
    now = datetime.now(timezone.utc)
    due_at = now + timedelta(minutes=30) # 30 min boarding validity

    vehicle = db.query(Vehicle).filter(Vehicle.id == req.vehicle_id).first()
    if not vehicle:
        vehicle = db.query(Vehicle).first()

    stop = db.query(Stop).filter(Stop.id == req.stop_id).first() if req.stop_id else db.query(Stop).first()

    ticket_num = int(now.timestamp()) % 1000000
    ticket_id = f"TKT-METRO-{ticket_num:06d}"
    vtop_receipt = f"VTOP-TR-2026-{ticket_num:06d}"

    ticket = ShuttleTicketPayment(
        id=ticket_id,
        student_id=req.student_id or "student_demo",
        student_name=req.student_name or "Aarav Sharma",
        vtop_reg_no=req.vtop_reg_no or "22BCE1042",
        vtop_receipt_no=vtop_receipt,
        vtop_synced=True,
        vehicle_id=vehicle.id if vehicle else "veh-vit-mh-qrst",
        vehicle_label=vehicle.label if vehicle else "VIT MH Q-R-S-T Express Shuttle (Bus 101)",
        boarded_stop_id=stop.id if stop else "stop-vit-mh-qrst",
        boarded_stop_name=stop.name if stop else "MH Q, R, S, T High-Rise Towers",
        fare_amount=20.0,
        penalty_rate_per_day=10.0,
        scan_timestamp=now,
        due_at=due_at,
        status="vtop_debited",
        days_overdue=0,
        penalty_amount=0.0,
        total_amount=20.0,
        paid_at=now,
        payment_method="VTOP_STUDENT_ACCOUNT",
        transaction_ref=vtop_receipt,
        qr_code_data=f"METRO-PASS:{ticket_id}:22BCE1042:₹20",
        is_single_use_burned=False # Valid for 1 scan only!
    )

    db.add(ticket)
    db.add(AuditLog(
        actor=req.vtop_reg_no or "22BCE1042",
        action="VTOP_METRO_PASS_BOOKED",
        details=f"Booked 1-scan metro boarding pass {ticket_id} for {ticket.vehicle_label}. ₹20 debited to V-TOP. Receipt: {vtop_receipt}"
    ))
    db.commit()
    db.refresh(ticket)

    return {
        "success": True,
        "message": f"Metro Single-Use Pass issued! ₹20 charged to V-TOP Account ({ticket.vtop_reg_no}).",
        "pass": {
            "id": ticket.id,
            "vtop_reg_no": ticket.vtop_reg_no,
            "vtop_receipt_no": ticket.vtop_receipt_no,
            "vehicle_label": ticket.vehicle_label,
            "boarded_stop_name": ticket.boarded_stop_name,
            "fare_amount": 20.0,
            "status": "READY_FOR_SINGLE_SCAN",
            "qr_code_data": ticket.qr_code_data,
            "is_single_use_burned": False,
            "expires_in_minutes": 30
        }
    }

@router.post("/validate-single-use-pass")
async def validate_single_use_pass(
    req: ValidatePassRequest,
    db: Session = Depends(get_db)
):
    """
    Driver Console Terminal Validator:
    - Scans student's Metro QR Boarding Pass
    - Enforces STRICT SINGLE-USE rule: If already burned, rejects instantly!
    - If valid: burns ticket, registers validation timestamp and driver ID,
      and automatically increments the active shuttle trip occupancy count (+1).
    """
    # Find ticket by id or qr substring
    ticket = db.query(ShuttleTicketPayment).filter(
        (ShuttleTicketPayment.id == req.ticket_id) |
        (ShuttleTicketPayment.qr_code_data.like(f"%{req.ticket_id}%"))
    ).first()

    if not ticket:
        raise HTTPException(status_code=404, detail="Boarding Pass not found in system")

    # Check if ALREADY SCANNED / BURNED
    if ticket.is_single_use_burned:
        validated_time_str = ticket.validated_at.strftime("%I:%M:%S %p") if ticket.validated_at else "earlier"
        return {
            "valid": False,
            "burned": True,
            "ticket_id": ticket.id,
            "student_name": ticket.student_name,
            "vtop_reg_no": ticket.vtop_reg_no,
            "message": f"❌ REJECTED: Pass #{ticket.id} was ALREADY SCANNED at {validated_time_str}! Single entry exceeded."
        }

    now = datetime.now(timezone.utc)
    ticket.is_single_use_burned = True
    ticket.validated_at = now
    ticket.validated_by_driver_id = req.driver_id or "DRV-101"

    # Automatically increment occupancy for vehicle's active trip
    trip = db.query(Trip).filter(
        Trip.vehicle_id == (req.vehicle_id or ticket.vehicle_id),
        Trip.state == "in_progress"
    ).first()

    new_occupancy = None
    if trip:
        latest = OccupancyService.get_latest_occupancy(db, trip.id)
        current = latest.total_occupancy if latest else 20
        new_c, avail, cat = OccupancyService.update_occupancy(
            db=db,
            trip_id=trip.id,
            boarded=1,
            alighted=0,
            direct_count=current + 1,
            stop_id=ticket.boarded_stop_id,
            source="metro_scanner"
        )
        new_occupancy = new_c

        # Broadcast occupancy update via WS
        try:
            await manager.broadcast({
                "type": "OCCUPANCY_UPDATE",
                "trip_id": trip.id,
                "vehicle_id": trip.vehicle_id,
                "occupancy": new_c,
                "capacity": 40,
                "available_seats": avail,
                "crowd_category": cat,
                "source": "metro_scanner",
                "timestamp": now.isoformat()
            })
        except Exception:
            pass


    db.add(AuditLog(
        actor=req.driver_id or "driver_terminal",
        action="PASS_VALIDATED_AND_BURNED",
        details=f"Validated single-use pass {ticket.id} for {ticket.student_name} ({ticket.vtop_reg_no}). Burned ticket. Occupancy now: {new_occupancy}."
    ))
    db.commit()

    return {
        "valid": True,
        "burned": True,
        "ticket_id": ticket.id,
        "student_name": ticket.student_name,
        "vtop_reg_no": ticket.vtop_reg_no,
        "vtop_receipt_no": ticket.vtop_receipt_no,
        "vehicle_label": ticket.vehicle_label,
        "new_occupancy": new_occupancy,
        "validated_at": now.isoformat(),
        "message": f"✅ BOARDING VERIFIED! {ticket.student_name} ({ticket.vtop_reg_no}) entered. Pass permanently burned."
    }

@router.get("/vtop-summary")
def get_vtop_summary(
    student_id: str = Query("student_demo"),
    db: Session = Depends(get_db)
):
    """
    Returns live V-TOP Fee Clearance & Transit Account Summary.
    Any unpaid tickets create an institutional hold on exam hall tickets.
    """
    tickets = db.query(ShuttleTicketPayment).filter(
        ShuttleTicketPayment.student_id == student_id
    ).order_by(ShuttleTicketPayment.scan_timestamp.desc()).all()

    now = datetime.now(timezone.utc)
    for t in tickets:
        if t.status not in ["paid", "vtop_debited"]:
            due = t.due_at if t.due_at.tzinfo else t.due_at.replace(tzinfo=timezone.utc)
            if now > due:
                seconds_past = (now - due).total_seconds()
                days = max(1, math.ceil(seconds_past / 86400))
                t.days_overdue = days
                t.penalty_amount = round(days * (t.penalty_rate_per_day or 10.0), 2)
                t.total_amount = round(t.fare_amount + t.penalty_amount, 2)
                t.status = "overdue"

    pending_dues = sum(t.total_amount for t in tickets if t.status in ["pending", "overdue"])
    total_trips = len(tickets)

    is_clear = pending_dues == 0

    return {
        "student_name": "Aarav Sharma",
        "vtop_reg_no": "22BCE1042",
        "program": "B.Tech Computer Science & Engineering",
        "semester": "Fall / Winter Semester 2026",
        "hostel_block": "MH Q Block, Room 412 (North High-Rise)",
        "vtop_transit_status": "CLEAR" if is_clear else "PAYMENT_HOLD",
        "exam_hall_ticket_clearance": "APPROVED FOR CAT/FAT DOWNLOAD" if is_clear else f"BLOCKED: Clear ₹{pending_dues} pending transit dues",
        "total_pending_dues": pending_dues,
        "total_shuttle_trips": total_trips,
        "recent_receipts": [
            {
                "receipt_no": t.vtop_receipt_no or f"VTOP-TR-2026-{t.id.split('-')[-1]}",
                "ticket_id": t.id,
                "vehicle": t.vehicle_label,
                "amount": t.total_amount,
                "status": t.status,
                "date": t.scan_timestamp.isoformat() if t.scan_timestamp else None
            }
            for t in tickets[:6]
        ]
    }

@router.post("/scan-qr")
def scan_qr_and_generate_ticket(
    req: QRScanRequest,
    db: Session = Depends(get_db)
):
    """
    On-Board QR Scan:
    Adds ₹20 directly to student's V-TOP transit ledger with 24-hr payment window.
    """
    now = datetime.now(timezone.utc)
    due_at = now + timedelta(hours=24)

    vehicle = None
    vehicles = db.query(Vehicle).all()
    for v in vehicles:
        if v.id in req.qr_data or v.label.lower() in req.qr_data.lower():
            vehicle = v
            break

    if not vehicle:
        vehicle = vehicles[0] if vehicles else None

    vehicle_id = vehicle.id if vehicle else "veh-vit-mh-qrst"
    vehicle_label = vehicle.label if vehicle else "VIT MH Q-R-S-T Express Shuttle (Bus 101)"

    stop = db.query(Stop).filter(Stop.id == req.stop_id).first() if req.stop_id else db.query(Stop).filter(Stop.id == "stop-vit-mh-qrst").first()

    ticket_num = int(now.timestamp()) % 1000000
    ticket_id = f"TKT-{ticket_num:06d}"
    vtop_receipt = f"VTOP-TR-2026-{ticket_num:06d}"

    ticket = ShuttleTicketPayment(
        id=ticket_id,
        student_id=req.student_id or "student_demo",
        student_name=req.student_name or "Aarav Sharma",
        vtop_reg_no=req.vtop_reg_no or "22BCE1042",
        vtop_receipt_no=vtop_receipt,
        vtop_synced=True,
        vehicle_id=vehicle_id,
        vehicle_label=vehicle_label,
        boarded_stop_id=stop.id if stop else "stop-vit-mh-qrst",
        boarded_stop_name=stop.name if stop else "MH Q, R, S, T High-Rise Towers",
        fare_amount=20.0,
        penalty_rate_per_day=10.0,
        scan_timestamp=now,
        due_at=due_at,
        status="pending",
        days_overdue=0,
        penalty_amount=0.0,
        total_amount=20.0,
        qr_code_data=req.qr_data,
        is_single_use_burned=False
    )

    db.add(ticket)
    db.add(AuditLog(
        actor=req.vtop_reg_no or "22BCE1042",
        action="VTOP_TRANSIT_SCAN",
        details=f"Scanned on {vehicle_label}. ₹20 added to V-TOP dues. Receipt: {vtop_receipt}. Due in 24h."
    ))
    db.commit()
    db.refresh(ticket)

    return {
        "success": True,
        "message": f"Boarding QR Scanned! ₹20 added to V-TOP account ({ticket.vtop_reg_no}). Due within 24 hours.",
        "ticket": {
            "id": ticket.id,
            "vtop_reg_no": ticket.vtop_reg_no,
            "vtop_receipt_no": ticket.vtop_receipt_no,
            "vehicle_label": ticket.vehicle_label,
            "fare_amount": ticket.fare_amount,
            "due_at": ticket.due_at.isoformat(),
            "status": ticket.status,
            "total_amount": ticket.total_amount
        }
    }

@router.post("/pay")
def pay_ticket(
    req: PayTicketRequest,
    db: Session = Depends(get_db)
):
    ticket = db.query(ShuttleTicketPayment).filter(
        ShuttleTicketPayment.id == req.ticket_id
    ).first()

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if ticket.status in ["paid", "vtop_debited"]:
        return {"success": True, "message": "Ticket is already paid", "ticket_id": ticket.id}

    now = datetime.now(timezone.utc)
    ticket.status = "paid"
    ticket.paid_at = now
    ticket.payment_method = req.payment_method
    ticket.transaction_ref = f"TXN-VTOP-{uuid.uuid4().hex[:8].upper()}"

    db.add(AuditLog(
        actor=ticket.vtop_reg_no or ticket.student_id,
        action="VTOP_TRANSIT_SETTLED",
        details=f"Paid ₹{ticket.total_amount} for ride {ticket.id} on {ticket.vehicle_label} via {req.payment_method}. Ref: {ticket.transaction_ref}"
    ))
    db.commit()

    return {
        "success": True,
        "message": f"Payment of ₹{ticket.total_amount} completed! V-TOP clearance updated.",
        "transaction_ref": ticket.transaction_ref,
        "vtop_receipt_no": ticket.vtop_receipt_no,
        "paid_at": ticket.paid_at.isoformat(),
        "total_paid": ticket.total_amount
    }

@router.post("/simulate-overdue")
def simulate_overdue_ticket(
    req: SimulateOverdueRequest,
    db: Session = Depends(get_db)
):
    ticket = db.query(ShuttleTicketPayment).filter(
        ShuttleTicketPayment.id == req.ticket_id
    ).first()

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    now = datetime.now(timezone.utc)
    past_scan = now - timedelta(hours=req.hours_ago)
    past_due = past_scan + timedelta(hours=24)

    ticket.scan_timestamp = past_scan
    ticket.due_at = past_due

    seconds_past = (now - past_due).total_seconds()
    days = max(1, math.ceil(seconds_past / 86400))
    ticket.days_overdue = days
    ticket.penalty_amount = round(days * ticket.penalty_rate_per_day, 2)
    ticket.total_amount = round(ticket.fare_amount + ticket.penalty_amount, 2)
    ticket.status = "overdue"

    db.commit()

    return {
        "success": True,
        "message": f"Simulated {req.hours_ago} hours elapsed ({days} day(s) overdue). Added ₹{ticket.penalty_amount} penalty. V-TOP exam hall ticket placed on HOLD.",
        "ticket": {
            "id": ticket.id,
            "days_overdue": ticket.days_overdue,
            "penalty_amount": ticket.penalty_amount,
            "total_amount": ticket.total_amount,
            "status": ticket.status
        }
    }

@router.get("/available-qrs")
def get_available_shuttle_qrs(db: Session = Depends(get_db)):
    vehicles = db.query(Vehicle).all()
    qrs = []
    for v in vehicles:
        qrs.append({
            "code": f"VIT-SHUTTLE-{v.id}",
            "type": "vehicle",
            "title": v.label,
            "subtitle": f"Fare: ₹20 per turn • Capacity: {v.capacity} seats • V-TOP Linked",
            "vehicle_id": v.id
        })
    return {
        "shuttle_qrs": qrs,
        "fare_rules": {
            "base_fare": 20.0,
            "grace_period_hours": 24,
            "daily_penalty": 10.0,
            "currency": "INR (₹)",
            "vtop_integration": "Enabled (Reg No: 22BCE1042)"
        }
    }
