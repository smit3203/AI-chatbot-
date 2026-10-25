const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// --- TYPES (MATCHING BACKEND MODELS EXACTLY) ---

export interface HealthStatus {
  status: string;
  system: string;
  version: string;
  database_engine: string;
  ai_service_mode: string;
  supported_languages: string[];
}

export interface DashboardSummary {
  total_pending_pcs: number;
  total_pending_mtr: number;
  active_lots_count: number;
  estimated_pending_billing_inr: number;
  low_shift_alerts_count: number;
  system_status: string;
  database_type: string;
}

export interface Party {
  id: string;
  name: string;
  phone?: string;
  city: string;
  active_lots_count: number;
  created_at?: string;
}

export interface Challan {
  id: string;
  challan_type: "INWARD" | "OUTWARD";
  party_id: string;
  party_name?: string;
  challan_number: string;
  challan_date: string;
  design_number: string;
  factory_punch_number?: string;
  agreed_rate: number;
  stitches_per_piece: number;
  fabric_type: string;
  total_quantity: number;
  unit: "PCS" | "MTR" | "TAKA";
  photo_url?: string;
  design_photo_url?: string;
  notes?: string;
}

export interface PendingLot {
  inward_challan_id: string;
  party_id: string;
  party_name: string;
  party_phone?: string;
  challan_number: string;
  challan_date: string;
  design_number: string;
  factory_punch_number?: string;
  agreed_rate: number;
  stitches_per_piece: number;
  fabric_type: string;
  unit: "PCS" | "MTR" | "TAKA";
  total_inward: number;
  total_fresh_delivered: number;
  total_returned_raw: number;
  total_kasar: number;
  total_fent: number;
  total_accounted: number;
  pending_balance: number;
  completion_percentage: number;
  billable_amount_inr: number;
  status: "RECEIVED" | "IN_PROGRESS" | "COMPLETED" | "OVERDELIVERED";
  photo_url?: string;
  design_photo_url?: string;
  delivery_count: number;
}

export interface LotDispatchPayload {
  outward_challan_number: string;
  fresh_quantity: number;
  returned_raw_quantity: number;
  kasar_quantity: number;
  fent_quantity: number;
  dispatch_date?: string;
  photo_url?: string;
  notes?: string;
}

export interface LotDispatchResult {
  success: boolean;
  message: string;
  data: {
    lot_id: string;
    outward_challan_id: string;
    total_inward: number;
    fresh_quantity: number;
    returned_raw_quantity: number;
    kasar_quantity: number;
    fent_quantity: number;
    total_accounted: number;
    pending_balance: number;
    billable_amount_inr: number;
    status: string;
    whatsapp_message: string;
  };
}

export interface ShiftLog {
  id: string;
  machine_number: string;
  shift_type: "DAY" | "NIGHT";
  shift_date: string;
  operator_name: string;
  start_stitch_counter: number;
  end_stitch_counter: number;
  total_stitches: number;
  target_stitches: number;
  efficiency_pct: number;
  bonus_earned_inr: number;
  is_low_efficiency_alert: boolean;
  rpm_average: number;
  downtime_minutes: number;
  photo_url?: string;
  notes?: string;
}

export interface ShiftSummary {
  date: string;
  total_machines_running: number;
  total_stitches_all_machines: number;
  average_efficiency_pct: number;
  total_bonuses_inr: number;
  active_alerts_count: number;
  shifts: ShiftLog[];
}

export interface QuoteRequest {
  stitch_count: number;
  machine_heads: number;
  rpm: number;
  efficiency_pct: number;
  shift_cost: number;
  material_type: "THREAD_ONLY" | "JARI_THREAD" | "SEQUIN_CORD" | "MULTI_HEAVY";
  material_cost_per_piece: number;
  target_profit_margin_pct: number;
}

export interface QuoteResult {
  batch_production_minutes: number;
  batches_per_shift: number;
  pieces_per_shift: number;
  machine_cost_per_piece: number;
  material_cost_per_piece: number;
  total_cost_per_piece: number;
  break_even_rate: number;
  recommended_quote_rate: number;
  profit_per_shift: number;
  currency: string;
}

export interface PartyLedger {
  party_id: string;
  party_name: string;
  party_phone?: string;
  city: string;
  summary: {
    total_inward_qty: number;
    total_billable_fresh_qty: number;
    total_returned_raw_qty: number;
    total_kasar_qty: number;
    total_fent_qty: number;
    pending_balance_qty: number;
    total_billable_amount_inr: number;
    settlement_status: string;
  };
  whatsapp_udhari_url: string;
  inward_challans: Array<{
    id: string;
    challan_number: string;
    challan_date: string;
    design_number: string;
    factory_punch_number?: string;
    agreed_rate: number;
    total_quantity: number;
    unit: string;
    photo_url?: string;
  }>;
  outward_deliveries: Array<{
    outward_challan_number: string;
    dispatch_date: string;
    design_number: string;
    factory_punch_number?: string;
    fresh_quantity: number;
    returned_raw_quantity: number;
    kasar_quantity: number;
    fent_quantity: number;
    unit: string;
    billable_amount_inr: number;
    photo_url?: string;
  }>;
}

export interface ExtractedChallanData {
  challan_type: "INWARD" | "OUTWARD";
  party_name: string;
  challan_number: string;
  challan_date: string;
  design_number: string;
  factory_punch_number?: string;
  agreed_rate: number;
  stitches_per_piece: number;
  fabric_type: string;
  quantity: number;
  unit: "PCS" | "MTR" | "TAKA";
  raw_gujarati_notes?: string;
  confidence_score: number;
  is_demo_fallback?: boolean;
  photo_url?: string;
}

export interface AIMessageResponse {
  intent: string;
  confidence: number;
  reply_gujarati: string;
  reply_english: string;
  extracted_data: Record<string, any>;
  action_type?: string;
  action_payload?: Record<string, any>;
}

// --- CLIENT-SIDE OFFLINE FALLBACK MOCK DATA ---

const MOCK_DASHBOARD: DashboardSummary = {
  total_pending_pcs: 1595.0,
  total_pending_mtr: 1920.0,
  active_lots_count: 4,
  estimated_pending_billing_inr: 108385.0,
  low_shift_alerts_count: 1,
  system_status: "ONLINE",
  database_type: "LOCAL_SQLITE",
};

const MOCK_PARTIES: Party[] = [
  { id: "p-1", name: "Radhe Creation (સુરત)", phone: "+91 98250 12345", city: "Surat", active_lots_count: 1 },
  { id: "p-2", name: "Maruti Embroidery (અમદાવાદ)", phone: "+91 98980 67890", city: "Ahmedabad", active_lots_count: 1 },
  { id: "p-3", name: "Shivam Textiles (જેતપુર)", phone: "+91 97123 45678", city: "Jetpur", active_lots_count: 1 },
  { id: "p-4", name: "Khodiyar Fashion (સુરત)", phone: "+91 94260 54321", city: "Surat", active_lots_count: 1 },
];

const MOCK_PENDING_LOTS: PendingLot[] = [
  {
    inward_challan_id: "c-1",
    party_id: "p-1",
    party_name: "Radhe Creation (સુરત)",
    party_phone: "+91 98250 12345",
    challan_number: "RC-1048",
    challan_date: "2026-10-24",
    design_number: "D-1024",
    factory_punch_number: "SK-45",
    agreed_rate: 42.0,
    stitches_per_piece: 28000,
    fabric_type: "Fox Georgette",
    unit: "PCS",
    total_inward: 1200.0,
    total_fresh_delivered: 400.0,
    total_returned_raw: 50.0,
    total_kasar: 20.0,
    total_fent: 10.0,
    total_accounted: 480.0,
    pending_balance: 720.0,
    completion_percentage: 40.0,
    billable_amount_inr: 16800.0,
    status: "IN_PROGRESS",
    delivery_count: 1,
  },
  {
    inward_challan_id: "c-2",
    party_id: "p-2",
    party_name: "Maruti Embroidery (અમદાવાદ)",
    party_phone: "+91 98980 67890",
    challan_number: "ME-802",
    challan_date: "2026-10-23",
    design_number: "D-402",
    factory_punch_number: "MR-12",
    agreed_rate: 35.0,
    stitches_per_piece: 22000,
    fabric_type: "Pure Silk",
    unit: "PCS",
    total_inward: 800.0,
    total_fresh_delivered: 500.0,
    total_returned_raw: 0.0,
    total_kasar: 25.0,
    total_fent: 0.0,
    total_accounted: 525.0,
    pending_balance: 275.0,
    completion_percentage: 65.6,
    billable_amount_inr: 17500.0,
    status: "IN_PROGRESS",
    delivery_count: 1,
  },
  {
    inward_challan_id: "c-3",
    party_id: "p-3",
    party_name: "Shivam Textiles (જેતપુર)",
    party_phone: "+91 97123 45678",
    challan_number: "ST-5501",
    challan_date: "2026-10-22",
    design_number: "D-8820",
    factory_punch_number: "SH-09",
    agreed_rate: 18.5,
    stitches_per_piece: 14000,
    fabric_type: "Rayon 14kg",
    unit: "MTR",
    total_inward: 3500.0,
    total_fresh_delivered: 1500.0,
    total_returned_raw: 0.0,
    total_kasar: 50.0,
    total_fent: 30.0,
    total_accounted: 1580.0,
    pending_balance: 1920.0,
    completion_percentage: 45.1,
    billable_amount_inr: 27750.0,
    status: "IN_PROGRESS",
    delivery_count: 1,
  },
  {
    inward_challan_id: "c-4",
    party_id: "p-4",
    party_name: "Khodiyar Fashion (સુરત)",
    party_phone: "+91 94260 54321",
    challan_number: "KF-309",
    challan_date: "2026-10-21",
    design_number: "D-701",
    factory_punch_number: "KF-77",
    agreed_rate: 55.0,
    stitches_per_piece: 34000,
    fabric_type: "Organza Tissue",
    unit: "PCS",
    total_inward: 600.0,
    total_fresh_delivered: 0.0,
    total_returned_raw: 0.0,
    total_kasar: 0.0,
    total_fent: 0.0,
    total_accounted: 0.0,
    pending_balance: 600.0,
    completion_percentage: 0.0,
    billable_amount_inr: 0.0,
    status: "RECEIVED",
    delivery_count: 0,
  },
];

const MOCK_SHIFTS: ShiftLog[] = [
  {
    id: "s-1",
    machine_number: "M-01",
    shift_type: "DAY",
    shift_date: "2026-10-24",
    operator_name: "Ramesh Karigar",
    start_stitch_counter: 14200000,
    end_stitch_counter: 14645000,
    total_stitches: 445000,
    target_stitches: 400000,
    efficiency_pct: 111.25,
    bonus_earned_inr: 67.50,
    is_low_efficiency_alert: false,
    rpm_average: 680,
    downtime_minutes: 25,
    notes: "દિવસ શિફ્ટ: ઉત્કૃષ્ટ ઉત્પાદન, ૪૫,૦૦૦ વધારાના ટાંકા",
  },
  {
    id: "s-2",
    machine_number: "M-02",
    shift_type: "DAY",
    shift_date: "2026-10-24",
    operator_name: "Dinesh Karigar",
    start_stitch_counter: 8500000,
    end_stitch_counter: 8760000,
    total_stitches: 260000,
    target_stitches: 400000,
    efficiency_pct: 65.0,
    bonus_earned_inr: 0.0,
    is_low_efficiency_alert: true,
    rpm_average: 580,
    downtime_minutes: 110,
    notes: "ચેતવણી: ૧૧૦ મિનિટ ડાઉનટાઇમ (લાઈટ ગઈ અને બોબિન કેસ જામ)",
  },
];

// --- API HELPER FUNCTIONS ---

export async function fetchHealth(): Promise<HealthStatus> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    if (!res.ok) throw new Error("Health check failed");
    return await res.json();
  } catch (err) {
    return {
      status: "ONLINE",
      system: "ChallanAI (EmbroideryOS)",
      version: "2.0.0",
      database_engine: "LOCAL_FALLBACK",
      ai_service_mode: "DETERMINISTIC_DEMO_PRESETS",
      supported_languages: ["ગુજરાતી", "English"],
    };
  }
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/dashboard/summary`);
    if (!res.ok) throw new Error("Dashboard fetch failed");
    return await res.json();
  } catch (err) {
    return MOCK_DASHBOARD;
  }
}

export async function fetchPendingLots(): Promise<PendingLot[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/lots/pending`);
    if (!res.ok) throw new Error("Pending lots fetch failed");
    return await res.json();
  } catch (err) {
    return MOCK_PENDING_LOTS;
  }
}

export async function dispatchLot(
  inwardId: string,
  payload: LotDispatchPayload
): Promise<LotDispatchResult> {
  const res = await fetch(`${API_BASE_URL}/api/lots/${inwardId}/dispatch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "જાવક નોંધવામાં ભૂલ આવી (Failed to record dispatch)");
  }

  return await res.json();
}

export async function createChallan(payload: Record<string, any>): Promise<Challan> {
  const res = await fetch(`${API_BASE_URL}/api/challans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "ચલણ સેવ કરવામાં ભૂલ આવી (Failed to create challan)");
  }

  return await res.json();
}

export async function uploadChallanImage(formData: FormData): Promise<ExtractedChallanData> {
  const res = await fetch(`${API_BASE_URL}/api/ai/parse-challan-image`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "ચલણ OCR પ્રોસેસિંગમાં ભૂલ આવી (Failed to parse challan image)");
  }

  const json = await res.json();
  return json.data;
}

export async function processVernacularMessage(message: string): Promise<AIMessageResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/ai/process-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) throw new Error("AI message parse failed");
    return await res.json();
  } catch (err) {
    return {
      intent: "GENERAL_HELP",
      confidence: 0.9,
      reply_gujarati: "નમસ્તે! હું ચલણAI મુનિમ છું. તમે ચલણનો ફોટો અપલોડ કરી શકો છો અથવા બાકી માલ પૂછી શકો છો.",
      reply_english: "Hello! I am ChallanAI Munim. You can upload a challan photo or query pending lots.",
      extracted_data: {},
    };
  }
}

export async function calculateStitchQuote(payload: QuoteRequest): Promise<QuoteResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/calculator/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Quote calculation failed");
    return await res.json();
  } catch (err) {
    const eff = payload.efficiency_pct / 100.0;
    const batchMins = payload.stitch_count / (payload.rpm * eff);
    const batches = 720.0 / batchMins;
    const pieces = batches * payload.machine_heads;
    const machineCost = payload.shift_cost / pieces;
    const totalCost = machineCost + payload.material_cost_per_piece;
    const quote = totalCost * (1.0 + payload.target_profit_margin_pct / 100.0);
    return {
      batch_production_minutes: Math.round(batchMins * 100) / 100,
      batches_per_shift: Math.round(batches * 100) / 100,
      pieces_per_shift: Math.round(pieces * 10) / 10,
      machine_cost_per_piece: Math.round(machineCost * 100) / 100,
      material_cost_per_piece: payload.material_cost_per_piece,
      total_cost_per_piece: Math.round(totalCost * 100) / 100,
      break_even_rate: Math.round(totalCost * 100) / 100,
      recommended_quote_rate: Math.round(quote * 100) / 100,
      profit_per_shift: Math.round(pieces * (quote - totalCost) * 100) / 100,
      currency: "INR (₹)",
    };
  }
}

export async function fetchShiftsSummary(dateStr?: string): Promise<ShiftSummary> {
  try {
    const url = dateStr ? `${API_BASE_URL}/api/shifts/summary?date=${dateStr}` : `${API_BASE_URL}/api/shifts/summary`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Shifts summary failed");
    return await res.json();
  } catch (err) {
    return {
      date: dateStr || "2026-10-24",
      total_machines_running: 2,
      total_stitches_all_machines: 705000,
      average_efficiency_pct: 88.1,
      total_bonuses_inr: 67.50,
      active_alerts_count: 1,
      shifts: MOCK_SHIFTS,
    };
  }
}

export async function logShift(payload: Record<string, any>): Promise<ShiftLog> {
  const res = await fetch(`${API_BASE_URL}/api/shifts/log`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "શિફ્ટ લોગ કરવામાં ભૂલ આવી (Failed to log shift)");
  }

  return await res.json();
}

export async function fetchParties(): Promise<Party[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/parties`);
    if (!res.ok) throw new Error("Parties fetch failed");
    return await res.json();
  } catch (err) {
    return MOCK_PARTIES;
  }
}

export async function fetchPartyLedger(partyId: string): Promise<PartyLedger> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/ledger/${partyId}`);
    if (!res.ok) throw new Error("Party ledger failed");
    return await res.json();
  } catch (err) {
    const party = MOCK_PARTIES.find((p) => p.id === partyId) || MOCK_PARTIES[0];
    const encodedMsg = encodeURIComponent(
      `નમસ્તે ${party.name}, ચલાન સેટલમેન્ટ મુજબ 400 ફ્રેશ પીસ ચોખ્ખી કુલ બિલિંગ રકમ ₹16,800.00 થાય છે.`
    );
    return {
      party_id: party.id,
      party_name: party.name,
      party_phone: party.phone,
      city: party.city,
      summary: {
        total_inward_qty: 1200.0,
        total_billable_fresh_qty: 400.0,
        total_returned_raw_qty: 50.0,
        total_kasar_qty: 20.0,
        total_fent_qty: 10.0,
        pending_balance_qty: 720.0,
        total_billable_amount_inr: 16800.0,
        settlement_status: "PARTIALLY_DELIVERED",
      },
      whatsapp_udhari_url: `https://wa.me/919825012345?text=${encodedMsg}`,
      inward_challans: [
        {
          id: "c-1",
          challan_number: "RC-1048",
          challan_date: "2026-10-24",
          design_number: "D-1024",
          factory_punch_number: "SK-45",
          agreed_rate: 42.0,
          total_quantity: 1200.0,
          unit: "PCS",
        },
      ],
      outward_deliveries: [
        {
          outward_challan_number: "JW-405",
          dispatch_date: "2026-10-24",
          design_number: "D-1024",
          factory_punch_number: "SK-45",
          fresh_quantity: 400.0,
          returned_raw_quantity: 50.0,
          kasar_quantity: 20.0,
          fent_quantity: 10.0,
          unit: "PCS",
          billable_amount_inr: 16800.0,
        },
      ],
    };
  }
}

export function getTallyExportUrl(partyId: string): string {
  return `${API_BASE_URL}/api/ledger/${partyId}/export-tally`;
}
