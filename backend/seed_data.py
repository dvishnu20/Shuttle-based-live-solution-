import json
from datetime import datetime, timezone, timedelta
from backend.app.database import engine, Base, SessionLocal
from backend.app.models import (
    User, Stop, Route, Vehicle, Trip, Position, OccupancyEvent, BoardingIntent, AuditLog,
    DispatchRecommendation, EtaPrediction, ArrivalEvent, DriverRegistration, ShuttleTicketPayment
)

# Detailed VIT Vellore Hostel Blocks Metadata as per official university directory
VIT_HOSTEL_DIRECTORY = {
    "stop-vit-mh-qrst": {
        "cluster_name": "MH Q, R, S, T High-Rise Towers",
        "description": "Farthest north hostel towers with high shuttle commuter demand to TT/SJT.",
        "blocks": [
            {"code": "MH Q", "name": "VAJPAYEE BLOCK", "phone": "0416 220 2548", "email": "mhqblock@vit.ac.in"},
            {"code": "MH R", "name": "MUTHAMIZH ARIGNAR KALAIGNAR M.KARUNANIDHI", "phone": "0416 220 2549", "email": "mhrblock@vit.ac.in"},
            {"code": "MH S", "name": "ABDUL KALAM BLOCK", "phone": "0416 220 2550", "email": "mhsblock@vit.ac.in"},
            {"code": "MH T", "name": "JAGADISH CHANDRA BOSE BLOCK", "phone": "0416 220 2551", "email": "mhtblock@vit.ac.in"}
        ]
    },
    "stop-vit-mh-ghjkl": {
        "cluster_name": "MH G, H, J, K, L Blocks (Darling Mess Hub)",
        "description": "Adjacent to Darling Special Mess, Food Mall and Nescafe.",
        "blocks": [
            {"code": "MH G", "name": "SOCRATES", "phone": "0416 220 2539", "email": "mhgblock@vit.ac.in"},
            {"code": "MH H", "name": "JOHN F KENNEDY", "phone": "0416 220 2540", "email": "mhhblock@vit.ac.in"},
            {"code": "MH J", "name": "JOHN F KENNEDY", "phone": "0416 220 2541", "email": "mhjblock@vit.ac.in"},
            {"code": "MH K", "name": "Dr. SARVEPALLI RADHAKRISHNAN", "phone": "0416 220 2542", "email": "mhkblock@vit.ac.in"},
            {"code": "MH L", "name": "NETAJI SUBHAS CHANDRA BOSE", "phone": "0416 220 2543", "email": "mhlblock@vit.ac.in"}
        ]
    },
    "stop-vit-mh-mnp": {
        "cluster_name": "MH M, N, P Blocks (Central Quad)",
        "description": "Central hostel walkway connecting to Outdoor Sports Stadium.",
        "blocks": [
            {"code": "MH M", "name": "QUAID-E- MILLAT MUHAMMED ISMAIL", "phone": "0416 220 2544", "email": "mhmblock@vit.ac.in"},
            {"code": "MH M ANNEX", "name": "QUAID-E- MILLAT - M ANNEX", "phone": "0416 220 2545", "email": "mhmannexblock@vit.ac.in"},
            {"code": "MH N", "name": "CHARLES DARWIN", "phone": "0416 220 2546", "email": "mhnblock@vit.ac.in"},
            {"code": "MH N ANNEX", "name": "CHARLES DARWIN - N ANNEX", "phone": "0416 220 2564", "email": "mhnannexblock@vit.ac.in"},
            {"code": "MH P", "name": "SARDAR PATEL", "phone": "0416 220 2547", "email": "mhpblock@vit.ac.in"}
        ]
    },
    "stop-vit-mh-abcdef": {
        "cluster_name": "MH A - F Blocks (West Hostel Zone)",
        "description": "Near Technology Tower, Anna Auditorium and Enzo.",
        "blocks": [
            {"code": "MH A", "name": "ALBERT EINSTEIN", "phone": "0416 220 2531", "email": "mhablock@vit.ac.in"},
            {"code": "MH B", "name": "SWAMI VIVEKANANDA", "phone": "0416 220 2532", "email": "mhbblock@vit.ac.in"},
            {"code": "MH B ANNEX", "name": "SWAMI VIVEKANANDA – B ANNEX", "phone": "0416 220 2533", "email": "mhbannex@vit.ac.in"},
            {"code": "MH C", "name": "RABINDRANATH TAGORE", "phone": "0416 220 2534", "email": "mhcblock@vit.ac.in"},
            {"code": "MH D", "name": "NELSON MANDELA", "phone": "0416 220 2535", "email": "mhdblock@vit.ac.in"},
            {"code": "MH D ANNEX", "name": "NELSON MANDELA – D ANNEX", "phone": "0416 220 2536", "email": "mhdannex@vit.ac.in"},
            {"code": "MH E", "name": "SIR C.V.RAMAN", "phone": "0416 220 2537", "email": "mheblock@vit.ac.in"},
            {"code": "MH F", "name": "RAMANUJAM", "phone": "0416 220 2538", "email": "mhfblock@vit.ac.in"}
        ]
    },
    "stop-vit-lh-abcdef": {
        "cluster_name": "LH A - F Blocks (Main Ladies Hostel & Food Park)",
        "description": "Main LH Quadrangle adjacent to Food Park & Tiruvallur statue.",
        "blocks": [
            {"code": "LH A", "name": "Ladies Hostel Block A", "phone": "0416 220 2669", "email": "lhablock@vit.ac.in"},
            {"code": "LH B", "name": "Ladies Hostel Block B", "phone": "0416 220 2670", "email": "lhbblock@vit.ac.in"},
            {"code": "LH C", "name": "Ladies Hostel Block C", "phone": "0416 220 2703", "email": "lhcblock@vit.ac.in"},
            {"code": "LH D", "name": "Ladies Hostel Block D", "phone": "0416 220 2704", "email": "lhdblock@vit.ac.in"},
            {"code": "LH E", "name": "Ladies Hostel Block E", "phone": "0416 220 2705", "email": "lheblock@vit.ac.in"},
            {"code": "LH F", "name": "Ladies Hostel Block F", "phone": "0416 220 2706", "email": "lhfblock@vit.ac.in"}
        ]
    },
    "stop-vit-lh-ghj": {
        "cluster_name": "LH G, H, J, RGT & GH Annex Towers",
        "description": "North Ladies Hostel towers with direct pathway to SJT & TT.",
        "blocks": [
            {"code": "LH G", "name": "Ladies Hostel Block G", "phone": "0416 220 2892", "email": "lhgblock@vit.ac.in"},
            {"code": "LH H", "name": "Ladies Hostel Block H", "phone": "0416 220 2894", "email": "lhhblock@vit.ac.in"},
            {"code": "LH J", "name": "Ladies Hostel Block J", "phone": "0416 220 2896", "email": "lhjblock@vit.ac.in"},
            {"code": "RGT H", "name": "RGT Hostel Block", "phone": "0416 220 5003", "email": "rgthblock@vit.ac.in"},
            {"code": "LH GH", "name": "LH GH (Annex)", "phone": "0416 220 2244", "email": "lhghannex@vit.ac.in"}
        ]
    }
}

def seed():
    ShuttleTicketPayment.__table__.drop(bind=engine, checkfirst=True)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        print("Seeding VIT Vellore CampusMap with official MH/LH Hostel directory...")
        db.query(ShuttleTicketPayment).delete()
        db.query(DriverRegistration).delete()
        db.query(Position).delete()
        db.query(OccupancyEvent).delete()
        db.query(BoardingIntent).delete()
        db.query(DispatchRecommendation).delete()
        db.query(EtaPrediction).delete()
        db.query(ArrivalEvent).delete()
        db.query(AuditLog).delete()
        db.query(Trip).delete()
        db.query(Route).delete()
        db.query(Vehicle).delete()
        db.query(Stop).delete()
        db.query(User).delete()
        db.commit()

        # 1. Users
        users = [
            User(id="student_demo", role="student", display_name="Aarav Sharma (VIT MH-Q Resident)"),
            User(id="driver_mh_qrst", role="driver", display_name="Murugan (VIT MH Q-T Shuttle 101)"),
            User(id="driver_lh", role="driver", display_name="Kavitha (VIT LH Dedicated 102)"),
            User(id="driver_sjt_tt", role="driver", display_name="Senthil (VIT SJT-TT Loop 103)"),
            User(id="admin_1", role="admin", display_name="VIT Transport Officer (Katpadi Depot)")
        ]
        db.add_all(users)

        # 2. Official VIT Vellore Stops grouped by adjacent block clusters
        stops = [
            Stop(id="stop-vit-gate", name="VIT Main Gate 1 (Katpadi Rd)", latitude=12.96865, longitude=79.15593, sequence_hint=1),
            Stop(id="stop-vit-mb", name="Dr. MGR Block (MB) & Central Library", latitude=12.96930, longitude=79.15680, sequence_hint=2),
            Stop(id="stop-vit-tt", name="Technology Tower (TT Academic Block)", latitude=12.97020, longitude=79.15800, sequence_hint=3),
            Stop(id="stop-vit-lh-abcdef", name="LH A - F Blocks & Food Park", latitude=12.97215, longitude=79.15800, sequence_hint=4),
            Stop(id="stop-vit-lh-ghj", name="LH G, H, J, RGT & GH Annex", latitude=12.97320, longitude=79.15750, sequence_hint=5),
            Stop(id="stop-vit-mh-abcdef", name="MH A - F Blocks (Einstein, Ramanujam)", latitude=12.97180, longitude=79.15950, sequence_hint=6),
            Stop(id="stop-vit-mh-mnp", name="MH M, N, P Blocks (Darwin, Patel)", latitude=12.97290, longitude=79.16120, sequence_hint=7),
            Stop(id="stop-vit-mh-ghjkl", name="MH G - L Blocks (Darling Mess Hub)", latitude=12.97380, longitude=79.16320, sequence_hint=8),
            Stop(id="stop-vit-mh-qrst", name="MH Q, R, S, T High-Rise Towers (Vajpayee, Kalam)", latitude=12.97520, longitude=79.16460, sequence_hint=9),
            Stop(id="stop-vit-sjt", name="Silver Jubilee Tower (SJT Block)", latitude=12.97140, longitude=79.16325, sequence_hint=10),
        ]
        db.add_all(stops)

        # 3. Main Campus Loop Route
        all_stop_ids = [
            "stop-vit-gate", "stop-vit-mb", "stop-vit-tt", "stop-vit-lh-abcdef",
            "stop-vit-lh-ghj", "stop-vit-mh-abcdef", "stop-vit-mh-mnp",
            "stop-vit-mh-ghjkl", "stop-vit-mh-qrst", "stop-vit-sjt"
        ]
        route1 = Route(
            id="route-1",
            name="VIT Vellore Master Shuttle Loop",
            ordered_stop_ids=json.dumps(all_stop_ids),
            active=True
        )
        db.add(route1)

        # 4. Dedicated Shuttles
        vehicles = [
            Vehicle(id="veh-vit-mh-qrst", label="VIT MH Q-R-S-T Express Shuttle (Bus 101)", capacity=40, status="active"),
            Vehicle(id="veh-vit-lh", label="VIT Ladies Hostel Dedicated Shuttle (Bus 102)", capacity=40, status="active"),
            Vehicle(id="veh-vit-sjt-tt", label="VIT SJT-TT Academic Connector (Bus 103)", capacity=40, status="active"),
            Vehicle(id="veh-spare-1", label="VIT Standby EcoShuttle (Spare 104)", capacity=40, status="idle"),
            Vehicle(id="veh-spare-2", label="VIT MiniShuttle Standby (Spare 105)", capacity=25, status="idle"),
        ]
        db.add_all(vehicles)

        now = datetime.now(timezone.utc)

        # 5. Trips: 3 active shuttles running
        trip_mh = Trip(
            id="trip-1",
            route_id="route-1",
            vehicle_id="veh-vit-mh-qrst",
            driver_id="driver_mh_qrst",
            start_time=now - timedelta(minutes=15),
            state="in_progress"
        )
        trip_lh = Trip(
            id="trip-2",
            route_id="route-1",
            vehicle_id="veh-vit-lh",
            driver_id="driver_lh",
            start_time=now - timedelta(minutes=10),
            state="in_progress"
        )
        trip_sjt = Trip(
            id="trip-3",
            route_id="route-1",
            vehicle_id="veh-vit-sjt-tt",
            driver_id="driver_sjt_tt",
            start_time=now - timedelta(minutes=5),
            state="in_progress"
        )
        db.add_all([trip_mh, trip_lh, trip_sjt])

        # 6. Positions
        pos_mh = Position(
            trip_id="trip-1",
            latitude=12.97520,
            longitude=79.16460,
            accuracy_m=3.5,
            speed_mps=6.8,
            bearing=190.0,
            recorded_at=now
        )
        pos_lh = Position(
            trip_id="trip-2",
            latitude=12.97215,
            longitude=79.15800,
            accuracy_m=3.0,
            speed_mps=7.0,
            bearing=90.0,
            recorded_at=now
        )
        pos_sjt = Position(
            trip_id="trip-3",
            latitude=12.97140,
            longitude=79.16325,
            accuracy_m=4.0,
            speed_mps=6.5,
            bearing=270.0,
            recorded_at=now
        )
        db.add_all([pos_mh, pos_lh, pos_sjt])

        # 7. Occupancies
        occ_mh = OccupancyEvent(
            trip_id="trip-1",
            stop_id="stop-vit-mh-qrst",
            boarded=22,
            alighted=0,
            total_occupancy=22,
            timestamp=now - timedelta(minutes=2),
            source="driver"
        )
        occ_lh = OccupancyEvent(
            trip_id="trip-2",
            stop_id="stop-vit-lh-abcdef",
            boarded=16,
            alighted=0,
            total_occupancy=16,
            timestamp=now - timedelta(minutes=1),
            source="driver"
        )
        occ_sjt = OccupancyEvent(
            trip_id="trip-3",
            stop_id="stop-vit-sjt",
            boarded=14,
            alighted=0,
            total_occupancy=14,
            timestamp=now - timedelta(minutes=1),
            source="driver"
        )
        db.add_all([occ_mh, occ_lh, occ_sjt])

        # 8. Boarding intents for MH Q-T and LH
        for i in range(9):
            db.add(BoardingIntent(
                anonymous_session_or_user_id=f"session_vit_mh_{i}",
                stop_id="stop-vit-mh-qrst",
                window_start=now,
                expires_at=now + timedelta(minutes=15)
            ))
        for i in range(7):
            db.add(BoardingIntent(
                anonymous_session_or_user_id=f"session_vit_lh_{i}",
                stop_id="stop-vit-lh-abcdef",
                window_start=now,
                expires_at=now + timedelta(minutes=15)
            ))

        # 9. Registered Shuttle Drivers (Tracking depends on registered on-duty drivers)
        registered_drivers = [
            DriverRegistration(
                id="DRV-101",
                name="Rajesh Kumar",
                phone="+91 98401 23456",
                license_number="TN-23-2022-004921",
                assigned_vehicle_id="veh-vit-mh-qrst",
                is_on_duty=True,
                status="on_duty",
                registered_at=now - timedelta(days=15),
                last_active_at=now
            ),
            DriverRegistration(
                id="DRV-102",
                name="Murugan V",
                phone="+91 98402 34567",
                license_number="TN-23-2021-008129",
                assigned_vehicle_id="veh-vit-lh",
                is_on_duty=True,
                status="on_duty",
                registered_at=now - timedelta(days=30),
                last_active_at=now
            ),
            DriverRegistration(
                id="DRV-103",
                name="Kavitha R",
                phone="+91 98403 45678",
                license_number="TN-23-2023-001244",
                assigned_vehicle_id="veh-vit-sjt-tt",
                is_on_duty=True,
                status="on_duty",
                registered_at=now - timedelta(days=10),
                last_active_at=now
            )
        ]
        db.add_all(registered_drivers)

        # 10. Sample Shuttle Ride Tickets & Fares
        # Ride 1: Scanned 2 hours ago -> Within 24-hr window (Pending, ₹20)
        tkt_pending = ShuttleTicketPayment(
            id="TKT-10821",
            student_id="student_demo",
            student_name="Aarav Sharma",
            vehicle_id="veh-vit-mh-qrst",
            vehicle_label="VIT MH Q-R-S-T Express Shuttle (Bus 101)",
            boarded_stop_id="stop-vit-mh-qrst",
            boarded_stop_name="MH Q, R, S, T High-Rise Towers",
            fare_amount=20.0,
            penalty_rate_per_day=10.0,
            scan_timestamp=now - timedelta(hours=2),
            due_at=now + timedelta(hours=22), # 22 hours left
            status="pending",
            days_overdue=0,
            penalty_amount=0.0,
            total_amount=20.0,
            qr_code_data="VIT-SHUTTLE-veh-vit-mh-qrst"
        )

        # Ride 2: Scanned 30 hours ago -> 6 hours past 24-hr window -> 1 day overdue (+₹10 penalty, Total ₹30)
        tkt_overdue = ShuttleTicketPayment(
            id="TKT-10815",
            student_id="student_demo",
            student_name="Aarav Sharma",
            vehicle_id="veh-vit-lh",
            vehicle_label="VIT Ladies Hostel Dedicated Shuttle (Bus 102)",
            boarded_stop_id="stop-vit-lh-abcdef",
            boarded_stop_name="LH A - F Blocks & Food Park",
            fare_amount=20.0,
            penalty_rate_per_day=10.0,
            scan_timestamp=now - timedelta(hours=30),
            due_at=now - timedelta(hours=6), # Overdue by 6 hours
            status="overdue",
            days_overdue=1,
            penalty_amount=10.0,
            total_amount=30.0,
            qr_code_data="VIT-SHUTTLE-veh-vit-lh"
        )

        # Ride 3: Scanned 2 days ago -> Paid on time via UPI
        tkt_paid = ShuttleTicketPayment(
            id="TKT-10798",
            student_id="student_demo",
            student_name="Aarav Sharma",
            vehicle_id="veh-vit-sjt-tt",
            vehicle_label="VIT SJT-TT Academic Connector (Bus 103)",
            boarded_stop_id="stop-vit-sjt",
            boarded_stop_name="Silver Jubilee Tower (SJT Block)",
            fare_amount=20.0,
            penalty_rate_per_day=10.0,
            scan_timestamp=now - timedelta(days=2),
            due_at=now - timedelta(days=1),
            status="paid",
            days_overdue=0,
            penalty_amount=0.0,
            total_amount=20.0,
            paid_at=now - timedelta(days=1, hours=18),
            payment_method="UPI (Google Pay)",
            transaction_ref="TXN-VIT-84920A1",
            qr_code_data="VIT-SHUTTLE-veh-vit-sjt-tt"
        )
        db.add_all([tkt_pending, tkt_overdue, tkt_paid])

        # 11. Audit Log
        audit = AuditLog(
            actor="system_bootstrap",
            action="SYSTEM_INITIALIZE",
            details="VIT Vellore Shuttle System loaded: Registered Drivers, QR Fares (₹20/turn), and 24-hr penalty rule configured.",
            timestamp=now
        )
        db.add(audit)

        db.commit()
        print("VIT Vellore Campus with registered drivers and QR fare payments seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed()
