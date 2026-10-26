from datetime import datetime, date, timezone, timedelta
from enum import Enum
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import UniqueConstraint, Column, BigInteger
from pydantic import BaseModel, Field as PydanticField

# --- ENUMS ---
class ChallanType(str, Enum):
    INWARD = "INWARD"
    OUTWARD = "OUTWARD"

class UnitType(str, Enum):
    PCS = "PCS"
    MTR = "MTR"
    TAKA = "TAKA"

class ShiftType(str, Enum):
    DAY = "DAY"
    NIGHT = "NIGHT"

class MaterialType(str, Enum):
    THREAD_ONLY = "THREAD_ONLY"
    JARI_THREAD = "JARI_THREAD"
    SEQUIN_CORD = "SEQUIN_CORD"
    MULTI_HEAVY = "MULTI_HEAVY"

class LotStatus(str, Enum):
    RECEIVED = "RECEIVED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    OVERDELIVERED = "OVERDELIVERED"

class SubscriptionPlan(str, Enum):
    TRIAL_15_DAYS = "TRIAL_15_DAYS"
    PRO_MONTHLY_1500 = "PRO_MONTHLY_1500"
    PRO_YEARLY_15000 = "PRO_YEARLY_15000"

class SubscriptionStatus(str, Enum):
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"

class UserRole(str, Enum):
    OWNER = "OWNER"
    SUPERVISOR = "SUPERVISOR"
    ACCOUNTANT = "ACCOUNTANT"


# --- v3.0 MULTI-TENANT CORE TABLES ---

class Factory(SQLModel, table=True):
    __tablename__ = "factories"

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    factory_code: str = Field(unique=True, index=True, max_length=50) # e.g. "EMB-1001"
    factory_name: str = Field(nullable=False, max_length=255)
    owner_name: str = Field(nullable=False, max_length=255)
    phone: str = Field(unique=True, index=True, max_length=20)
    city: str = Field(default="Surat", max_length=100)
    address: str = Field(default="Plot 45, Embroidery Park, Varachha Road, Surat", max_length=500)
    gstin: str = Field(default="24AAACS1234E1Z5", max_length=50)
    bank_name: str = Field(default="HDFC Bank (Varachha Branch)", max_length=200)
    bank_account_no: str = Field(default="50200089234120", max_length=100)
    bank_ifsc: str = Field(default="HDFC0001234", max_length=50)
    upi_id: str = Field(default="shreekrishna.embroidery@okaxis", max_length=100)
    default_machine_heads: int = Field(default=20)
    subscription_plan: str = Field(default="TRIAL_15_DAYS", max_length=50) # "TRIAL_15_DAYS", "PRO_MONTHLY_1500", "PRO_YEARLY_15000"
    subscription_status: str = Field(default="ACTIVE", max_length=50) # "ACTIVE", "EXPIRED"
    trial_ends_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc) + timedelta(days=15))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Relationships
    users: List["User"] = Relationship(back_populates="factory")
    parties: List["Party"] = Relationship(back_populates="factory")
    challans: List["Challan"] = Relationship(back_populates="factory")


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    user_code: str = Field(unique=True, index=True, max_length=50) # e.g. "USR-1001"
    factory_id: UUID = Field(foreign_key="factories.id", index=True, nullable=False)
    login_id: str = Field(unique=True, index=True, max_length=100) # phone or custom login ID
    password_hash: str = Field(max_length=255)
    full_name: str = Field(nullable=False, max_length=255)
    role: str = Field(default="OWNER", max_length=50) # "OWNER", "SUPERVISOR", "ACCOUNTANT"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Relationships
    factory: Optional[Factory] = Relationship(back_populates="users")


# --- OPERATIONAL TABLES (SCOPED BY factory_id) ---

class Party(SQLModel, table=True):
    __tablename__ = "parties"

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    factory_id: UUID = Field(foreign_key="factories.id", index=True, nullable=False)
    name: str = Field(index=True, max_length=255)
    phone: Optional[str] = Field(default=None, max_length=20)
    city: str = Field(default="Surat", max_length=100)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Relationships
    factory: Optional[Factory] = Relationship(back_populates="parties")
    challans: List["Challan"] = Relationship(back_populates="party")


class Challan(SQLModel, table=True):
    __tablename__ = "challans"
    __table_args__ = (
        UniqueConstraint("factory_id", "party_id", "challan_number", "challan_type", name="uq_factory_party_challan_type"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    factory_id: UUID = Field(foreign_key="factories.id", index=True, nullable=False)
    challan_type: ChallanType = Field(index=True)
    party_id: UUID = Field(foreign_key="parties.id", index=True)
    challan_number: str = Field(index=True, max_length=100)
    challan_date: date = Field(default_factory=date.today)
    design_number: str = Field(index=True, max_length=100)
    
    # Punch Code, Agreed Job-Work Rate & Stitch Details
    factory_punch_number: Optional[str] = Field(default=None, max_length=100)
    agreed_rate: float = Field(default=0.0)
    stitches_per_piece: int = Field(default=0)
    design_photo_url: Optional[str] = Field(default=None, max_length=500)
    
    fabric_type: str = Field(default="Fox Georgette", max_length=100)
    total_quantity: float = Field(gt=0)
    unit: UnitType = Field(default=UnitType.PCS)
    photo_url: Optional[str] = Field(default=None, max_length=500)
    notes: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Relationships
    factory: Optional[Factory] = Relationship(back_populates="challans")
    party: Optional[Party] = Relationship(back_populates="challans")


class LotDelivery(SQLModel, table=True):
    __tablename__ = "lot_deliveries"

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    factory_id: UUID = Field(foreign_key="factories.id", index=True, nullable=False)
    inward_challan_id: UUID = Field(foreign_key="challans.id", index=True)
    outward_challan_id: UUID = Field(foreign_key="challans.id", index=True)
    
    # Fresh, Returned Raw, Kasar, and Fent
    fresh_quantity: float = Field(default=0.0, ge=0)
    returned_raw_quantity: float = Field(default=0.0, ge=0)
    kasar_quantity: float = Field(default=0.0, ge=0)
    fent_quantity: float = Field(default=0.0, ge=0)
    
    dispatch_date: date = Field(default_factory=date.today)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MachineShift(SQLModel, table=True):
    __tablename__ = "machine_shifts"

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    factory_id: UUID = Field(foreign_key="factories.id", index=True, nullable=False)
    machine_number: str = Field(index=True, max_length=50)
    shift_type: ShiftType = Field(default=ShiftType.DAY)
    shift_date: date = Field(default_factory=date.today)
    operator_name: str = Field(max_length=100)
    start_stitch_counter: int = Field(default=0, sa_column=Column(BigInteger, nullable=False, default=0))
    end_stitch_counter: int = Field(default=0, sa_column=Column(BigInteger, nullable=False, default=0))
    total_stitches: int = Field(default=0, sa_column=Column(BigInteger, nullable=False, default=0))
    
    # Persisted shift analytics and bonus
    target_stitches: int = Field(default=400000, sa_column=Column(BigInteger, nullable=False, default=400000))
    efficiency_pct: float = Field(default=0.0)
    bonus_earned_inr: float = Field(default=0.0)
    is_low_efficiency_alert: bool = Field(default=False)
    
    rpm_average: int = Field(default=650)
    downtime_minutes: int = Field(default=0)
    photo_url: Optional[str] = Field(default=None, max_length=500)
    notes: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RateQuote(SQLModel, table=True):
    __tablename__ = "rate_quotes"

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    factory_id: UUID = Field(foreign_key="factories.id", index=True, nullable=False)
    party_id: Optional[UUID] = Field(default=None, foreign_key="parties.id")
    design_number: str = Field(max_length=100)
    stitch_count: int = Field(gt=0)
    machine_heads: int = Field(default=20)
    material_type: MaterialType = Field(default=MaterialType.JARI_THREAD)
    cost_per_piece: float = Field(default=0.0)
    quoted_rate: float = Field(default=0.0)
    profit_margin_pct: float = Field(default=25.0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# --- PYDANTIC SCHEMAS (REQUEST / RESPONSE) ---

# Challan Schemas
class ChallanCreate(BaseModel):
    factory_id: Optional[UUID] = None
    challan_type: ChallanType
    party_id: Optional[UUID] = None
    party_name: Optional[str] = None
    challan_number: str
    challan_date: Optional[date] = None
    design_number: str
    factory_punch_number: Optional[str] = None
    agreed_rate: float = 0.0
    stitches_per_piece: int = 0
    fabric_type: str = "Fox Georgette"
    total_quantity: float
    unit: UnitType = UnitType.PCS
    fresh_quantity: Optional[float] = None
    returned_raw_quantity: Optional[float] = None
    kasar_quantity: Optional[float] = None
    fent_quantity: Optional[float] = None
    photo_url: Optional[str] = None
    design_photo_url: Optional[str] = None
    notes: Optional[str] = None

class ChallanRead(BaseModel):
    id: UUID
    factory_id: Optional[UUID] = None
    challan_type: ChallanType
    party_id: UUID
    party_name: Optional[str] = None
    challan_number: str
    challan_date: date
    design_number: str
    factory_punch_number: Optional[str] = None
    agreed_rate: float = 0.0
    stitches_per_piece: int = 0
    fabric_type: str
    total_quantity: float
    unit: UnitType
    photo_url: Optional[str] = None
    design_photo_url: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

class ChallanDetailRead(ChallanRead):
    linked_deliveries: List[Dict[str, Any]] = []

# Lot & Dispatch Schemas
class LotDispatchCreate(BaseModel):
    outward_challan_number: str
    fresh_quantity: float = 0.0
    returned_raw_quantity: float = 0.0
    kasar_quantity: float = 0.0
    fent_quantity: float = 0.0
    dispatch_date: Optional[date] = None
    photo_url: Optional[str] = None
    notes: Optional[str] = None

class LotDispatchResponse(BaseModel):
    success: bool
    message: str
    data: Dict[str, Any]

class PendingLotRead(BaseModel):
    inward_challan_id: UUID
    party_id: UUID
    party_name: str
    party_phone: Optional[str] = None
    challan_number: str
    challan_date: date
    design_number: str
    factory_punch_number: Optional[str] = None
    agreed_rate: float = 0.0
    stitches_per_piece: int = 0
    fabric_type: str
    unit: UnitType
    total_inward: float
    total_fresh_delivered: float
    total_returned_raw: float
    total_kasar: float
    total_fent: float
    total_accounted: float
    pending_balance: float
    completion_percentage: float
    billable_amount_inr: float
    status: LotStatus
    photo_url: Optional[str] = None
    design_photo_url: Optional[str] = None
    delivery_count: int = 0

# Machine Shift Schemas
class ShiftLogCreate(BaseModel):
    factory_id: Optional[UUID] = None
    machine_number: str
    shift_type: ShiftType = ShiftType.DAY
    shift_date: Optional[date] = None
    operator_name: str
    start_stitch_counter: int
    end_stitch_counter: int
    target_stitches: int = 400000
    rpm_average: int = 650
    downtime_minutes: int = 0
    photo_url: Optional[str] = None
    notes: Optional[str] = None

class ShiftLogRead(BaseModel):
    id: UUID
    factory_id: Optional[UUID] = None
    machine_number: str
    shift_type: ShiftType
    shift_date: date
    operator_name: str
    start_stitch_counter: int
    end_stitch_counter: int
    total_stitches: int
    target_stitches: int
    efficiency_pct: float
    bonus_earned_inr: float
    is_low_efficiency_alert: bool
    rpm_average: int
    downtime_minutes: int
    photo_url: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

class ShiftSummaryRead(BaseModel):
    date: date
    total_machines_running: int
    total_stitches_all_machines: int
    average_efficiency_pct: float
    total_bonuses_inr: float
    active_alerts_count: int
    shifts: List[ShiftLogRead]

# Calculator & Quote Schemas
class QuoteRequest(BaseModel):
    stitch_count: int
    machine_heads: int = 20
    rpm: int = 650
    efficiency_pct: float = 80.0
    shift_cost: float = 2200.0
    material_type: MaterialType = MaterialType.JARI_THREAD
    material_cost_per_piece: float = 8.50
    target_profit_margin_pct: float = 25.0

class QuoteResponse(BaseModel):
    batch_production_minutes: float
    batches_per_shift: float
    pieces_per_shift: float
    machine_cost_per_piece: float
    material_cost_per_piece: float
    total_cost_per_piece: float
    break_even_rate: float
    recommended_quote_rate: float
    profit_per_shift: float
    currency: str = "INR (₹)"

# Party & Ledger Schemas
class PartyRead(BaseModel):
    id: UUID
    name: str
    phone: Optional[str] = None
    city: str
    active_lots_count: int = 0
    created_at: datetime

class PartySummaryRead(BaseModel):
    total_inward_qty: float
    total_billable_fresh_qty: float
    total_returned_raw_qty: float
    total_kasar_qty: float
    total_fent_qty: float
    pending_balance_qty: float
    total_billable_amount_inr: float
    settlement_status: str

class PartyLedgerRead(BaseModel):
    party_id: UUID
    party_name: str
    party_phone: Optional[str] = None
    city: str
    summary: PartySummaryRead
    whatsapp_udhari_url: str
    inward_challans: List[Dict[str, Any]]
    outward_deliveries: List[Dict[str, Any]]
    factory_profile: Optional[Dict[str, Any]] = None

class FactoryRegisterRequest(BaseModel):
    factory_name: str
    owner_name: str
    phone: str
    password: str
    login_id: Optional[str] = None
    city: Optional[str] = "Surat"
    address: Optional[str] = "Plot 45, Embroidery Park, Varachha Road, Surat"
    gstin: Optional[str] = "24AAACS1234E1Z5"
    bank_name: Optional[str] = "HDFC Bank (Varachha Branch)"
    bank_account_no: Optional[str] = "50200089234120"
    bank_ifsc: Optional[str] = "HDFC0001234"
    upi_id: Optional[str] = "shreekrishna.embroidery@okaxis"
    default_machine_heads: Optional[int] = 20
    seed_starter_lot: bool = True
    seed_sample_data: bool = True

class LoginRequest(BaseModel):
    login_id: str
    password: str

class UserRead(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    user_code: str
    factory_id: UUID
    login_id: str
    full_name: str
    role: str
    created_at: datetime

class FactoryRead(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    factory_code: str
    factory_name: str
    owner_name: str
    phone: str
    city: str
    address: str
    gstin: str
    bank_name: str
    bank_account_no: str
    bank_ifsc: str
    upi_id: str
    default_machine_heads: int
    subscription_plan: str
    subscription_status: str
    trial_ends_at: datetime
    days_remaining: int = 15

class AuthResponse(BaseModel):
    token: str
    user: UserRead
    factory: FactoryRead
    message: str

class FactoryProfileUpdateRequest(BaseModel):
    factory_name: Optional[str] = None
    owner_name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_no: Optional[str] = None
    bank_ifsc: Optional[str] = None
    upi_id: Optional[str] = None
    default_machine_heads: Optional[int] = None
    subscription_plan: Optional[str] = None

class DemoTenantInfo(BaseModel):
    factory_id: Optional[UUID] = None
    factory_code: str
    factory_name: str
    owner_name: str
    city: str
    login_id: str
    role: str = "OWNER"
    demo_password: str = "123456"
    description: str = ""
    subscription_plan: Optional[str] = "PRO_MONTHLY_1500"

# Dashboard Summary Schema
class DashboardSummaryRead(BaseModel):
    total_pending_pcs: float
    total_pending_mtr: float
    active_lots_count: int
    estimated_pending_billing_inr: float
    low_shift_alerts_count: int
    system_status: str
    database_type: str

# AI OCR & Vernacular Schemas
class AIChallanOCRResponse(BaseModel):
    success: bool
    data: Dict[str, Any]

class AIMessageResponse(BaseModel):
    intent: str
    confidence: float
    reply_gujarati: str
    reply_english: str
    extracted_data: Dict[str, Any]
    action_type: Optional[str] = None
    action_payload: Optional[Dict[str, Any]] = None


# --- ADD-ON SECTION MODELS (KARIGAR UPAAD, DESIGN CATALOG & CONSUMABLES) ---

class KarigarAdvance(SQLModel, table=True):
    __tablename__ = "karigar_advances"

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    factory_id: Optional[UUID] = Field(default=None, foreign_key="factories.id", index=True)
    karigar_name: str = Field(index=True, max_length=100)
    amount: float = Field(gt=0)
    advance_date: date = Field(default_factory=date.today)
    notes: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class KarigarAdvanceCreate(BaseModel):
    karigar_name: str
    amount: float
    advance_date: Optional[date] = None
    notes: Optional[str] = None


class KarigarAdvanceRead(BaseModel):
    id: UUID
    karigar_name: str
    amount: float
    advance_date: date
    notes: Optional[str] = None


class KarigarSalaryRecordRead(BaseModel):
    karigar_name: str
    phone: Optional[str] = None
    shifts_completed: int
    base_shift_pay_rate: float
    total_base_pay: float
    total_stitch_bonus: float
    total_gross_earnings: float
    total_upaad: float
    net_payable_salary: float
    advances: List[KarigarAdvanceRead]


class DesignMasterRead(BaseModel):
    id: str
    design_number: str
    factory_punch_number: str
    party_name: str
    stitches: int
    fabric_type: str
    thread_jari_type: str
    last_agreed_rate: float
    category: str
    thumbnail_color: str


class ConsumableStockRead(BaseModel):
    id: str
    key: str
    name_gu: str
    name_en: str
    is_low_stock: bool
    unit_gu: str
    unit_en: str


class ConsumableToggleRequest(BaseModel):
    key: str

