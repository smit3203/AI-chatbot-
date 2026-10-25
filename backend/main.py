import os
import re
import csv
import io
import urllib.parse
from datetime import date, datetime, timezone
from pathlib import Path
from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse, JSONResponse, Response
from sqlmodel import Session, select, func

from database import engine, get_session, init_db, DB_ENGINE_TYPE
from models import (
    Party, Challan, ChallanType, UnitType, LotDelivery,
    MachineShift, ShiftType, RateQuote, MaterialType, LotStatus,
    ChallanCreate, ChallanRead, ChallanDetailRead,
    LotDispatchCreate, LotDispatchResponse, PendingLotRead,
    ShiftLogCreate, ShiftLogRead, ShiftSummaryRead,
    QuoteRequest, QuoteResponse,
    PartyRead, PartyLedgerRead, PartySummaryRead,
    DashboardSummaryRead, AIChallanOCRResponse, AIMessageResponse
)
import ai_service
from seed import seed_database

# Initialize FastAPI App
app = FastAPI(
    title="ChallanAI (EmbroideryOS) API",
    description="Backend API for Textile Job-Work Challan Reconciliation, AI Vision OCR & Shift Tracker",
    version="2.0.0"
)

# Configure CORS
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure uploads directory exists and mount static files
UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.on_event("startup")
def on_startup():
    """Startup initialization: auto-creates tables and seeds initial data if empty."""
    init_db()
    with Session(engine) as session:
        first_party = session.exec(select(Party)).first()
        if not first_party:
            print("[ChallanAI Startup] Database is empty. Seeding initial test data...")
            seed_database()


# --- ROOT & FAVICON ROUTES ---

@app.get("/")
def root():
    """Root endpoint welcoming users and providing direct links to API docs and endpoints."""
    return {
        "system": "ChallanAI (EmbroideryOS) API",
        "version": "2.0.0",
        "status": "ONLINE",
        "cluster": "Gujarat Textile Hubs (Surat, Ahmedabad, Jetpur)",
        "database": DB_ENGINE_TYPE,
        "swagger_docs": "/docs",
        "redoc": "/redoc",
        "endpoints": {
            "health": "/api/health",
            "dashboard_summary": "/api/dashboard/summary",
            "pending_lots": "/api/lots/pending",
            "parties": "/api/parties",
            "shifts_summary": "/api/shifts/summary"
        }
    }


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    """Returns empty 204 response for browser favicon requests."""
    return Response(status_code=204)


# --- 1. HEALTH & DIAGNOSTICS ---

@app.get("/api/health")
def health_check():
    """Returns system status, active database engine, and AI operational mode."""
    return {
        "status": "ONLINE",
        "system": "ChallanAI (EmbroideryOS)",
        "version": "2.0.0",
        "database_engine": DB_ENGINE_TYPE,
        "ai_service_mode": "GEMINI_2_5_FLASH" if ai_service.genai_client else "DETERMINISTIC_DEMO_PRESETS",
        "supported_languages": ["ગુજરાતી", "English"],
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# --- 2. DASHBOARD KPI SUMMARY (v2.0) ---

@app.get("/api/dashboard/summary", response_model=DashboardSummaryRead)
def get_dashboard_summary(session: Session = Depends(get_session)):
    """Computes top-level operational KPIs for the factory dashboard ribbon."""
    inwards = session.exec(select(Challan).where(Challan.challan_type == ChallanType.INWARD)).all()
    
    total_pending_pcs = 0.0
    total_pending_mtr = 0.0
    active_lots_count = 0
    estimated_pending_billing_inr = 0.0

    for inward in inwards:
        deliveries = session.exec(select(LotDelivery).where(LotDelivery.inward_challan_id == inward.id)).all()
        accounted = sum(d.fresh_quantity + d.returned_raw_quantity + d.kasar_quantity + d.fent_quantity for d in deliveries)
        pending = max(0.0, inward.total_quantity - accounted)
        
        if pending > 0:
            active_lots_count += 1
            if inward.unit == UnitType.PCS:
                total_pending_pcs += pending
            else:
                total_pending_mtr += pending
            
            rate = inward.agreed_rate if inward.agreed_rate > 0 else 35.0
            estimated_pending_billing_inr += pending * rate

    # Low efficiency shifts count
    low_shifts = session.exec(select(MachineShift).where(MachineShift.is_low_efficiency_alert == True)).all()

    return DashboardSummaryRead(
        total_pending_pcs=round(total_pending_pcs, 1),
        total_pending_mtr=round(total_pending_mtr, 1),
        active_lots_count=active_lots_count,
        estimated_pending_billing_inr=round(estimated_pending_billing_inr, 2),
        low_shift_alerts_count=len(low_shifts),
        system_status="ONLINE",
        database_type=DB_ENGINE_TYPE
    )


# --- 3. CHALLAN MANAGEMENT & DUPLICATE GUARD ---

@app.post("/api/challans", response_model=ChallanRead, status_code=201)
def create_challan(payload: ChallanCreate, session: Session = Depends(get_session)):
    """
    Creates an Inward or Outward Challan with Duplicate Challan Guard protection.
    Prevents duplicate slip numbers for the same party and challan type.
    """
    # 1. Resolve Party
    party = None
    if payload.party_id:
        party = session.get(Party, payload.party_id)
    elif payload.party_name:
        party = session.exec(select(Party).where(Party.name.ilike(f"%{payload.party_name.strip()}%"))).first()
        if not party:
            party = Party(name=payload.party_name.strip(), city="Surat")
            session.add(party)
            session.commit()
            session.refresh(party)

    if not party:
        raise HTTPException(status_code=404, detail="વેપારી ખાતું મળ્યું નથી (Party not found or specified)")

    # 2. Duplicate Challan Guard (409 Conflict)
    duplicate = session.exec(
        select(Challan).where(
            Challan.party_id == party.id,
            Challan.challan_number == payload.challan_number.strip(),
            Challan.challan_type == payload.challan_type
        )
    ).first()

    if duplicate:
        raise HTTPException(
            status_code=409,
            detail=f"આ ચલણ નંબર '{payload.challan_number}' {party.name} માટે પહેલેથી જ નોંધાયેલ છે (Duplicate Challan Guard: This slip number is already registered)"
        )

    # 3. Create Challan
    new_challan = Challan(
        challan_type=payload.challan_type,
        party_id=party.id,
        challan_number=payload.challan_number.strip(),
        challan_date=payload.challan_date or date.today(),
        design_number=payload.design_number.strip(),
        factory_punch_number=payload.factory_punch_number,
        agreed_rate=payload.agreed_rate,
        stitches_per_piece=payload.stitches_per_piece,
        fabric_type=payload.fabric_type,
        total_quantity=payload.total_quantity,
        unit=payload.unit,
        photo_url=payload.photo_url,
        design_photo_url=payload.design_photo_url,
        notes=payload.notes
    )
    session.add(new_challan)
    session.commit()
    session.refresh(new_challan)

    return ChallanRead(
        id=new_challan.id,
        challan_type=new_challan.challan_type,
        party_id=new_challan.party_id,
        party_name=party.name,
        challan_number=new_challan.challan_number,
        challan_date=new_challan.challan_date,
        design_number=new_challan.design_number,
        factory_punch_number=new_challan.factory_punch_number,
        agreed_rate=new_challan.agreed_rate,
        stitches_per_piece=new_challan.stitches_per_piece,
        fabric_type=new_challan.fabric_type,
        total_quantity=new_challan.total_quantity,
        unit=new_challan.unit,
        photo_url=new_challan.photo_url,
        design_photo_url=new_challan.design_photo_url,
        notes=new_challan.notes,
        created_at=new_challan.created_at
    )


@app.get("/api/challans", response_model=List[ChallanRead])
def list_challans(
    party_id: Optional[UUID] = None,
    challan_type: Optional[ChallanType] = None,
    session: Session = Depends(get_session)
):
    """Lists challans with optional filtering by party and type."""
    query = select(Challan)
    if party_id:
        query = query.where(Challan.party_id == party_id)
    if challan_type:
        query = query.where(Challan.challan_type == challan_type)
    
    query = query.order_by(Challan.created_at.desc())
    results = session.exec(query).all()

    output = []
    for c in results:
        p = session.get(Party, c.party_id)
        output.append(
            ChallanRead(
                id=c.id,
                challan_type=c.challan_type,
                party_id=c.party_id,
                party_name=p.name if p else "Unknown",
                challan_number=c.challan_number,
                challan_date=c.challan_date,
                design_number=c.design_number,
                factory_punch_number=c.factory_punch_number,
                agreed_rate=c.agreed_rate,
                stitches_per_piece=c.stitches_per_piece,
                fabric_type=c.fabric_type,
                total_quantity=c.total_quantity,
                unit=c.unit,
                photo_url=c.photo_url,
                design_photo_url=c.design_photo_url,
                notes=c.notes,
                created_at=c.created_at
            )
        )
    return output


@app.get("/api/challans/{challan_id}", response_model=ChallanDetailRead)
def get_challan_detail(challan_id: UUID, session: Session = Depends(get_session)):
    """Retrieves single challan with complete linked delivery audit trail."""
    challan = session.get(Challan, challan_id)
    if not challan:
        raise HTTPException(status_code=404, detail="ચલણ મળ્યું નથી (Challan not found)")

    party = session.get(Party, challan.party_id)
    linked_deliveries = []
    
    if challan.challan_type == ChallanType.INWARD:
        delivs = session.exec(select(LotDelivery).where(LotDelivery.inward_challan_id == challan.id)).all()
        for d in delivs:
            out_c = session.get(Challan, d.outward_challan_id)
            linked_deliveries.append({
                "delivery_id": str(d.id),
                "outward_challan_number": out_c.challan_number if out_c else "N/A",
                "dispatch_date": str(d.dispatch_date),
                "fresh_quantity": d.fresh_quantity,
                "returned_raw_quantity": d.returned_raw_quantity,
                "kasar_quantity": d.kasar_quantity,
                "fent_quantity": d.fent_quantity,
                "photo_url": out_c.photo_url if out_c else None
            })

    return ChallanDetailRead(
        id=challan.id,
        challan_type=challan.challan_type,
        party_id=challan.party_id,
        party_name=party.name if party else "Unknown",
        challan_number=challan.challan_number,
        challan_date=challan.challan_date,
        design_number=challan.design_number,
        factory_punch_number=challan.factory_punch_number,
        agreed_rate=challan.agreed_rate,
        stitches_per_piece=challan.stitches_per_piece,
        fabric_type=challan.fabric_type,
        total_quantity=challan.total_quantity,
        unit=challan.unit,
        photo_url=challan.photo_url,
        design_photo_url=challan.design_photo_url,
        notes=challan.notes,
        created_at=challan.created_at,
        linked_deliveries=linked_deliveries
    )


# --- 4. LOT RECONCILIATION & PARTIAL OUTWARD DISPATCH (v2.0) ---

@app.get("/api/lots/pending", response_model=List[PendingLotRead])
def list_pending_lots(session: Session = Depends(get_session)):
    """
    Computes real-time lot balances and reconciliation progress for Tab 2.
    Tracks: Total Inward, Fresh Delivered, Returned Raw, Kasar, and Fent.
    """
    inwards = session.exec(
        select(Challan).where(Challan.challan_type == ChallanType.INWARD).order_by(Challan.created_at.desc())
    ).all()

    output = []
    for inward in inwards:
        party = session.get(Party, inward.party_id)
        delivs = session.exec(select(LotDelivery).where(LotDelivery.inward_challan_id == inward.id)).all()

        total_fresh = sum(d.fresh_quantity for d in delivs)
        total_raw_ret = sum(d.returned_raw_quantity for d in delivs)
        total_kasar = sum(d.kasar_quantity for d in delivs)
        total_fent = sum(d.fent_quantity for d in delivs)
        
        total_accounted = total_fresh + total_raw_ret + total_kasar + total_fent
        pending = round(inward.total_quantity - total_accounted, 2)
        completion_pct = round((total_accounted / inward.total_quantity) * 100, 1) if inward.total_quantity > 0 else 0.0
        
        # Commercial billing: only fresh quantity is billable!
        billable_inr = round(total_fresh * (inward.agreed_rate if inward.agreed_rate > 0 else 42.0), 2)

        # Status determination
        if pending == inward.total_quantity:
            status = LotStatus.RECEIVED
        elif pending > 0:
            status = LotStatus.IN_PROGRESS
        elif pending == 0:
            status = LotStatus.COMPLETED
        else:
            status = LotStatus.OVERDELIVERED

        output.append(
            PendingLotRead(
                inward_challan_id=inward.id,
                party_id=inward.party_id,
                party_name=party.name if party else "Unknown Party",
                party_phone=party.phone if party else None,
                challan_number=inward.challan_number,
                challan_date=inward.challan_date,
                design_number=inward.design_number,
                factory_punch_number=inward.factory_punch_number,
                agreed_rate=inward.agreed_rate,
                stitches_per_piece=inward.stitches_per_piece,
                fabric_type=inward.fabric_type,
                unit=inward.unit,
                total_inward=inward.total_quantity,
                total_fresh_delivered=total_fresh,
                total_returned_raw=total_raw_ret,
                total_kasar=total_kasar,
                total_fent=total_fent,
                total_accounted=total_accounted,
                pending_balance=pending,
                completion_percentage=min(100.0, completion_pct),
                billable_amount_inr=billable_inr,
                status=status,
                photo_url=inward.photo_url,
                design_photo_url=inward.design_photo_url,
                delivery_count=len(delivs)
            )
        )
    return output


@app.post("/api/lots/{inward_id}/dispatch", response_model=LotDispatchResponse)
def dispatch_partial_delivery(
    inward_id: UUID,
    payload: LotDispatchCreate,
    session: Session = Depends(get_session)
):
    """
    Logs partial outward delivery against an inward lot with v2.0 Overdelivery Guard.
    Accommodates Fresh Pieces, Returned Raw Fabric (unbilled), Kasar, and Fent.
    """
    inward = session.get(Challan, inward_id)
    if not inward or inward.challan_type != ChallanType.INWARD:
        raise HTTPException(status_code=404, detail="આવક લોટ મળ્યો નથી (Inward lot record not found)")

    party = session.get(Party, inward.party_id)
    party_name = party.name if party else "Party"

    # Compute existing accounted quantity
    existing_delivs = session.exec(select(LotDelivery).where(LotDelivery.inward_challan_id == inward.id)).all()
    existing_accounted = sum(d.fresh_quantity + d.returned_raw_quantity + d.kasar_quantity + d.fent_quantity for d in existing_delivs)

    new_accounted = payload.fresh_quantity + payload.returned_raw_quantity + payload.kasar_quantity + payload.fent_quantity
    total_after = existing_accounted + new_accounted

    # v2.0 Overdelivery Guard (allowing 2% meterage tolerance)
    if total_after > (inward.total_quantity * 1.02):
        raise HTTPException(
            status_code=400,
            detail=f"જાવક જથ્થો આવક કરતા વધારે છે (Overdelivery Guard: Total {total_after} exceeds inward {inward.total_quantity} by >2%)"
        )

    # Create Outward Challan
    outward_challan = Challan(
        challan_type=ChallanType.OUTWARD,
        party_id=inward.party_id,
        challan_number=payload.outward_challan_number.strip(),
        challan_date=payload.dispatch_date or date.today(),
        design_number=inward.design_number,
        factory_punch_number=inward.factory_punch_number,
        agreed_rate=inward.agreed_rate,
        stitches_per_piece=inward.stitches_per_piece,
        fabric_type=inward.fabric_type,
        total_quantity=payload.fresh_quantity,
        unit=inward.unit,
        photo_url=payload.photo_url,
        notes=payload.notes
    )
    session.add(outward_challan)
    session.commit()
    session.refresh(outward_challan)

    # Create LotDelivery Link
    delivery = LotDelivery(
        inward_challan_id=inward.id,
        outward_challan_id=outward_challan.id,
        fresh_quantity=payload.fresh_quantity,
        returned_raw_quantity=payload.returned_raw_quantity,
        kasar_quantity=payload.kasar_quantity,
        fent_quantity=payload.fent_quantity,
        dispatch_date=payload.dispatch_date or date.today()
    )
    session.add(delivery)
    session.commit()

    # Recompute balance
    new_pending = round(inward.total_quantity - total_after, 2)
    rate = inward.agreed_rate if inward.agreed_rate > 0 else 42.0
    billable_this_dispatch = round(payload.fresh_quantity * rate, 2)

    # Format WhatsApp notification
    whatsapp_msg = (
        f"નમસ્તે {party_name}, ચલણ નં {inward.challan_number} સામે જાવક ચલણ {payload.outward_challan_number} થી "
        f"{int(payload.fresh_quantity)} {inward.unit.value} ફ્રેશ"
    )
    if payload.returned_raw_quantity > 0:
        whatsapp_msg += f", {int(payload.returned_raw_quantity)} {inward.unit.value} કાચો માલ પરત"
    if payload.kasar_quantity > 0:
        whatsapp_msg += f", {int(payload.kasar_quantity)} {inward.unit.value} કાસર"
    whatsapp_msg += f" મોકલેલ છે (બિલિંગ રકમ: ₹{billable_this_dispatch:,.2f}). હવે બાકી માલ {new_pending} {inward.unit.value} રહ્યો છે."

    return LotDispatchResponse(
        success=True,
        message="જાવક સફળતાપૂર્વક નોંધાઈ ગઈ (Outward delivery recorded)",
        data={
            "lot_id": str(inward.id),
            "outward_challan_id": str(outward_challan.id),
            "total_inward": inward.total_quantity,
            "fresh_quantity": payload.fresh_quantity,
            "returned_raw_quantity": payload.returned_raw_quantity,
            "kasar_quantity": payload.kasar_quantity,
            "fent_quantity": payload.fent_quantity,
            "total_accounted": total_after,
            "pending_balance": new_pending,
            "billable_amount_inr": billable_this_dispatch,
            "status": "COMPLETED" if new_pending == 0 else "IN_PROGRESS",
            "whatsapp_message": whatsapp_msg
        }
    )


# --- 5. AI VISION OCR & VERNACULAR NLP ---

@app.post("/api/ai/parse-challan-image", response_model=AIChallanOCRResponse)
async def parse_challan_image_endpoint(file: UploadFile = File(...)):
    """
    Accepts multipart paper challan image, saves to /uploads,
    and returns Gemini 2.5 Flash OCR structured data or instant demo preset.
    """
    file_bytes = await file.read()
    filename = file.filename or "uploaded_challan.jpg"
    
    # Save image to uploads folder
    save_path = UPLOAD_DIR / filename
    with open(save_path, "wb") as f:
        f.write(file_bytes)

    # Process via AI Service
    parsed_data = ai_service.parse_challan_image(file_bytes, filename)
    parsed_data["photo_url"] = f"/uploads/{filename}"

    return AIChallanOCRResponse(
        success=True,
        data=parsed_data
    )


@app.post("/api/ai/process-message", response_model=AIMessageResponse)
def process_message_endpoint(payload: dict):
    """Parses natural language floor chat messages in Gujarati/Hindi/English."""
    message = payload.get("message", "")
    result = ai_service.process_vernacular_message(message)
    return AIMessageResponse(**result)


# --- 6. STITCH COSTING & SHIFT TRACKER ---

@app.post("/api/calculator/quote", response_model=QuoteResponse)
def calculate_stitch_quote(payload: QuoteRequest):
    """
    Computes machine batch runtime, pieces per shift, break-even cost,
    and 25% profit margin party quotation.
    """
    eff = max(0.1, payload.efficiency_pct / 100.0)
    batch_mins = payload.stitch_count / (payload.rpm * eff)
    batches_per_shift = 720.0 / batch_mins
    pieces_per_shift = batches_per_shift * payload.machine_heads

    machine_cost_per_piece = payload.shift_cost / max(1.0, pieces_per_shift)
    total_cost = machine_cost_per_piece + payload.material_cost_per_piece
    margin = payload.target_profit_margin_pct / 100.0
    recommended_quote = total_cost * (1.0 + margin)
    profit_per_shift = pieces_per_shift * (recommended_quote - total_cost)

    return QuoteResponse(
        batch_production_minutes=round(batch_mins, 2),
        batches_per_shift=round(batches_per_shift, 2),
        pieces_per_shift=round(pieces_per_shift, 1),
        machine_cost_per_piece=round(machine_cost_per_piece, 2),
        material_cost_per_piece=round(payload.material_cost_per_piece, 2),
        total_cost_per_piece=round(total_cost, 2),
        break_even_rate=round(total_cost, 2),
        recommended_quote_rate=round(recommended_quote, 2),
        profit_per_shift=round(profit_per_shift, 2)
    )


@app.post("/api/shifts/log", response_model=ShiftLogRead, status_code=201)
def log_machine_shift(payload: ShiftLogCreate, session: Session = Depends(get_session)):
    """
    Logs 12-hour machine shift LCD counters, persists target efficiency,
    computes Karigar incentive bonus, and flags low-efficiency alert.
    """
    total = max(0, payload.end_stitch_counter - payload.start_stitch_counter)
    target = payload.target_stitches if payload.target_stitches > 0 else 400000
    eff = round((total / target) * 100, 2)
    excess = max(0, total - target)
    bonus = round((excess / 10000) * 15.0, 2)
    alert = eff < 70.0 or payload.downtime_minutes > 90

    shift = MachineShift(
        machine_number=payload.machine_number.strip(),
        shift_type=payload.shift_type,
        shift_date=payload.shift_date or date.today(),
        operator_name=payload.operator_name.strip(),
        start_stitch_counter=payload.start_stitch_counter,
        end_stitch_counter=payload.end_stitch_counter,
        total_stitches=total,
        target_stitches=target,
        efficiency_pct=eff,
        bonus_earned_inr=bonus,
        is_low_efficiency_alert=alert,
        rpm_average=payload.rpm_average,
        downtime_minutes=payload.downtime_minutes,
        photo_url=payload.photo_url,
        notes=payload.notes
    )
    session.add(shift)
    session.commit()
    session.refresh(shift)

    return ShiftLogRead(
        id=shift.id,
        machine_number=shift.machine_number,
        shift_type=shift.shift_type,
        shift_date=shift.shift_date,
        operator_name=shift.operator_name,
        start_stitch_counter=shift.start_stitch_counter,
        end_stitch_counter=shift.end_stitch_counter,
        total_stitches=shift.total_stitches,
        target_stitches=shift.target_stitches,
        efficiency_pct=shift.efficiency_pct,
        bonus_earned_inr=shift.bonus_earned_inr,
        is_low_efficiency_alert=shift.is_low_efficiency_alert,
        rpm_average=shift.rpm_average,
        downtime_minutes=shift.downtime_minutes,
        photo_url=shift.photo_url,
        notes=shift.notes,
        created_at=shift.created_at
    )


@app.get("/api/shifts/summary", response_model=ShiftSummaryRead)
def get_shifts_summary(
    shift_date: Optional[date] = None,
    session: Session = Depends(get_session)
):
    """Retrieves machine shift comparison and bonus reports for a date."""
    target_date = shift_date or date.today()
    shifts = session.exec(
        select(MachineShift).where(MachineShift.shift_date == target_date).order_by(MachineShift.machine_number)
    ).all()

    if not shifts:
        shifts = session.exec(select(MachineShift).order_by(MachineShift.created_at.desc()).limit(10)).all()

    total_stitches = sum(s.total_stitches for s in shifts)
    total_bonus = sum(s.bonus_earned_inr for s in shifts)
    avg_eff = round(sum(s.efficiency_pct for s in shifts) / max(1, len(shifts)), 1)
    alerts = sum(1 for s in shifts if s.is_low_efficiency_alert)

    shift_reads = [
        ShiftLogRead(
            id=s.id,
            machine_number=s.machine_number,
            shift_type=s.shift_type,
            shift_date=s.shift_date,
            operator_name=s.operator_name,
            start_stitch_counter=s.start_stitch_counter,
            end_stitch_counter=s.end_stitch_counter,
            total_stitches=s.total_stitches,
            target_stitches=s.target_stitches,
            efficiency_pct=s.efficiency_pct,
            bonus_earned_inr=s.bonus_earned_inr,
            is_low_efficiency_alert=s.is_low_efficiency_alert,
            rpm_average=s.rpm_average,
            downtime_minutes=s.downtime_minutes,
            photo_url=s.photo_url,
            notes=s.notes,
            created_at=s.created_at
        ) for s in shifts
    ]

    return ShiftSummaryRead(
        date=target_date,
        total_machines_running=len(set(s.machine_number for s in shifts)),
        total_stitches_all_machines=total_stitches,
        average_efficiency_pct=avg_eff,
        total_bonuses_inr=round(total_bonus, 2),
        active_alerts_count=alerts,
        shifts=shift_reads
    )


# --- 7. PARTY LEDGER & TALLY PRIME EXPORT (v2.0) ---

@app.get("/api/parties", response_model=List[PartyRead])
def list_parties(session: Session = Depends(get_session)):
    """Lists all registered parties with active lot count."""
    parties = session.exec(select(Party).order_by(Party.name)).all()
    output = []
    for p in parties:
        inwards = session.exec(select(Challan).where(Challan.party_id == p.id, Challan.challan_type == ChallanType.INWARD)).all()
        output.append(
            PartyRead(
                id=p.id,
                name=p.name,
                phone=p.phone,
                city=p.city,
                active_lots_count=len(inwards),
                created_at=p.created_at
            )
        )
    return output


@app.get("/api/ledger/{party_id}", response_model=PartyLedgerRead)
def get_party_ledger(party_id: UUID, session: Session = Depends(get_session)):
    """
    Reconciles full Inward vs Outward statement for a party,
    calculates net billable ₹ amount, and generates 1-click WhatsApp Udhari URL.
    """
    party = session.get(Party, party_id)
    if not party:
        raise HTTPException(status_code=404, detail="વેપારી ખાતું મળ્યું નથી (Party not found)")

    inward_challans = session.exec(
        select(Challan).where(Challan.party_id == party.id, Challan.challan_type == ChallanType.INWARD).order_by(Challan.challan_date)
    ).all()

    total_inward = sum(c.total_quantity for c in inward_challans)
    total_fresh = 0.0
    total_returned_raw = 0.0
    total_kasar = 0.0
    total_fent = 0.0
    total_billable_amount = 0.0

    inward_records = []
    outward_records = []

    for inward in inward_challans:
        delivs = session.exec(select(LotDelivery).where(LotDelivery.inward_challan_id == inward.id)).all()
        rate = inward.agreed_rate if inward.agreed_rate > 0 else 42.0

        inward_records.append({
            "id": str(inward.id),
            "challan_number": inward.challan_number,
            "challan_date": str(inward.challan_date),
            "design_number": inward.design_number,
            "factory_punch_number": inward.factory_punch_number,
            "agreed_rate": inward.agreed_rate,
            "total_quantity": inward.total_quantity,
            "unit": inward.unit.value,
            "photo_url": inward.photo_url
        })

        for d in delivs:
            out_c = session.get(Challan, d.outward_challan_id)
            billable = round(d.fresh_quantity * rate, 2)
            total_fresh += d.fresh_quantity
            total_returned_raw += d.returned_raw_quantity
            total_kasar += d.kasar_quantity
            total_fent += d.fent_quantity
            total_billable_amount += billable

            outward_records.append({
                "outward_challan_number": out_c.challan_number if out_c else "N/A",
                "dispatch_date": str(d.dispatch_date),
                "design_number": inward.design_number,
                "factory_punch_number": inward.factory_punch_number,
                "fresh_quantity": d.fresh_quantity,
                "returned_raw_quantity": d.returned_raw_quantity,
                "kasar_quantity": d.kasar_quantity,
                "fent_quantity": d.fent_quantity,
                "unit": inward.unit.value,
                "billable_amount_inr": billable,
                "photo_url": out_c.photo_url if out_c else None
            })

    total_accounted = total_fresh + total_returned_raw + total_kasar + total_fent
    pending_balance = round(total_inward - total_accounted, 2)

    # WhatsApp Udhari prefilled polite message
    phone_digits = re.sub(r"\D", "", party.phone or "919825012345")
    polite_msg = (
        f"નમસ્તે {party.name}, ચલાન સેટલમેન્ટ મુજબ {int(total_fresh)} ફ્રેશ પીસ ચોખ્ખી કુલ બિલિંગ રકમ ₹{total_billable_amount:,.2f} થાય છે. "
        f"કાચો પરત: {int(total_returned_raw)} પીસ, કાસર: {int(total_kasar)} પીસ હિસાબમાં સમાયેલ છે. "
        f"ફોટો પ્રૂફ સાથે પૂરો હિસાબ જોવા કૃપા કરીને સંપર્ક કરો."
    )
    whatsapp_url = f"https://wa.me/{phone_digits}?text={urllib.parse.quote(polite_msg)}"

    summary = PartySummaryRead(
        total_inward_qty=round(total_inward, 1),
        total_billable_fresh_qty=round(total_fresh, 1),
        total_returned_raw_qty=round(total_returned_raw, 1),
        total_kasar_qty=round(total_kasar, 1),
        total_fent_qty=round(total_fent, 1),
        pending_balance_qty=pending_balance,
        total_billable_amount_inr=round(total_billable_amount, 2),
        settlement_status="COMPLETED" if pending_balance == 0 and total_inward > 0 else "PARTIALLY_DELIVERED"
    )

    return PartyLedgerRead(
        party_id=party.id,
        party_name=party.name,
        party_phone=party.phone,
        city=party.city,
        summary=summary,
        whatsapp_udhari_url=whatsapp_url,
        inward_challans=inward_records,
        outward_deliveries=outward_records
    )


@app.get("/api/ledger/{party_id}/export-tally")
def export_tally_csv(party_id: UUID, session: Session = Depends(get_session)):
    """Generates Tally Prime-compatible RFC 4180 CSV export."""
    party = session.get(Party, party_id)
    if not party:
        raise HTTPException(status_code=404, detail="વેપારી ખાતું મળ્યું નથી (Party not found)")

    inwards = session.exec(select(Challan).where(Challan.party_id == party.id, Challan.challan_type == ChallanType.INWARD)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Date", "Voucher Type", "Voucher No", "Party Ledger",
        "Design No", "Factory Punch No", "Unit", "Rate (INR)",
        "Fresh Qty", "Returned Raw Qty", "Kasar Qty", "Fent Qty",
        "Total Billable Amount (INR)", "Narration"
    ])

    for inward in inwards:
        delivs = session.exec(select(LotDelivery).where(LotDelivery.inward_challan_id == inward.id)).all()
        rate = inward.agreed_rate if inward.agreed_rate > 0 else 42.0

        for d in delivs:
            out_c = session.get(Challan, d.outward_challan_id)
            billable = round(d.fresh_quantity * rate, 2)
            writer.writerow([
                str(d.dispatch_date),
                "Delivery Note",
                out_c.challan_number if out_c else "N/A",
                party.name,
                inward.design_number,
                inward.factory_punch_number or "-",
                inward.unit.value,
                rate,
                d.fresh_quantity,
                d.returned_raw_quantity,
                d.kasar_quantity,
                d.fent_quantity,
                billable,
                f"Job-work delivery against Inward Challan {inward.challan_number}"
            ])

    output.seek(0)
    filename = f"{party.name.split()[0]}_Tally_Ledger_{date.today().isoformat()}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# --- 8. RE-SEED ENDPOINT ---

@app.post("/api/seed")
def trigger_seed_database():
    """Reseeds the database with realistic Surat/Ahmedabad test data."""
    seed_database()
    return {"success": True, "message": "Database reseeded successfully with Gujarat Embroidery v2.0 dataset"}
