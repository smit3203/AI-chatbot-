from datetime import datetime, date, timezone
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


# --- SQLMODEL TABLES ---

class Party(SQLModel, table=True):
    __tablename__ = "parties"

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    name: str = Field(index=True, max_length=255)
    phone: Optional[str] = Field(default=None, max_length=20)
    city: str = Field(default="Surat", max_length=100)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Relationships
    challans: List["Challan"] = Relationship(back_populates="party")


class Challan(SQLModel, table=True):
    __tablename__ = "challans"
    __table_args__ = (
        UniqueConstraint("party_id", "challan_number", "challan_type", name="uq_party_challan_type"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    challan_type: ChallanType = Field(index=True)
    party_id: UUID = Field(foreign_key="parties.id", index=True)
    challan_number: str = Field(index=True, max_length=100)
    challan_date: date = Field(default_factory=date.today)
    design_number: str = Field(index=True, max_length=100)
    
    # v2.0 Extensions: Punch Code, Agreed Job-Work Rate & Stitch Details
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
    party: Optional[Party] = Relationship(back_populates="challans")


class LotDelivery(SQLModel, table=True):
    __tablename__ = "lot_deliveries"

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    inward_challan_id: UUID = Field(foreign_key="challans.id", index=True)
    outward_challan_id: UUID = Field(foreign_key="challans.id", index=True)
    
    # v2.0 Extensions: Fresh, Returned Raw, Kasar, and Fent
    fresh_quantity: float = Field(default=0.0, ge=0)
    returned_raw_quantity: float = Field(default=0.0, ge=0)
    kasar_quantity: float = Field(default=0.0, ge=0)
    fent_quantity: float = Field(default=0.0, ge=0)
    
    dispatch_date: date = Field(default_factory=date.today)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MachineShift(SQLModel, table=True):
    __tablename__ = "machine_shifts"

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    machine_number: str = Field(index=True, max_length=50)
    shift_type: ShiftType = Field(default=ShiftType.DAY)
    shift_date: date = Field(default_factory=date.today)
    operator_name: str = Field(max_length=100)
    start_stitch_counter: int = Field(default=0, sa_column=Column(BigInteger, nullable=False, default=0))
    end_stitch_counter: int = Field(default=0, sa_column=Column(BigInteger, nullable=False, default=0))
    total_stitches: int = Field(default=0, sa_column=Column(BigInteger, nullable=False, default=0))
    
    # v2.0 Extensions: Persisted shift analytics and bonus
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

