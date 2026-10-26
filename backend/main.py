import os
import re
import csv
import io
import urllib.parse
from datetime import date, datetime, timezone, timedelta
from pathlib import Path
from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID, uuid4

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse, JSONResponse, Response
from sqlmodel import Session, select, func

from database import engine, get_session, init_db, DB_ENGINE_TYPE
from models import (
    Factory, User, UserRole, SubscriptionPlan, SubscriptionStatus,
    Party, Challan, ChallanType, UnitType, LotDelivery,
    MachineShift, ShiftType, RateQuote, MaterialType, LotStatus,
    ChallanCreate, ChallanRead, ChallanDetailRead,
    LotDispatchCreate, LotDispatchResponse, PendingLotRead,
    ShiftLogCreate, ShiftLogRead, ShiftSummaryRead,
    QuoteRequest, QuoteResponse,
    PartyRead, PartyLedgerRead, PartySummaryRead,
    DashboardSummaryRead, AIChallanOCRResponse, AIMessageResponse,
    KarigarAdvance, KarigarAdvanceCreate, KarigarAdvanceRead, KarigarSalaryRecordRead,
    DesignMasterRead, ConsumableStockRead, ConsumableToggleRequest,
    FactoryRegisterRequest, LoginRequest, UserRead, FactoryRead,
    AuthResponse, FactoryProfileUpdateRequest, DemoTenantInfo
)
from auth import (
    hash_password, verify_password,
    create_access_token, decode_access_token
)
import ai_service
from seed import seed_database

# Initialize FastAPI App
app = FastAPI(
    title="ChallanAI (EmbroideryOS) Multi-Tenant API",
    description="Multi-Tenant B2B SaaS Platform for Gujarat Textile Embroidery Factories",
    version="3.0.0"
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
    """Startup initialization: auto-creates tables and seeds multi-tenant initial data if empty."""
    init_db()
    with Session(engine) as session:
        first_factory = session.exec(select(Factory)).first()
        if not first_factory:
            print("[ChallanAI Startup] Database is empty. Seeding initial multi-tenant test data...")
            seed_database()


# --- MULTI-TENANT CONTEXT & DEPENDENCY ---

class TenantContext:
    """Holds active tenant Factory and User context for request scoping."""
    def __init__(self, factory: Factory, user: Optional[User] = None):
        self.factory = factory
        self.user = user
        self.factory_id = factory.id


def get_current_tenant(
    authorization: Optional[str] = Header(None),
    x_factory_id: Optional[str] = Header(None, alias="X-Factory-Id"),
    session: Session = Depends(get_session)
) -> TenantContext:
    """
    Resolves the active tenant Factory and User:
    1. Reads Bearer token from 'Authorization' header.
    2. Fallback to 'X-Factory-Id' header if passed directly.
    3. Safe default fallback to Tenant #1 (EMB-1001) for direct Swagger/test runs without headers.
    """
    # 1. Check Bearer Token
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
        payload = decode_access_token(token)
        if payload:
            factory_id_str = payload.get("factory_id")
            user_id_str = payload.get("user_id")
            if factory_id_str:
                try:
                    factory = session.get(Factory, UUID(factory_id_str))
                    if factory:
                        user = session.get(User, UUID(user_id_str)) if user_id_str else None
                        return TenantContext(factory=factory, user=user)
                except Exception:
                    pass

    # 2. Check X-Factory-Id Header
    if x_factory_id:
        try:
            factory = session.get(Factory, UUID(x_factory_id))
            if factory:
                user = session.exec(select(User).where(User.factory_id == factory.id)).first()
                return TenantContext(factory=factory, user=user)
        except Exception:
            pass

    # 3. Default fallback to Tenant #1 (EMB-1001) for backwards compatibility
    factory = session.exec(select(Factory).order_by(Factory.created_at.asc())).first()
    if factory:
        user = session.exec(select(User).where(User.factory_id == factory.id)).first()
        return TenantContext(factory=factory, user=user)

    raise HTTPException(
        status_code=401,
        detail="કોઈ સક્રિય કારખાનું મળ્યું નથી. કૃપા કરીને લોગિન કરો. (No active tenant found. Please log in.)"
    )


# --- ROOT & FAVICON ROUTES ---

@app.get("/")
def root():
    """Root endpoint welcoming users and providing direct links to API docs and endpoints."""
    return {
        "system": "ChallanAI (EmbroideryOS) Multi-Tenant API",
        "version": "3.0.0",
        "status": "ONLINE",
        "platform_type": "Multi-Tenant B2B SaaS",
        "cluster": "Gujarat Textile Hubs (Surat, Ahmedabad, Jetpur)",
        "database": DB_ENGINE_TYPE,
        "swagger_docs": "/docs",
        "redoc": "/redoc",
        "endpoints": {
            "health": "/api/health",
            "auth_login": "/api/auth/login",
            "auth_register": "/api/auth/register",
            "demo_tenants": "/api/auth/demo-tenants",
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
        "version": "3.0.0",
        "multi_tenant": True,
        "database_engine": DB_ENGINE_TYPE,
        "ai_service_mode": "GEMINI_2_5_FLASH" if ai_service.genai_client else "DETERMINISTIC_DEMO_PRESETS",
        "supported_languages": ["ગુજરાતી", "English"],
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# --- 2. MULTI-TENANT AUTH & TENANT REGISTRATION ---

@app.post("/api/auth/register", response_model=AuthResponse, status_code=201)
def register_factory(payload: FactoryRegisterRequest, session: Session = Depends(get_session)):
    """
    Self-registration endpoint for new embroidery factory owners.
    Creates a new isolated Factory Tenant (auto-generating EMB-XXXX code and 15-day trial),
    creates the Owner User Account (USR-XXXX), and returns stateless auth token.
    """
    # 1. Check if mobile number or login already registered
    existing_user = session.exec(select(User).where(User.login_id == payload.phone.strip())).first()
    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="આ મોબાઈલ નંબર સાથે પહેલેથી ખાતું નોંધાયેલ છે (Mobile number is already registered)"
        )

    # 2. Compute unique factory_code and user_code
    existing_factories_count = session.exec(select(func.count(Factory.id))).one() or 0
    code_index = 1001 + existing_factories_count
    factory_code = f"EMB-{code_index}"
    while session.exec(select(Factory).where(Factory.factory_code == factory_code)).first():
        code_index += 1
        factory_code = f"EMB-{code_index}"

    user_code = f"USR-{code_index}"

    now = datetime.now(timezone.utc)
    trial_end = now + timedelta(days=15)

    # 3. Create Factory Tenant
    new_factory = Factory(
        factory_code=factory_code,
        factory_name=payload.factory_name.strip(),
        owner_name=payload.owner_name.strip(),
        phone=payload.phone.strip(),
        city=payload.city.strip() if payload.city else "Surat",
        address=payload.address.strip() if payload.address else "Plot 45, Embroidery Park, Varachha Road, Surat",
        gstin=payload.gstin.strip() if payload.gstin else "24AAACS1234E1Z5",
        bank_name=payload.bank_name.strip() if payload.bank_name else "HDFC Bank (Varachha Branch)",
        bank_account_no=payload.bank_account_no.strip() if payload.bank_account_no else "50200089234120",
        bank_ifsc=payload.bank_ifsc.strip() if payload.bank_ifsc else "HDFC0001234",
        upi_id=payload.upi_id.strip() if payload.upi_id else "shreekrishna.embroidery@okaxis",
        default_machine_heads=20,
        subscription_plan=SubscriptionPlan.TRIAL_15_DAYS,
        subscription_status=SubscriptionStatus.ACTIVE,
        trial_ends_at=trial_end,
        created_at=now
    )
    session.add(new_factory)
    session.commit()
    session.refresh(new_factory)

    # 4. Create Owner User
    hashed = hash_password(payload.password.strip())
    new_user = User(
        user_code=user_code,
        factory_id=new_factory.id,
        login_id=payload.phone.strip(),
        password_hash=hashed,
        full_name=payload.owner_name.strip(),
        role=UserRole.OWNER,
        created_at=now
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)

    # 5. Optionally seed 1 starter party & lot for immediate onboarding gratification
    if payload.seed_starter_lot:
        starter_party = Party(
            factory_id=new_factory.id,
            name=f"Balaji Textiles ({new_factory.city})",
            phone="+91 98251 00000",
            city=new_factory.city
        )
        session.add(starter_party)
        session.commit()
        session.refresh(starter_party)

        starter_lot = Challan(
            factory_id=new_factory.id,
            challan_type=ChallanType.INWARD,
            party_id=starter_party.id,
            challan_number="BT-101",
            challan_date=date.today(),
            design_number="D-101",
            factory_punch_number="BP-01",
            agreed_rate=40.0,
            stitches_per_piece=25000,
            fabric_type="Fox Georgette",
            total_quantity=1000.0,
            unit=UnitType.PCS,
            notes="સ્વાગત લોટ - નવી કારખાનાની પ્રથમ એન્ટ્રી"
        )
        session.add(starter_lot)
        session.commit()

    user_role_str = new_user.role.value if hasattr(new_user.role, 'value') else str(new_user.role)
    token = create_access_token(new_user.id, new_factory.id, user_role_str)

    return AuthResponse(
        token=token,
        user=UserRead.model_validate(new_user, from_attributes=True),
        factory=FactoryRead.model_validate(new_factory, from_attributes=True),
        message="કારખાનું સફળતાપૂર્વક રજીસ્ટર થઈ ગયું! ૧૫ દિવસનો ફ્રી ટ્રાયલ શરૂ થઈ ગયો છે. (Factory registered! 15-day trial active.)"
    )


@app.post("/api/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest, session: Session = Depends(get_session)):
    """
    Authenticates user via Login ID (Mobile Number / User Code / Factory Code) and Password.
    Returns stateless JWT-style token, User profile, and isolated Factory details.
    """
    login_id = payload.login_id.strip()

    # 1. Match User by login_id or user_code
    user = session.exec(
        select(User).where((User.login_id == login_id) | (User.user_code == login_id))
    ).first()

    # 2. Or match by Factory Code or Factory Phone
    if not user:
        matched_factory = session.exec(
            select(Factory).where((Factory.factory_code == login_id) | (Factory.phone == login_id))
        ).first()
        if matched_factory:
            user = session.exec(
                select(User).where(User.factory_id == matched_factory.id, User.role == UserRole.OWNER)
            ).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="આ યુઝર આઈડી અથવા મોબાઈલ નંબર મળ્યો નથી (User ID or mobile not found)"
        )

    # 3. Verify Password
    if not verify_password(payload.password.strip(), user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="પાસવર્ડ ખોટો છે (Incorrect password)"
        )

    factory = session.get(Factory, user.factory_id)
    if not factory:
        raise HTTPException(status_code=404, detail="કારખાનું મળ્યું નથી (Factory not found)")

    user_role_str = user.role.value if hasattr(user.role, 'value') else str(user.role)
    token = create_access_token(user.id, factory.id, user_role_str)

    return AuthResponse(
        token=token,
        user=UserRead.model_validate(user, from_attributes=True),
        factory=FactoryRead.model_validate(factory, from_attributes=True),
        message=f"સ્વાગત છે {user.full_name}! {factory.factory_name} માં સફળતાપૂર્વક લોગિન થઈ ગયું."
    )


@app.get("/api/auth/me")
def get_me(tenant: TenantContext = Depends(get_current_tenant), session: Session = Depends(get_session)):
    """Returns the profile of the currently authenticated User and Factory tenant."""
    user = tenant.user
    if not user:
        user = session.exec(select(User).where(User.factory_id == tenant.factory.id)).first()

    days_left = 30
    if tenant.factory.trial_ends_at:
        now = datetime.now(timezone.utc)
        diff = (tenant.factory.trial_ends_at - now).days
        days_left = max(0, diff)

    return {
        "user": UserRead.model_validate(user, from_attributes=True) if user else None,
        "factory": FactoryRead.model_validate(tenant.factory, from_attributes=True),
        "days_remaining": days_left
    }


@app.put("/api/auth/factory-profile", response_model=FactoryRead)
def update_factory_profile(
    payload: FactoryProfileUpdateRequest,
    tenant: TenantContext = Depends(get_current_tenant),
    session: Session = Depends(get_session)
):
    """Allows logged-in factory owner to update their factory branding, GSTIN, bank, and UPI details."""
    factory = session.get(Factory, tenant.factory.id)
    if not factory:
        raise HTTPException(status_code=404, detail="Factory not found")

    if payload.factory_name is not None:
        factory.factory_name = payload.factory_name.strip()
    if payload.owner_name is not None:
        factory.owner_name = payload.owner_name.strip()
    if payload.phone is not None:
        factory.phone = payload.phone.strip()
    if payload.city is not None:
        factory.city = payload.city.strip()
    if payload.address is not None:
        factory.address = payload.address.strip()
    if payload.gstin is not None:
        factory.gstin = payload.gstin.strip()
    if payload.bank_name is not None:
        factory.bank_name = payload.bank_name.strip()
    if payload.bank_account_no is not None:
        factory.bank_account_no = payload.bank_account_no.strip()
    if payload.bank_ifsc is not None:
        factory.bank_ifsc = payload.bank_ifsc.strip()
    if payload.upi_id is not None:
        factory.upi_id = payload.upi_id.strip()
    if payload.default_machine_heads is not None:
        factory.default_machine_heads = payload.default_machine_heads
    if payload.subscription_plan is not None:
        factory.subscription_plan = payload.subscription_plan

    session.add(factory)
    session.commit()
    session.refresh(factory)
    return FactoryRead.model_validate(factory, from_attributes=True)


@app.get("/api/auth/demo-tenants", response_model=List[DemoTenantInfo])
def list_demo_tenants(session: Session = Depends(get_session)):
    """Returns pre-seeded demo accounts for 1-click instant tenant switching during investor/client demos."""
    factories = session.exec(select(Factory).order_by(Factory.factory_code.asc())).all()
    output = []
    for f in factories:
        primary_user = session.exec(select(User).where(User.factory_id == f.id)).first()
        login_id = primary_user.login_id if primary_user else f.phone
        if f.factory_code == "EMB-1001":
            desc = "સુરત ક્લસ્ટર - ૪ પાર્ટીઓ (રાધે, મારુતિ, શિવમ, ખોડિયાર), ૧૨૦૦ નંગ લોટ, ૪ મશીન શિફ્ટ"
        elif f.factory_code == "EMB-1002":
            desc = "અમદાવાદ ક્લસ્ટર - ૨ અલગ પાર્ટીઓ (બંસી એથનિક, કર્ણાવતી), સ્વતંત્ર ડેટા અને કોટક બેંક હિસાબ"
        else:
            desc = f"{f.city} ક્લસ્ટર - સ્વતંત્ર કારખાનું ટેનન્ટ ડેટા"

        output.append(
            DemoTenantInfo(
                factory_id=f.id,
                factory_code=f.factory_code,
                factory_name=f.factory_name,
                owner_name=f.owner_name,
                city=f.city,
                login_id=login_id,
                demo_password="123456",
                description=desc,
                subscription_plan=f.subscription_plan
            )
        )
    return output


# --- 3. DASHBOARD KPI SUMMARY (TENANT SCOPED) ---

@app.get("/api/dashboard/summary", response_model=DashboardSummaryRead)
def get_dashboard_summary(
    tenant: TenantContext = Depends(get_current_tenant),
    session: Session = Depends(get_session)
):
    """Computes top-level operational KPIs isolated to the active factory tenant."""
    inwards = session.exec(
        select(Challan).where(
            Challan.factory_id == tenant.factory_id,
            Challan.challan_type == ChallanType.INWARD
        )
    ).all()

    total_pending_pcs = 0.0
    total_pending_mtr = 0.0
    active_lots_count = 0
    estimated_pending_billing_inr = 0.0

    for inward in inwards:
        deliveries = session.exec(
            select(LotDelivery).where(
                LotDelivery.factory_id == tenant.factory_id,
                LotDelivery.inward_challan_id == inward.id
            )
        ).all()
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

    # Low efficiency shifts count for this factory
    low_shifts = session.exec(
        select(MachineShift).where(
            MachineShift.factory_id == tenant.factory_id,
            MachineShift.is_low_efficiency_alert == True
        )
    ).all()

    return DashboardSummaryRead(
        total_pending_pcs=round(total_pending_pcs, 1),
        total_pending_mtr=round(total_pending_mtr, 1),
        active_lots_count=active_lots_count,
        estimated_pending_billing_inr=round(estimated_pending_billing_inr, 2),
        low_shift_alerts_count=len(low_shifts),
        system_status="ONLINE",
        database_type=DB_ENGINE_TYPE
    )


# --- 3B. 1-CLICK DEMO RESET ENDPOINT ---

@app.post("/api/demo/reset")
def reset_demo_database():
    """
    1-Click Demo Reset: Wipes all temporary test records and cleanly
    reseeds the canonical v3.0 Gujarat EmbroideryOS multi-tenant dataset.
    """
    seed_database()
    return {
        "success": True,
        "message": "ડેમો ડેટા સફળતાપૂર્વક રીસેટ થઈ ગયો (Demo database successfully reset to v3.0 multi-tenant state)",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# --- 4. CHALLAN MANAGEMENT & DUPLICATE GUARD (TENANT SCOPED) ---

@app.post("/api/challans", response_model=ChallanRead, status_code=201)
def create_challan(
    payload: ChallanCreate,
    tenant: TenantContext = Depends(get_current_tenant),
    session: Session = Depends(get_session)
):
    """
    Creates an Inward or Outward Challan with Multi-Tenant Duplicate Challan Guard protection.
    Prevents duplicate slip numbers for the same party and challan type within this factory.
    """
    # 1. Resolve Party within this Factory
    party = None
    if payload.party_id:
        party = session.exec(
            select(Party).where(Party.id == payload.party_id, Party.factory_id == tenant.factory_id)
        ).first()
    elif payload.party_name:
        party = session.exec(
            select(Party).where(
                Party.factory_id == tenant.factory_id,
                Party.name.ilike(f"%{payload.party_name.strip()}%")
            )
        ).first()
        if not party:
            party = Party(
                factory_id=tenant.factory_id,
                name=payload.party_name.strip(),
                city=tenant.factory.city
            )
            session.add(party)
            session.commit()
            session.refresh(party)

    if not party:
        raise HTTPException(status_code=404, detail="વેપારી ખાતું મળ્યું નથી (Party not found or specified)")

    # 2. Multi-Tenant Duplicate Challan Guard (409 Conflict)
    duplicate = session.exec(
        select(Challan).where(
            Challan.factory_id == tenant.factory_id,
            Challan.party_id == party.id,
            Challan.challan_number == payload.challan_number.strip(),
            Challan.challan_type == payload.challan_type
        )
    ).first()

    if duplicate:
        raise HTTPException(
            status_code=409,
            detail=f"આ ચલણ નંબર '{payload.challan_number}' {party.name} માટે પહેલેથી જ નોંધાયેલ છે (Duplicate Challan Guard: Slip number already registered for this tenant)"
        )

    # 3. Create Challan
    new_challan = Challan(
        factory_id=tenant.factory_id,
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

    # 4. Auto-link OUTWARD challans to matching active INWARD lot within tenant
    if new_challan.challan_type == ChallanType.OUTWARD:
        fresh_qty = payload.fresh_quantity if payload.fresh_quantity is not None else payload.total_quantity
        raw_qty = payload.returned_raw_quantity or 0.0
        kasar_qty = payload.kasar_quantity or 0.0
        fent_qty = payload.fent_quantity or 0.0
        total_accounted_this = fresh_qty + raw_qty + kasar_qty + fent_qty

        inward_candidates = session.exec(
            select(Challan)
            .where(
                Challan.factory_id == tenant.factory_id,
                Challan.party_id == party.id,
                Challan.challan_type == ChallanType.INWARD,
                Challan.design_number.ilike(f"%{new_challan.design_number.strip()}%")
            )
            .order_by(Challan.challan_date.asc())
        ).all()

        target_inward = None
        for inv in inward_candidates:
            delivs = session.exec(
                select(LotDelivery).where(
                    LotDelivery.factory_id == tenant.factory_id,
                    LotDelivery.inward_challan_id == inv.id
                )
            ).all()
            accounted = sum(d.fresh_quantity + d.returned_raw_quantity + d.kasar_quantity + d.fent_quantity for d in delivs)
            if accounted < (inv.total_quantity * 1.02):
                target_inward = inv
                break

        if not target_inward and inward_candidates:
            target_inward = inward_candidates[0]

        if target_inward:
            delivs = session.exec(
                select(LotDelivery).where(
                    LotDelivery.factory_id == tenant.factory_id,
                    LotDelivery.inward_challan_id == target_inward.id
                )
            ).all()
            existing_accounted = sum(d.fresh_quantity + d.returned_raw_quantity + d.kasar_quantity + d.fent_quantity for d in delivs)
            if (existing_accounted + total_accounted_this) > (target_inward.total_quantity * 1.02):
                raise HTTPException(
                    status_code=422,
                    detail=f"જાવક જથ્થો આવક કરતા વધારે છે (102% Overdelivery Guard: Total {existing_accounted + total_accounted_this} exceeds inward {target_inward.total_quantity} by >2%)"
                )

            delivery = LotDelivery(
                factory_id=tenant.factory_id,
                inward_challan_id=target_inward.id,
                outward_challan_id=new_challan.id,
                fresh_quantity=fresh_qty,
                returned_raw_quantity=raw_qty,
                kasar_quantity=kasar_qty,
                fent_quantity=fent_qty,
                dispatch_date=new_challan.challan_date
            )
            session.add(delivery)
            session.commit()

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
    tenant: TenantContext = Depends(get_current_tenant),
    session: Session = Depends(get_session)
):
    """Lists challans strictly scoped to the authenticated factory tenant."""
    query = select(Challan).where(Challan.factory_id == tenant.factory_id)
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
def get_challan_detail(
    challan_id: UUID,
    tenant: TenantContext = Depends(get_current_tenant),
    session: Session = Depends(get_session)
):
    """Retrieves single challan with complete linked delivery audit trail."""
    challan = session.get(Challan, challan_id)
    if not challan or challan.factory_id != tenant.factory_id:
        raise HTTPException(status_code=404, detail="ચલણ મળ્યું નથી (Challan not found)")

    party = session.get(Party, challan.party_id)
    linked_deliveries = []

    if challan.challan_type == ChallanType.INWARD:
        delivs = session.exec(
            select(LotDelivery).where(
                LotDelivery.factory_id == tenant.factory_id,
                LotDelivery.inward_challan_id == challan.id
            )
        ).all()
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


# --- 5. LOT RECONCILIATION & PARTIAL OUTWARD DISPATCH (TENANT SCOPED) ---

@app.get("/api/lots/pending", response_model=List[PendingLotRead])
def list_pending_lots(
    tenant: TenantContext = Depends(get_current_tenant),
    session: Session = Depends(get_session)
):
    """
    Computes real-time lot balances and reconciliation progress for Tab 2.
    Strictly isolated to the authenticated factory tenant.
    """
    inwards = session.exec(
        select(Challan).where(
            Challan.factory_id == tenant.factory_id,
            Challan.challan_type == ChallanType.INWARD
        ).order_by(Challan.created_at.desc())
    ).all()

    output = []
    for inward in inwards:
        party = session.get(Party, inward.party_id)
        delivs = session.exec(
            select(LotDelivery).where(
                LotDelivery.factory_id == tenant.factory_id,
                LotDelivery.inward_challan_id == inward.id
            )
        ).all()

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
    tenant: TenantContext = Depends(get_current_tenant),
    session: Session = Depends(get_session)
):
    """
    Logs partial outward delivery against an inward lot with v2.0/v3.0 Overdelivery Guard.
    Accommodates Fresh Pieces, Returned Raw Fabric (unbilled), Kasar, and Fent.
    """
    inward = session.get(Challan, inward_id)
    if not inward or inward.factory_id != tenant.factory_id or inward.challan_type != ChallanType.INWARD:
        raise HTTPException(status_code=404, detail="આવક લોટ મળ્યો નથી (Inward lot record not found)")

    party = session.get(Party, inward.party_id)
    party_name = party.name if party else "Party"

    # Compute existing accounted quantity
    existing_delivs = session.exec(
        select(LotDelivery).where(
            LotDelivery.factory_id == tenant.factory_id,
            LotDelivery.inward_challan_id == inward.id
        )
    ).all()
    existing_accounted = sum(d.fresh_quantity + d.returned_raw_quantity + d.kasar_quantity + d.fent_quantity for d in existing_delivs)

    new_accounted = payload.fresh_quantity + payload.returned_raw_quantity + payload.kasar_quantity + payload.fent_quantity
    total_after = existing_accounted + new_accounted

    # Overdelivery Guard (allowing 2% meterage tolerance)
    if total_after > (inward.total_quantity * 1.02):
        raise HTTPException(
            status_code=400,
            detail=f"જાવક જથ્થો આવક કરતા વધારે છે (Overdelivery Guard: Total {total_after} exceeds inward {inward.total_quantity} by >2%)"
        )

    # Create Outward Challan
    outward_challan = Challan(
        factory_id=tenant.factory_id,
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
        factory_id=tenant.factory_id,
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

    # Format WhatsApp notification with sanitized phone
    whatsapp_msg = (
        f"નમસ્તે {party_name}, ચલણ નં {inward.challan_number} સામે જાવક ચલણ {payload.outward_challan_number} થી "
        f"{int(payload.fresh_quantity)} {inward.unit.value} ફ્રેશ"
    )
    if payload.returned_raw_quantity > 0:
        whatsapp_msg += f", {int(payload.returned_raw_quantity)} {inward.unit.value} કાચો માલ પરત"
    if payload.kasar_quantity > 0:
        whatsapp_msg += f", {int(payload.kasar_quantity)} {inward.unit.value} કાસર"
    whatsapp_msg += f" મોકલેલ છે (બિલિંગ રકમ: ₹{billable_this_dispatch:,.2f}). હવે બાકી માલ {new_pending} {inward.unit.value} રહ્યો છે."

    clean_party_phone = re.sub(r"\D", "", party.phone or "")
    if len(clean_party_phone) == 10:
        clean_party_phone = f"91{clean_party_phone}"
    elif not clean_party_phone:
        clean_party_phone = "919825012345"
    whatsapp_dispatch_url = f"https://wa.me/{clean_party_phone}?text={urllib.parse.quote(whatsapp_msg)}"

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
            "whatsapp_message": whatsapp_msg,
            "whatsapp_url": whatsapp_dispatch_url
        }
    )


# --- 6. AI VISION OCR & VERNACULAR NLP ---

@app.post("/api/ai/parse-challan-image", response_model=AIChallanOCRResponse)
async def parse_challan_image_endpoint(file: UploadFile = File(...)):
    """
    Accepts multipart paper challan image, saves to /uploads,
    and returns Gemini 2.5 Flash OCR structured data or instant demo preset.
    """
    file_bytes = await file.read()
    filename = file.filename or "uploaded_challan.jpg"

    save_path = UPLOAD_DIR / filename
    with open(save_path, "wb") as f:
        f.write(file_bytes)

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


# --- 7. STITCH COSTING & SHIFT TRACKER (TENANT SCOPED) ---

@app.post("/api/calculator/quote", response_model=QuoteResponse)
def calculate_stitch_quote(payload: QuoteRequest):
    """
    Computes machine batch runtime, pieces per shift, break-even cost,
    and target profit margin party quotation.
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
def log_machine_shift(
    payload: ShiftLogCreate,
    tenant: TenantContext = Depends(get_current_tenant),
    session: Session = Depends(get_session)
):
    """
    Logs 12-hour machine shift LCD counters, persists target efficiency,
    computes Karigar incentive bonus, and flags low-efficiency alert for this factory.
    """
    total = max(0, payload.end_stitch_counter - payload.start_stitch_counter)
    target = payload.target_stitches if payload.target_stitches > 0 else 400000
    eff = round((total / target) * 100, 2)
    excess = max(0, total - target)
    bonus = round((excess / 10000) * 15.0, 2)
    alert = eff < 70.0 or payload.downtime_minutes > 90

    shift = MachineShift(
        factory_id=tenant.factory_id,
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
    tenant: TenantContext = Depends(get_current_tenant),
    session: Session = Depends(get_session)
):
    """Retrieves machine shift comparison and bonus reports for a date, scoped to active factory."""
    target_date = shift_date or date.today()
    shifts = session.exec(
        select(MachineShift).where(
            MachineShift.factory_id == tenant.factory_id,
            MachineShift.shift_date == target_date
        ).order_by(MachineShift.machine_number)
    ).all()

    if not shifts:
        shifts = session.exec(
            select(MachineShift).where(
                MachineShift.factory_id == tenant.factory_id
            ).order_by(MachineShift.created_at.desc()).limit(10)
        ).all()

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


# --- 8. PARTY LEDGER & TALLY PRIME EXPORT (TENANT SCOPED) ---

@app.get("/api/parties", response_model=List[PartyRead])
def list_parties(
    tenant: TenantContext = Depends(get_current_tenant),
    session: Session = Depends(get_session)
):
    """Lists all registered parties with active lot count strictly scoped to the active tenant."""
    parties = session.exec(
        select(Party).where(Party.factory_id == tenant.factory_id).order_by(Party.name)
    ).all()
    output = []
    for p in parties:
        inwards = session.exec(
            select(Challan).where(
                Challan.factory_id == tenant.factory_id,
                Challan.party_id == p.id,
                Challan.challan_type == ChallanType.INWARD
            )
        ).all()
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
def get_party_ledger(
    party_id: UUID,
    tenant: TenantContext = Depends(get_current_tenant),
    session: Session = Depends(get_session)
):
    """
    Reconciles full Inward vs Outward statement for a party,
    calculates net billable ₹ amount, and returns active factory profile for dynamic A4 branding!
    """
    party = session.get(Party, party_id)
    if not party or party.factory_id != tenant.factory_id:
        raise HTTPException(status_code=404, detail="વેપારી ખાતું મળ્યું નથી (Party not found)")

    inward_challans = session.exec(
        select(Challan).where(
            Challan.factory_id == tenant.factory_id,
            Challan.party_id == party.id,
            Challan.challan_type == ChallanType.INWARD
        ).order_by(Challan.challan_date)
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
        delivs = session.exec(
            select(LotDelivery).where(
                LotDelivery.factory_id == tenant.factory_id,
                LotDelivery.inward_challan_id == inward.id
            )
        ).all()
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
    clean_party_phone = re.sub(r"\D", "", party.phone or "")
    if len(clean_party_phone) == 10:
        clean_party_phone = f"91{clean_party_phone}"
    elif not clean_party_phone:
        clean_party_phone = "919825012345"
    polite_msg = (
        f"નમસ્તે {party.name}, {tenant.factory.factory_name} ચલાન સેટલમેન્ટ મુજબ {int(total_fresh)} ફ્રેશ પીસ ચોખ્ખી કુલ બિલિંગ રકમ ₹{total_billable_amount:,.2f} થાય છે. "
        f"કાચો પરત: {int(total_returned_raw)} પીસ, કાસર: {int(total_kasar)} પીસ હિસાબમાં સમાયેલ છે. "
        f"ફોટો પ્રૂફ સાથે પૂરો હિસાબ જોવા કૃપા કરીને સંપર્ક કરો."
    )
    whatsapp_url = f"https://wa.me/{clean_party_phone}?text={urllib.parse.quote(polite_msg)}"

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

    # Dynamic tenant branding dictionary for Tab 4 & A4 print
    factory_profile_data = {
        "factory_code": tenant.factory.factory_code,
        "factory_name": tenant.factory.factory_name,
        "owner_name": tenant.factory.owner_name,
        "phone": tenant.factory.phone,
        "city": tenant.factory.city,
        "address": tenant.factory.address,
        "gstin": tenant.factory.gstin,
        "bank_name": tenant.factory.bank_name,
        "bank_account_no": tenant.factory.bank_account_no,
        "bank_ifsc": tenant.factory.bank_ifsc,
        "upi_id": tenant.factory.upi_id,
        "subscription_plan": tenant.factory.subscription_plan.value if hasattr(tenant.factory.subscription_plan, "value") else str(tenant.factory.subscription_plan)
    }

    return PartyLedgerRead(
        party_id=party.id,
        party_name=party.name,
        party_phone=party.phone,
        city=party.city,
        summary=summary,
        whatsapp_udhari_url=whatsapp_url,
        inward_challans=inward_records,
        outward_deliveries=outward_records,
        factory_profile=factory_profile_data
    )


@app.get("/api/ledger/{party_id}/export-tally")
def export_tally_csv(
    party_id: UUID,
    tenant: TenantContext = Depends(get_current_tenant),
    session: Session = Depends(get_session)
):
    """Generates Tally Prime-compatible RFC 4180 CSV export for active tenant."""
    party = session.get(Party, party_id)
    if not party or party.factory_id != tenant.factory_id:
        raise HTTPException(status_code=404, detail="વેપારી ખાતું મળ્યું નથી (Party not found)")

    inwards = session.exec(
        select(Challan).where(
            Challan.factory_id == tenant.factory_id,
            Challan.party_id == party.id,
            Challan.challan_type == ChallanType.INWARD
        )
    ).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Date", "Voucher Type", "Voucher No", "Party Ledger",
        "Design No", "Factory Punch No", "Unit", "Rate (INR)",
        "Fresh Qty", "Returned Raw Qty", "Kasar Qty", "Fent Qty",
        "Total Billable Amount (INR)", "Narration"
    ])

    for inward in inwards:
        delivs = session.exec(
            select(LotDelivery).where(
                LotDelivery.factory_id == tenant.factory_id,
                LotDelivery.inward_challan_id == inward.id
            )
        ).all()
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
                f"Job-work delivery against Inward Challan {inward.challan_number} [{tenant.factory.factory_name}]"
            ])

    output.seek(0)
    filename = f"{party.name.split()[0]}_Tally_Ledger_{date.today().isoformat()}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# --- 9. KARIGAR UPAAD & SALARY ENDPOINTS (TENANT SCOPED) ---

@app.get("/api/karigars/summary", response_model=List[KarigarSalaryRecordRead])
def get_karigars_summary(
    tenant: TenantContext = Depends(get_current_tenant),
    session: Session = Depends(get_session)
):
    """Computes Karigar shifts completed, stitch bonuses, total advances (upaad), and net payable salary for active tenant."""
    shifts = session.exec(
        select(MachineShift).where(MachineShift.factory_id == tenant.factory_id)
    ).all()
    advances = session.exec(
        select(KarigarAdvance).where(KarigarAdvance.factory_id == tenant.factory_id).order_by(KarigarAdvance.advance_date.desc())
    ).all()

    # Pre-populate known operators for Tenant 1 vs Tenant 2
    if tenant.factory.factory_code == "EMB-1002":
        karigar_map = {
            "Kishorbhai": {"shifts": 18, "bonus": 1400.0, "phone": "+91 98980 99887"}
        }
    else:
        karigar_map = {
            "Ramesh Karigar": {"shifts": 26, "bonus": 2450.0, "phone": "+91 98980 11223"},
            "Maheshbhai": {"shifts": 24, "bonus": 1800.0, "phone": "+91 98251 44556"},
            "Udinbhai": {"shifts": 25, "bonus": 2100.0, "phone": "+91 97120 77889"},
            "Bhaveshbhai": {"shifts": 22, "bonus": 1200.0, "phone": "+91 94265 99001"},
        }

    # Aggregate dynamically logged shifts for this factory
    for s in shifts:
        if s.operator_name in karigar_map:
            karigar_map[s.operator_name]["shifts"] += 1
            karigar_map[s.operator_name]["bonus"] += float(s.bonus_earned_inr)
        else:
            karigar_map[s.operator_name] = {
                "shifts": 1,
                "bonus": float(s.bonus_earned_inr),
                "phone": "+91 98000 00000"
            }

    base_shift_rate = 500.0  # ₹500 per 12-hr shift
    result = []

    for name, data in karigar_map.items():
        k_advances = [a for a in advances if name.lower() in a.karigar_name.lower() or a.karigar_name.lower() in name.lower()]
        total_upaad = sum(a.amount for a in k_advances)
        total_base = data["shifts"] * base_shift_rate
        gross = total_base + data["bonus"]
        net = gross - total_upaad

        result.append(KarigarSalaryRecordRead(
            karigar_name=name,
            phone=data.get("phone"),
            shifts_completed=data["shifts"],
            base_shift_pay_rate=base_shift_rate,
            total_base_pay=round(total_base, 2),
            total_stitch_bonus=round(data["bonus"], 2),
            total_gross_earnings=round(gross, 2),
            total_upaad=round(total_upaad, 2),
            net_payable_salary=round(net, 2),
            advances=[KarigarAdvanceRead(
                id=a.id,
                karigar_name=a.karigar_name,
                amount=a.amount,
                advance_date=a.advance_date,
                notes=a.notes
            ) for a in k_advances]
        ))

    return result


@app.post("/api/karigars/upaad", response_model=KarigarAdvanceRead)
def log_karigar_upaad(
    payload: KarigarAdvanceCreate,
    tenant: TenantContext = Depends(get_current_tenant),
    session: Session = Depends(get_session)
):
    """Logs a cash advance (upaad) taken by a machine operator inside this factory."""
    adv = KarigarAdvance(
        factory_id=tenant.factory_id,
        karigar_name=payload.karigar_name,
        amount=payload.amount,
        advance_date=payload.advance_date or date.today(),
        notes=payload.notes or "રોકડ ઉપાડ (Cash advance)"
    )
    session.add(adv)
    session.commit()
    session.refresh(adv)
    return KarigarAdvanceRead(
        id=adv.id,
        karigar_name=adv.karigar_name,
        amount=adv.amount,
        advance_date=adv.advance_date,
        notes=adv.notes
    )


# --- 10. DESIGN MASTER CATALOG & CONSUMABLES ---

STATIC_DESIGNS = [
    {
        "id": "des-1",
        "design_number": "D-1024",
        "factory_punch_number": "SK-45 .DST",
        "party_name": "Radhe Creation (સુરત)",
        "stitches": 28000,
        "fabric_type": "Fox Georgette",
        "thread_jari_type": "Gold Jari + 2-Ply Silk",
        "last_agreed_rate": 42.0,
        "category": "Kurti Front & Neck",
        "thumbnail_color": "from-amber-500 to-rose-500"
    },
    {
        "id": "des-2",
        "design_number": "D-402",
        "factory_punch_number": "MK-12 .DST",
        "party_name": "Maruti Embroidery (અમદાવાદ)",
        "stitches": 18500,
        "fabric_type": "Dola Silk",
        "thread_jari_type": "Viscose Rayon Thread",
        "last_agreed_rate": 32.0,
        "category": "Saree Border All-over",
        "thumbnail_color": "from-blue-500 to-indigo-600"
    },
    {
        "id": "des-3",
        "design_number": "D-8820",
        "factory_punch_number": "SH-88 .DST",
        "party_name": "Shivam Textiles (જેતપુર)",
        "stitches": 36000,
        "fabric_type": "Organza Tissue",
        "thread_jari_type": "Sequin 3mm + Antique Jari",
        "last_agreed_rate": 58.0,
        "category": "Heavy Bridal Lehenga",
        "thumbnail_color": "from-emerald-500 to-teal-600"
    },
    {
        "id": "des-4",
        "design_number": "D-5510",
        "factory_punch_number": "KD-05 .DST",
        "party_name": "Khodiyar Fashion (સુરત)",
        "stitches": 22000,
        "fabric_type": "Heavy Rayon 14kg",
        "thread_jari_type": "Matte Cotton Multi Thread",
        "last_agreed_rate": 36.0,
        "category": "Dupatta Buti Multi",
        "thumbnail_color": "from-purple-500 to-pink-500"
    },
    {
        "id": "des-5",
        "design_number": "D-304",
        "factory_punch_number": "SK-30 .DST",
        "party_name": "Radhe Creation (સુરત)",
        "stitches": 14000,
        "fabric_type": "Chanderi Cotton",
        "thread_jari_type": "Micro Multi Sequin + Resham",
        "last_agreed_rate": 24.0,
        "category": "Blouse Piece Motif",
        "thumbnail_color": "from-orange-500 to-amber-600"
    }
]

STATIC_CONSUMABLES = [
    {"id": "c-1", "key": "polyester", "name_gu": "પોલીએસ્ટર દોરા (Polyester Cones)", "name_en": "Polyester Thread Cones", "is_low_stock": False, "unit_gu": "કોન", "unit_en": "Cones"},
    {"id": "c-2", "key": "gold_jari", "name_gu": "ગોલ્ડ જરી (Gold Jari)", "name_en": "Gold Jari (Metallic)", "is_low_stock": True, "unit_gu": "રીલ", "unit_en": "Reels"},
    {"id": "c-3", "key": "bobbin", "name_gu": "બોબિન (Bobbin)", "name_en": "Bottom Bobbin Thread", "is_low_stock": False, "unit_gu": "બોક્સ", "unit_en": "Boxes"},
    {"id": "c-4", "key": "sequin", "name_gu": "સિક્વન્સ રોલ (Sequin Roll)", "name_en": "3mm Sequin Roll", "is_low_stock": False, "unit_gu": "રોલ", "unit_en": "Rolls"},
    {"id": "c-5", "key": "backing_paper", "name_gu": "ફોમ / પેપર (Backing Paper)", "name_en": "Hydro / Backing Paper", "is_low_stock": False, "unit_gu": "રોલ", "unit_en": "Rolls"}
]

@app.get("/api/designs", response_model=List[DesignMasterRead])
def get_design_catalog():
    """Returns embroidery master design catalog."""
    return STATIC_DESIGNS


@app.get("/api/consumables", response_model=List[ConsumableStockRead])
def get_consumables():
    """Returns real-time consumables inventory status."""
    return STATIC_CONSUMABLES


@app.post("/api/consumables/toggle", response_model=ConsumableStockRead)
def toggle_consumable_stock(payload: ConsumableToggleRequest):
    """Toggles low stock status for a consumable."""
    for item in STATIC_CONSUMABLES:
        if item["key"] == payload.key:
            item["is_low_stock"] = not item["is_low_stock"]
            return item
    raise HTTPException(status_code=404, detail="Consumable item not found")


# --- 11. RE-SEED ENDPOINT ---

@app.post("/api/seed")
def trigger_seed_database():
    """Reseeds the database with multi-tenant Surat and Ahmedabad test data."""
    seed_database()
    return {"success": True, "message": "Database reseeded successfully with Gujarat Embroidery v3.0 Multi-Tenant dataset"}
