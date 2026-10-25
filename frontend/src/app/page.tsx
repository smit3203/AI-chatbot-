"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Camera,
  Send,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Printer,
  Download,
  Share2,
  Package,
  Layers,
  Calculator,
  Clock,
  Search,
  Plus,
  Eye,
  X,
  Phone,
  Building,
  User,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Sparkles,
} from "lucide-react";

import {
  translations,
  Language,
} from "@/lib/translations";

import {
  HealthStatus,
  DashboardSummary,
  Party,
  PendingLot,
  ShiftLog,
  ShiftSummary,
  QuoteRequest,
  QuoteResult,
  PartyLedger,
  ExtractedChallanData,
  fetchHealth,
  fetchDashboardSummary,
  fetchPendingLots,
  dispatchLot,
  createChallan,
  uploadChallanImage,
  processVernacularMessage,
  calculateStitchQuote,
  fetchShiftsSummary,
  logShift,
  fetchParties,
  fetchPartyLedger,
  getTallyExportUrl,
} from "@/lib/api";

export default function Home() {
  // --- GLOBAL STATE ---
  const [lang, setLang] = useState<Language>("gu");
  const [activeTab, setActiveTab] = useState<"bot" | "pending" | "calculator" | "ledger">("bot");
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);

  // Active language dictionary
  const t = translations[lang];

  // Auto-dismiss toast
  const showToast = (msg: string, type: "success" | "error" | "info" = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Initial Data Fetch
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [hData, dData] = await Promise.all([
        fetchHealth(),
        fetchDashboardSummary(),
      ]);
      setHealth(hData);
      setDashboard(dData);
    } catch (e) {
      console.warn("Using offline fallback:", e);
    }
  };

  // -------------------------------------------------------------
  // TAB 1: WHATSAPP BOT STATE
  // -------------------------------------------------------------
  const [messages, setMessages] = useState<
    Array<{ sender: "user" | "bot"; text: string; time: string; ocrData?: ExtractedChallanData }>
  >([
    {
      sender: "bot",
      text: "નમસ્તે! હું ચલણAI મુનિમ છું. તમે ચલણનો ફોટો મોકલી શકો છો અથવા કોઈપણ પ્રશ્ન પૂછી શકો છો. નીચેના 4 ડેમો બટનથી તરત ટેસ્ટ કરી શકો છો.",
      time: "10:00 AM",
    },
  ]);
  const [inputMsg, setInputMsg] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingOcrData, setPendingOcrData] = useState<ExtractedChallanData | null>(null);
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (msgText?: string) => {
    const textToSend = msgText || inputMsg;
    if (!textToSend.trim() || isProcessing) return;

    const userTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [...prev, { sender: "user", text: textToSend, time: userTime }]);
    if (!msgText) setInputMsg("");
    setIsProcessing(true);

    try {
      const resp = await processVernacularMessage(textToSend);
      const botTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const reply = lang === "gu" ? resp.reply_gujarati : resp.reply_english;

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: reply,
          time: botTime,
        },
      ]);

      if (resp.action_type === "NAVIGATE_TAB" && resp.action_payload?.tab) {
        setTimeout(() => setActiveTab(resp.action_payload?.tab), 1200);
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Upload Photo or trigger preset
  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    const userTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [
      ...prev,
      { sender: "user", text: `📷 [ફોટો અપલોડ]: ${file.name}`, time: userTime },
    ]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const extracted = await uploadChallanImage(formData);

      setPendingOcrData(extracted);
      setOcrModalOpen(true);

      const botTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: `ચલણ સફળતાપૂર્વક વંચાઈ ગયું! વેપારી: ${extracted.party_name}, ચલણ નં: ${extracted.challan_number}, ડીઝાઇન: ${extracted.design_number}, જથ્થો: ${extracted.quantity} ${extracted.unit}`,
          time: botTime,
          ocrData: extracted,
        },
      ]);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerPreset = async (presetFilename: string) => {
    // Create a dummy file with preset name so backend matches deterministic preset
    const dummyBlob = new Blob(["demo-preset-bytes"], { type: "image/jpeg" });
    const dummyFile = new File([dummyBlob], presetFilename, { type: "image/jpeg" });
    await handleFileUpload(dummyFile);
  };

  const handleConfirmOcrSave = async () => {
    if (!pendingOcrData) return;
    try {
      await createChallan({
        challan_type: pendingOcrData.challan_type,
        party_name: pendingOcrData.party_name,
        challan_number: pendingOcrData.challan_number,
        challan_date: pendingOcrData.challan_date,
        design_number: pendingOcrData.design_number,
        factory_punch_number: pendingOcrData.factory_punch_number,
        agreed_rate: pendingOcrData.agreed_rate,
        stitches_per_piece: pendingOcrData.stitches_per_piece,
        fabric_type: pendingOcrData.fabric_type,
        total_quantity: pendingOcrData.quantity,
        unit: pendingOcrData.unit,
        photo_url: pendingOcrData.photo_url,
        notes: pendingOcrData.raw_gujarati_notes,
      });

      showToast("ચલણ ખાતાવહીમાં સેવ થઈ ગયું! (Challan successfully saved)", "success");
      setOcrModalOpen(false);
      setPendingOcrData(null);
      loadPendingLotsData();
      loadInitialData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // -------------------------------------------------------------
  // TAB 2: PENDING FLOOR LOTS STATE
  // -------------------------------------------------------------
  const [pendingLots, setPendingLots] = useState<PendingLot[]>([]);
  const [lotSearch, setLotSearch] = useState("");
  const [lotFilter, setLotFilter] = useState<"ALL" | "RECEIVED" | "IN_PROGRESS" | "COMPLETED">("ALL");
  const [selectedLotForDispatch, setSelectedLotForDispatch] = useState<PendingLot | null>(null);
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  // Dispatch Form
  const [dispatchForm, setDispatchForm] = useState({
    outward_challan_number: "",
    fresh_quantity: 0,
    returned_raw_quantity: 0,
    kasar_quantity: 0,
    fent_quantity: 0,
    notes: "",
  });
  const [lastDispatchWhatsAppMsg, setLastDispatchWhatsAppMsg] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === "pending") {
      loadPendingLotsData();
    }
  }, [activeTab]);

  const loadPendingLotsData = async () => {
    try {
      const lots = await fetchPendingLots();
      setPendingLots(lots);
    } catch (e) {
      console.warn("Using offline lots:", e);
    }
  };

  const handleOpenDispatch = (lot: PendingLot) => {
    setSelectedLotForDispatch(lot);
    setDispatchForm({
      outward_challan_number: `JW-${Math.floor(100 + Math.random() * 900)}`,
      fresh_quantity: Math.min(lot.pending_balance, 400),
      returned_raw_quantity: 0,
      kasar_quantity: 0,
      fent_quantity: 0,
      notes: "",
    });
    setLastDispatchWhatsAppMsg(null);
    setDispatchModalOpen(true);
  };

  const handleSaveDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLotForDispatch) return;

    try {
      const result = await dispatchLot(selectedLotForDispatch.inward_challan_id, {
        outward_challan_number: dispatchForm.outward_challan_number,
        fresh_quantity: Number(dispatchForm.fresh_quantity) || 0,
        returned_raw_quantity: Number(dispatchForm.returned_raw_quantity) || 0,
        kasar_quantity: Number(dispatchForm.kasar_quantity) || 0,
        fent_quantity: Number(dispatchForm.fent_quantity) || 0,
        notes: dispatchForm.notes,
      });

      showToast(result.message, "success");
      setLastDispatchWhatsAppMsg(result.data.whatsapp_message);
      loadPendingLotsData();
      loadInitialData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Filter lots
  const filteredLots = pendingLots.filter((lot) => {
    const matchesSearch =
      lot.party_name.toLowerCase().includes(lotSearch.toLowerCase()) ||
      lot.design_number.toLowerCase().includes(lotSearch.toLowerCase()) ||
      lot.challan_number.toLowerCase().includes(lotSearch.toLowerCase()) ||
      (lot.factory_punch_number && lot.factory_punch_number.toLowerCase().includes(lotSearch.toLowerCase()));

    if (lotFilter === "ALL") return matchesSearch;
    return matchesSearch && lot.status === lotFilter;
  });

  // -------------------------------------------------------------
  // TAB 3: STITCH CALCULATOR & SHIFT LOG STATE
  // -------------------------------------------------------------
  const [calcInputs, setCalcInputs] = useState<QuoteRequest>({
    stitch_count: 28000,
    machine_heads: 20,
    rpm: 650,
    efficiency_pct: 80.0,
    shift_cost: 2200.0,
    material_type: "JARI_THREAD",
    material_cost_per_piece: 8.5,
    target_profit_margin_pct: 25.0,
  });

  const [calcResult, setCalcResult] = useState<QuoteResult>({
    batch_production_minutes: 53.85,
    batches_per_shift: 13.37,
    pieces_per_shift: 267.4,
    machine_cost_per_piece: 8.23,
    material_cost_per_piece: 8.5,
    total_cost_per_piece: 16.73,
    break_even_rate: 16.73,
    recommended_quote_rate: 20.91,
    profit_per_shift: 1118.0,
    currency: "INR (₹)",
  });

  const [shiftsSummary, setShiftsSummary] = useState<ShiftSummary | null>(null);
  const [newShiftFormOpen, setNewShiftFormOpen] = useState(false);
  const [newShift, setNewShift] = useState({
    machine_number: "M-01",
    shift_type: "DAY" as "DAY" | "NIGHT",
    operator_name: "Karigar",
    start_stitch_counter: 14000000,
    end_stitch_counter: 14450000,
    target_stitches: 400000,
    rpm_average: 650,
    downtime_minutes: 20,
    notes: "",
  });

  useEffect(() => {
    recalcQuote(calcInputs);
    loadShiftsData();
  }, []);

  const recalcQuote = async (inputs: QuoteRequest) => {
    try {
      const res = await calculateStitchQuote(inputs);
      setCalcResult(res);
    } catch (e) {
      console.warn("Quote calc error:", e);
    }
  };

  const loadShiftsData = async () => {
    try {
      const sum = await fetchShiftsSummary();
      setShiftsSummary(sum);
    } catch (e) {
      console.warn("Shift summary error:", e);
    }
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await logShift({
        ...newShift,
        start_stitch_counter: Number(newShift.start_stitch_counter),
        end_stitch_counter: Number(newShift.end_stitch_counter),
        target_stitches: Number(newShift.target_stitches),
        rpm_average: Number(newShift.rpm_average),
        downtime_minutes: Number(newShift.downtime_minutes),
      });
      showToast("મશીન શિફ્ટ સફળતાપૂર્વક લોગ થઈ ગઈ! (Shift logged)", "success");
      setNewShiftFormOpen(false);
      loadShiftsData();
      loadInitialData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // -------------------------------------------------------------
  // TAB 4: PARTY LEDGER & TALLY EXPORT STATE
  // -------------------------------------------------------------
  const [parties, setParties] = useState<Party[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<string>("");
  const [partyLedger, setPartyLedger] = useState<PartyLedger | null>(null);

  useEffect(() => {
    if (activeTab === "ledger") {
      loadPartiesData();
    }
  }, [activeTab]);

  const loadPartiesData = async () => {
    try {
      const pList = await fetchParties();
      setParties(pList);
      if (pList.length > 0 && !selectedPartyId) {
        setSelectedPartyId(pList[0].id);
        loadPartyLedgerData(pList[0].id);
      }
    } catch (e) {
      console.warn("Parties fetch error:", e);
    }
  };

  const loadPartyLedgerData = async (pId: string) => {
    try {
      const ledger = await fetchPartyLedger(pId);
      setPartyLedger(ledger);
    } catch (e) {
      console.warn("Ledger fetch error:", e);
    }
  };

  const handlePartySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    setSelectedPartyId(pId);
    loadPartyLedgerData(pId);
  };

  // Print A4
  const handlePrintA4 = () => {
    window.print();
  };

  // -------------------------------------------------------------
  // RENDER UI
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* --- TOAST NOTIFICATION --- */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl transition-all duration-300 text-white ${
            notification.type === "error"
              ? "bg-rose-600"
              : notification.type === "info"
              ? "bg-indigo-600"
              : "bg-emerald-600"
          }`}
        >
          {notification.type === "error" ? (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          )}
          <span className="text-sm font-medium">{notification.msg}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* --- GLOBAL STICKY TOP HEADER --- */}
      <header className="no-print sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-2.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-white shadow-md shadow-amber-500/20 font-bold text-lg">
              શ્રી
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {t.appTitle}
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                {t.appSubtitle}
              </p>
            </div>
          </div>

          {/* Right Status & Lang Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Health Badge */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                health?.database_engine.includes("NEON")
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{health?.database_engine.includes("NEON") ? t.databaseNeon : t.databaseSqlite}</span>
            </div>

            {/* Language Switch */}
            <button
              onClick={() => setLang(lang === "gu" ? "en" : "gu")}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 hover:border-amber-500 bg-slate-50 hover:bg-amber-50 text-xs font-bold text-slate-700 hover:text-amber-700 transition-colors shadow-sm"
              title="Switch Language"
            >
              <span className="text-amber-600 font-bold">🌐</span>
              <span>{t.langToggle}</span>
            </button>
          </div>
        </div>
      </header>

      {/* --- TAB NAVIGATION BAR --- */}
      <nav className="no-print bg-slate-900 text-slate-300 border-b border-slate-800 sticky top-[57px] z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center overflow-x-auto scrollbar-none px-2 sm:px-4">
          {[
            { id: "bot", label: t.tabBot, icon: Sparkles },
            { id: "pending", label: t.tabPending, icon: Package },
            { id: "calculator", label: t.tabCalculator, icon: Calculator },
            { id: "ledger", label: t.tabLedger, icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 sm:px-5 py-3 text-xs sm:text-sm font-semibold whitespace-nowrap border-b-2 transition-all ${
                  isActive
                    ? "border-amber-500 text-amber-400 bg-slate-800/60"
                    : "border-transparent hover:text-white hover:bg-slate-800/30"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-amber-400" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* --- MAIN TAB CONTENT --- */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5">
        {/* ========================================================= */}
        {/* TAB 1: WHATSAPP BOT SIMULATOR                             */}
        {/* ========================================================= */}
        {activeTab === "bot" && (
          <div className="space-y-4 max-w-4xl mx-auto">
            {/* Quick Demo Presets Header */}
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2 text-amber-800 font-bold text-xs sm:text-sm">
                <Sparkles className="w-4 h-4 text-amber-600 animate-spin" />
                <span>{t.botDemoTitle}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <button
                  onClick={() => triggerPreset("preset_radhe_inward.jpg")}
                  disabled={isProcessing}
                  className="text-left px-3 py-2 bg-white rounded-xl border border-amber-200 hover:border-amber-400 hover:shadow-sm text-xs font-semibold text-slate-800 transition-all flex items-center justify-between group"
                >
                  <span className="truncate">{t.presetRadhe}</span>
                  <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-mono">
                    1200 PC
                  </span>
                </button>
                <button
                  onClick={() => triggerPreset("preset_maruti_outward.jpg")}
                  disabled={isProcessing}
                  className="text-left px-3 py-2 bg-white rounded-xl border border-amber-200 hover:border-amber-400 hover:shadow-sm text-xs font-semibold text-slate-800 transition-all flex items-center justify-between group"
                >
                  <span className="truncate">{t.presetMaruti}</span>
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">
                    Tranche
                  </span>
                </button>
                <button
                  onClick={() => triggerPreset("preset_duplicate_guard.jpg")}
                  disabled={isProcessing}
                  className="text-left px-3 py-2 bg-white rounded-xl border border-rose-200 hover:border-rose-400 hover:shadow-sm text-xs font-semibold text-rose-800 transition-all flex items-center justify-between group"
                >
                  <span className="truncate">{t.presetDuplicate}</span>
                  <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded font-mono">
                    409 Guard
                  </span>
                </button>
                <button
                  onClick={() => triggerPreset("preset_dahao_lcd.jpg")}
                  disabled={isProcessing}
                  className="text-left px-3 py-2 bg-white rounded-xl border border-indigo-200 hover:border-indigo-400 hover:shadow-sm text-xs font-semibold text-indigo-800 transition-all flex items-center justify-between group"
                >
                  <span className="truncate">{t.presetDahao}</span>
                  <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-mono">
                    LCD OCR
                  </span>
                </button>
              </div>
            </div>

            {/* Authentic WhatsApp Container */}
            <div className="bg-[#efeae2] border border-slate-300 rounded-2xl overflow-hidden shadow-xl flex flex-col h-[580px]">
              {/* WhatsApp Top Header */}
              <div className="bg-[#075e54] text-white px-4 py-3 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-emerald-700 border border-emerald-400 flex items-center justify-center text-white font-bold text-base shadow-inner">
                      મુ
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-[#075e54] rounded-full"></span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base leading-tight">
                      {t.botHeaderTitle}
                    </h3>
                    <p className="text-[11px] text-emerald-200">
                      {t.botHeaderSubtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium bg-emerald-800/80 px-2.5 py-1 rounded-full text-emerald-100">
                    Gemini 2.5 Flash
                  </span>
                </div>
              </div>

              {/* Chat Messages Feed */}
              <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3 wa-chat-pattern">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${
                      m.sender === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-sm text-xs sm:text-sm ${
                        m.sender === "user"
                          ? "bg-[#d9fdd3] text-slate-900 rounded-tr-none"
                          : "bg-white text-slate-800 rounded-tl-none border border-slate-100"
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                      
                      {/* OCR Quick Card if attached */}
                      {m.ocrData && (
                        <div className="mt-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                          <div className="font-bold text-amber-700 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{m.ocrData.party_name}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-2 text-[11px] text-slate-600">
                            <div>ચલણ: <span className="font-semibold text-slate-800">{m.ocrData.challan_number}</span></div>
                            <div>ડીઝાઇન: <span className="font-semibold text-slate-800">{m.ocrData.design_number}</span></div>
                            <div>પંચિંગ: <span className="font-semibold text-slate-800">{m.ocrData.factory_punch_number || "-"}</span></div>
                            <div>જથ્થો: <span className="font-semibold text-slate-800">{m.ocrData.quantity} {m.ocrData.unit}</span></div>
                            <div>ભાવ: <span className="font-semibold text-emerald-700">₹{m.ocrData.agreed_rate}</span></div>
                            <div>ટાંકા: <span className="font-semibold text-slate-800">{m.ocrData.stitches_per_piece?.toLocaleString() || "-"}</span></div>
                          </div>
                          <button
                            onClick={() => {
                              setPendingOcrData(m.ocrData!);
                              setOcrModalOpen(true);
                            }}
                            className="mt-1.5 w-full py-1 bg-amber-500 hover:bg-amber-600 text-white rounded font-bold text-[11px] transition-colors"
                          >
                            {t.btnConfirmSave}
                          </button>
                        </div>
                      )}

                      <span className="block text-[10px] text-slate-400 text-right mt-1">
                        {m.time}
                      </span>
                    </div>
                  </div>
                ))}

                {isProcessing && (
                  <div className="flex items-center gap-2 p-2 bg-white rounded-xl text-xs text-slate-500 w-fit shadow-sm">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    <span>AI વિચારણા કરી રહ્યું છે (Processing)...</span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="bg-[#f0f2f5] p-2 sm:p-3 flex items-center gap-2 border-t border-slate-200">
                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />

                {/* Camera / Upload Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  title="ચલણ ફોટો પાડો (Take Challan Photo)"
                  className="w-10 h-10 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors shrink-0"
                >
                  <Camera className="w-5 h-5 text-emerald-700" />
                </button>

                {/* Text Input */}
                <input
                  type="text"
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder={t.botPlaceholder}
                  disabled={isProcessing}
                  className="flex-1 bg-white border border-slate-300 rounded-full px-4 py-2 text-xs sm:text-sm focus:outline-none focus:border-emerald-600 shadow-inner"
                />

                {/* Send Button */}
                <button
                  onClick={() => handleSendMessage()}
                  disabled={isProcessing || !inputMsg.trim()}
                  className="w-10 h-10 rounded-full bg-[#128c7e] hover:bg-[#075e54] text-white flex items-center justify-center transition-colors shrink-0 disabled:opacity-50 shadow-md"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: PENDING FLOOR STOCK (બાકી માલ)                     */}
        {/* ========================================================= */}
        {activeTab === "pending" && (
          <div className="space-y-4">
            {/* Top 4 KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-semibold">{t.kpiPendingPcs}</p>
                  <p className="text-xl sm:text-2xl font-extrabold text-amber-600 mt-0.5">
                    {dashboard?.total_pending_pcs.toLocaleString()} <span className="text-xs font-normal">PCS</span>
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  📦
                </div>
              </div>

              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-semibold">{t.kpiPendingMtr}</p>
                  <p className="text-xl sm:text-2xl font-extrabold text-indigo-600 mt-0.5">
                    {dashboard?.total_pending_mtr.toLocaleString()} <span className="text-xs font-normal">MTR</span>
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  📏
                </div>
              </div>

              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-semibold">{t.kpiActiveLots}</p>
                  <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-0.5">
                    {dashboard?.active_lots_count} <span className="text-xs font-normal">Lots</span>
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  🏭
                </div>
              </div>

              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-semibold">{t.kpiEstBilling}</p>
                  <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">
                    ₹{dashboard?.estimated_pending_billing_inr.toLocaleString()}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
                  ₹
                </div>
              </div>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={lotSearch}
                  onChange={(e) => setLotSearch(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                {[
                  { key: "ALL", label: t.filterAll },
                  { key: "RECEIVED", label: t.filterReceived },
                  { key: "IN_PROGRESS", label: t.filterInProgress },
                  { key: "COMPLETED", label: t.filterCompleted },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setLotFilter(f.key as any)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      lotFilter === f.key
                        ? "bg-amber-500 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pending Lots Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLots.map((lot) => (
                <div
                  key={lot.inward_challan_id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3 hover:border-amber-400 transition-all"
                >
                  {/* Lot Card Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                          {lot.party_name}
                        </h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            lot.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-700"
                              : lot.status === "IN_PROGRESS"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {lot.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        ચલણ: <span className="font-semibold text-slate-800">{lot.challan_number}</span> • તારીખ: {lot.challan_date}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold px-2 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg">
                        પંચિંગ: {lot.factory_punch_number || "SK-45"}
                      </span>
                      <p className="text-[11px] text-emerald-700 font-bold mt-1">
                        ભાવ: ₹{lot.agreed_rate}/{lot.unit}
                      </p>
                    </div>
                  </div>

                  {/* Design & Stitches Badge */}
                  <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-xl">
                    <div>
                      ડીઝાઇન: <span className="font-bold text-slate-900">{lot.design_number}</span> ({lot.fabric_type})
                    </div>
                    <div>
                      ટાંકા: <span className="font-mono font-bold text-slate-700">{lot.stitches_per_piece?.toLocaleString() || "28,000"}</span>
                    </div>
                  </div>

                  {/* Multi-segment Progress Bar */}
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                      <span>પૂર્ણતા: {lot.completion_percentage}%</span>
                      <span className="text-amber-600">બાકી: {lot.pending_balance} {lot.unit}</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${(lot.total_fresh_delivered / lot.total_inward) * 100}%` }}
                        className="bg-emerald-500 h-full"
                        title="Fresh Delivered"
                      />
                      <div
                        style={{ width: `${(lot.total_returned_raw / lot.total_inward) * 100}%` }}
                        className="bg-blue-400 h-full"
                        title="Returned Raw"
                      />
                      <div
                        style={{ width: `${(lot.total_kasar / lot.total_inward) * 100}%` }}
                        className="bg-rose-400 h-full"
                        title="Kasar"
                      />
                    </div>
                  </div>

                  {/* 5-Metric Breakdown Boxes */}
                  <div className="grid grid-cols-5 gap-1 text-center font-mono text-[11px] pt-1">
                    <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                      <p className="text-[9px] text-slate-400 uppercase">{t.lotInwardQty}</p>
                      <p className="font-bold text-slate-800">{lot.total_inward}</p>
                    </div>
                    <div className="bg-emerald-50 p-1.5 rounded-lg border border-emerald-100">
                      <p className="text-[9px] text-emerald-600 uppercase">{t.lotFreshDelivered}</p>
                      <p className="font-bold text-emerald-700">{lot.total_fresh_delivered}</p>
                    </div>
                    <div className="bg-blue-50 p-1.5 rounded-lg border border-blue-100">
                      <p className="text-[9px] text-blue-600 uppercase">કાચો પરત</p>
                      <p className="font-bold text-blue-700">{lot.total_returned_raw}</p>
                    </div>
                    <div className="bg-rose-50 p-1.5 rounded-lg border border-rose-100">
                      <p className="text-[9px] text-rose-600 uppercase">કસર+ફેંટ</p>
                      <p className="font-bold text-rose-700">{lot.total_kasar + lot.total_fent}</p>
                    </div>
                    <div className="bg-amber-100 p-1.5 rounded-lg border border-amber-300">
                      <p className="text-[9px] text-amber-800 uppercase font-bold">{t.lotPendingBalance}</p>
                      <p className="font-extrabold text-amber-900">{lot.pending_balance}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleOpenDispatch(lot)}
                      className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.btnLogDispatch}</span>
                    </button>

                    <button
                      onClick={() => setPhotoPreviewUrl(lot.photo_url || "/uploads/preset_radhe_inward.jpg")}
                      className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{t.btnViewPhoto}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: STITCH COSTING & SHIFT TRACKER                     */}
        {/* ========================================================= */}
        {activeTab === "calculator" && (
          <div className="space-y-6">
            {/* SECTION A: STITCH-TO-PROFIT PRICING CALCULATOR */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-amber-600" />
                  <span>{t.calcHeaderTitle}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t.calcSubtitle}
                </p>
              </div>

              {/* Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {t.stitchCount}
                  </label>
                  <input
                    type="number"
                    value={calcInputs.stitch_count}
                    onChange={(e) => {
                      const updated = { ...calcInputs, stitch_count: Number(e.target.value) };
                      setCalcInputs(updated);
                      recalcQuote(updated);
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl font-mono focus:border-amber-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">દા.ત. 28,000 ટાંકા</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {t.machineHeads}
                  </label>
                  <input
                    type="number"
                    value={calcInputs.machine_heads}
                    onChange={(e) => {
                      const updated = { ...calcInputs, machine_heads: Number(e.target.value) };
                      setCalcInputs(updated);
                      recalcQuote(updated);
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl font-mono focus:border-amber-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">સુરત સ્ટાન્ડર્ડ: 20 માથા</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {t.machineRpm}
                  </label>
                  <input
                    type="number"
                    value={calcInputs.rpm}
                    onChange={(e) => {
                      const updated = { ...calcInputs, rpm: Number(e.target.value) };
                      setCalcInputs(updated);
                      recalcQuote(updated);
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl font-mono focus:border-amber-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">સામાન્ય સ્પીડ: 650 RPM</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {t.shiftCost}
                  </label>
                  <input
                    type="number"
                    value={calcInputs.shift_cost}
                    onChange={(e) => {
                      const updated = { ...calcInputs, shift_cost: Number(e.target.value) };
                      setCalcInputs(updated);
                      recalcQuote(updated);
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl font-mono focus:border-amber-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">લાઈટ + કારીગર પગાર: ₹2,200</span>
                </div>
              </div>

              {/* Real-time Calculation Result Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-center">
                  <p className="text-[11px] font-bold text-amber-800 uppercase">{t.breakEvenRate}</p>
                  <p className="text-2xl font-black text-amber-700 font-mono mt-1">
                    ₹{calcResult.break_even_rate}
                  </p>
                  <span className="text-[10px] text-amber-600">શૂન્ય નફો/નુકસાન ભાવ</span>
                </div>

                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 text-center shadow-sm">
                  <p className="text-[11px] font-bold text-emerald-800 uppercase">{t.recommendedQuote}</p>
                  <p className="text-2xl font-black text-emerald-700 font-mono mt-1">
                    ₹{calcResult.recommended_quote_rate}
                  </p>
                  <span className="text-[10px] text-emerald-600">25% સુરક્ષિત નફો</span>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 text-center">
                  <p className="text-[11px] font-bold text-indigo-800 uppercase">{t.piecesPerShift}</p>
                  <p className="text-2xl font-black text-indigo-700 font-mono mt-1">
                    {calcResult.pieces_per_shift} <span className="text-xs">PC</span>
                  </p>
                  <span className="text-[10px] text-indigo-600">{calcResult.batches_per_shift} બેચ / ૧૨ કલાક</span>
                </div>

                <div className="bg-slate-100 border border-slate-300 rounded-xl p-3.5 text-center">
                  <p className="text-[11px] font-bold text-slate-700 uppercase">{t.profitPerShift}</p>
                  <p className="text-2xl font-black text-slate-900 font-mono mt-1">
                    ₹{calcResult.profit_per_shift.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-slate-500">પ્રતિ શિફ્ટ ચોખ્ખો નફો</span>
                </div>
              </div>
            </div>

            {/* SECTION B: MACHINE LCD SHIFTS & BONUS LOG */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-600" />
                    <span>{t.shiftHeaderTitle}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t.shiftSubtitle}
                  </p>
                </div>

                <button
                  onClick={() => setNewShiftFormOpen(true)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm w-fit"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.btnLogNewShift}</span>
                </button>
              </div>

              {/* Shifts Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">મશીન / તારીખ</th>
                      <th className="p-3">શિફ્ટ</th>
                      <th className="p-3">કારીગર</th>
                      <th className="p-3">કુલ ટાંકા (Stitches)</th>
                      <th className="p-3">કાર્યક્ષમતા %</th>
                      <th className="p-3 text-emerald-700">બોનસ (₹)</th>
                      <th className="p-3">સ્થિતિ / એલર્ટ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {shiftsSummary?.shifts.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">
                          {s.machine_number} <br />
                          <span className="text-[10px] text-slate-400 font-normal">{s.shift_date}</span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              s.shift_type === "DAY"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-indigo-100 text-indigo-800"
                            }`}
                          >
                            {s.shift_type}
                          </span>
                        </td>
                        <td className="p-3 font-sans font-semibold text-slate-800">{s.operator_name}</td>
                        <td className="p-3 font-bold text-slate-900">{s.total_stitches.toLocaleString()}</td>
                        <td className="p-3 font-bold">
                          <span className={s.efficiency_pct < 70 ? "text-rose-600" : "text-emerald-600"}>
                            {s.efficiency_pct}%
                          </span>
                        </td>
                        <td className="p-3 font-bold text-emerald-700">₹{s.bonus_earned_inr}</td>
                        <td className="p-3 font-sans">
                          {s.is_low_efficiency_alert ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              <span>{t.lowEfficiencyAlert}</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                              સામાન્ય (Normal)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: PARTY LEDGER & ZERO-DISPUTE A4 PRINT               */}
        {/* ========================================================= */}
        {activeTab === "ledger" && (
          <div className="space-y-5">
            {/* Party Selector & Action Bar (Hidden on Print) */}
            <div className="no-print bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                  {t.selectParty}
                </span>
                <select
                  value={selectedPartyId}
                  onChange={handlePartySelect}
                  className="flex-1 md:w-72 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-amber-500"
                >
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.city})
                    </option>
                  ))}
                </select>
              </div>

              {/* 3 One-Click Settlement Buttons */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end overflow-x-auto">
                {partyLedger && (
                  <a
                    href={partyLedger.whatsapp_udhari_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{t.btnSendWhatsAppUdhari}</span>
                  </a>
                )}

                <button
                  onClick={handlePrintA4}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{t.btnPrintA4}</span>
                </button>

                {selectedPartyId && (
                  <a
                    href={getTallyExportUrl(selectedPartyId)}
                    download
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.btnExportTally}</span>
                  </a>
                )}
              </div>
            </div>

            {/* PRINTABLE A4 LEDGER CONTAINER */}
            <div className="printable-a4-ledger bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 shadow-md space-y-6">
              {/* Print Header */}
              <div className="print-header flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {t.appTitle}
                  </h2>
                  <p className="text-xs text-slate-600 font-medium">
                    પ્લોટ નં. ૪૫, એમ્બ્રોઇડરી પાર્ક, વરાછા રોડ, સુરત - ૩૯૫૦૦૬ • મો: +91 98250 12345
                  </p>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    GSTIN: 24AAACS1234E1Z5 • જોબ-વર્ક હિસાબ સ્ટેટમેન્ટ
                  </p>
                </div>

                <div className="text-right">
                  <span className="inline-block bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded">
                    ખાતાવહી ઓડિટ સ્લિપ
                  </span>
                  <p className="text-xs text-slate-500 font-mono mt-1">
                    તારીખ: {new Date().toLocaleDateString("en-GB")}
                  </p>
                </div>
              </div>

              {/* Party Info & Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">વેપારી ખાતું</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{partyLedger?.party_name}</p>
                  <p className="text-xs text-slate-500">{partyLedger?.party_phone} • {partyLedger?.city}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">{t.ledgerTotalInward}</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5 font-mono">
                    {partyLedger?.summary.total_inward_qty.toLocaleString()} <span className="text-xs font-normal">PCS/MTR</span>
                  </p>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <p className="text-[10px] text-emerald-700 uppercase font-bold">{t.ledgerBillableFresh}</p>
                  <p className="text-lg font-black text-emerald-800 mt-0.5 font-mono">
                    {partyLedger?.summary.total_billable_fresh_qty.toLocaleString()}
                  </p>
                  <span className="text-[9px] text-emerald-600">{t.ledgerReturnedRawNote}</span>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-300">
                  <p className="text-[10px] text-amber-800 uppercase font-extrabold">{t.ledgerNetPayable}</p>
                  <p className="text-xl font-black text-amber-900 mt-0.5 font-mono">
                    ₹{partyLedger?.summary.total_billable_amount_inr.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Dual Reconciliation Itemized Table */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-900">
                  {t.auditTableTitle}
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse border border-slate-300">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-300">
                      <tr>
                        <th className="p-2 border border-slate-300">{t.tblDate}</th>
                        <th className="p-2 border border-slate-300">{t.tblSlipType}</th>
                        <th className="p-2 border border-slate-300">{t.tblSlipNo}</th>
                        <th className="p-2 border border-slate-300">{t.tblDesignPunch}</th>
                        <th className="p-2 border border-slate-300 text-emerald-700">{t.tblFresh}</th>
                        <th className="p-2 border border-slate-300 text-blue-700">{t.tblReturnedRaw}</th>
                        <th className="p-2 border border-slate-300 text-rose-700">{t.tblKasar}</th>
                        <th className="p-2 border border-slate-300">{t.tblRate}</th>
                        <th className="p-2 border border-slate-300 font-bold">{t.tblBillableAmount}</th>
                        <th className="p-2 border border-slate-300 no-print">{t.tblPhotoProof}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      {/* Inwards */}
                      {partyLedger?.inward_challans.map((inc) => (
                        <tr key={inc.id} className="bg-amber-50/30">
                          <td className="p-2 border border-slate-300 font-sans">{inc.challan_date}</td>
                          <td className="p-2 border border-slate-300 font-bold text-blue-700">આવક (Inward)</td>
                          <td className="p-2 border border-slate-300 font-bold">{inc.challan_number}</td>
                          <td className="p-2 border border-slate-300">
                            {inc.design_number} / <span className="font-bold text-amber-800">{inc.factory_punch_number || "-"}</span>
                          </td>
                          <td className="p-2 border border-slate-300 font-bold">{inc.total_quantity} {inc.unit}</td>
                          <td className="p-2 border border-slate-300">-</td>
                          <td className="p-2 border border-slate-300">-</td>
                          <td className="p-2 border border-slate-300">₹{inc.agreed_rate}</td>
                          <td className="p-2 border border-slate-300">-</td>
                          <td className="p-2 border border-slate-300 no-print">
                            <button
                              onClick={() => setPhotoPreviewUrl(inc.photo_url || "/uploads/preset_radhe_inward.jpg")}
                              className="text-amber-600 hover:text-amber-800 underline font-sans text-[11px]"
                            >
                              જુઓ
                            </button>
                          </td>
                        </tr>
                      ))}

                      {/* Outward Tranches */}
                      {partyLedger?.outward_deliveries.map((out, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 border border-slate-300 font-sans">{out.dispatch_date}</td>
                          <td className="p-2 border border-slate-300 font-bold text-emerald-700">જાવક (Outward)</td>
                          <td className="p-2 border border-slate-300 font-bold">{out.outward_challan_number}</td>
                          <td className="p-2 border border-slate-300">
                            {out.design_number} / <span className="font-bold text-amber-800">{out.factory_punch_number || "-"}</span>
                          </td>
                          <td className="p-2 border border-slate-300 font-bold text-emerald-700">{out.fresh_quantity}</td>
                          <td className="p-2 border border-slate-300 font-bold text-blue-700">{out.returned_raw_quantity}</td>
                          <td className="p-2 border border-slate-300 font-bold text-rose-700">{out.kasar_quantity}</td>
                          <td className="p-2 border border-slate-300">-</td>
                          <td className="p-2 border border-slate-300 font-extrabold text-slate-900">
                            ₹{out.billable_amount_inr.toLocaleString()}
                          </td>
                          <td className="p-2 border border-slate-300 no-print">
                            <button
                              onClick={() => setPhotoPreviewUrl(out.photo_url || "/uploads/preset_maruti_outward.jpg")}
                              className="text-indigo-600 hover:text-indigo-800 underline font-sans text-[11px]"
                            >
                              જુઓ
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* A4 Printable Footer with Signatures */}
              <div className="print-footer-signatures border-t border-slate-300 pt-8 mt-6">
                <div className="flex justify-between items-end text-xs font-bold text-slate-700">
                  <div className="text-center">
                    <div className="w-48 border-b-2 border-slate-800 mb-2"></div>
                    <p>{t.printAuthorizedSign}</p>
                  </div>
                  <div className="text-center">
                    <div className="w-48 border-b-2 border-slate-800 mb-2"></div>
                    <p>{t.printPartySign}</p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 text-center mt-6">
                  {t.printNotice}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL 1: OCR EDITABLE CONFIRMATION CARD                   */}
      {/* ========================================================= */}
      {ocrModalOpen && pendingOcrData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>{t.ocrCardTitle}</span>
              </h3>
              <button
                onClick={() => setOcrModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">{t.ocrPartyName}</label>
                <input
                  type="text"
                  value={pendingOcrData.party_name}
                  onChange={(e) => setPendingOcrData({ ...pendingOcrData, party_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">{t.ocrChallanNo}</label>
                <input
                  type="text"
                  value={pendingOcrData.challan_number}
                  onChange={(e) => setPendingOcrData({ ...pendingOcrData, challan_number: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">{t.ocrDesignNo}</label>
                <input
                  type="text"
                  value={pendingOcrData.design_number}
                  onChange={(e) => setPendingOcrData({ ...pendingOcrData, design_number: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">{t.ocrPunchNo}</label>
                <input
                  type="text"
                  value={pendingOcrData.factory_punch_number || "SK-45"}
                  onChange={(e) => setPendingOcrData({ ...pendingOcrData, factory_punch_number: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">{t.ocrQty}</label>
                <input
                  type="number"
                  value={pendingOcrData.quantity}
                  onChange={(e) => setPendingOcrData({ ...pendingOcrData, quantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">{t.ocrAgreedRate}</label>
                <input
                  type="number"
                  value={pendingOcrData.agreed_rate}
                  onChange={(e) => setPendingOcrData({ ...pendingOcrData, agreed_rate: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold font-mono text-emerald-700"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">{t.ocrStitches}</label>
                <input
                  type="number"
                  value={pendingOcrData.stitches_per_piece}
                  onChange={(e) => setPendingOcrData({ ...pendingOcrData, stitches_per_piece: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">{t.ocrUnit}</label>
                <select
                  value={pendingOcrData.unit}
                  onChange={(e) => setPendingOcrData({ ...pendingOcrData, unit: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold"
                >
                  <option value="PCS">PCS</option>
                  <option value="MTR">MTR</option>
                  <option value="TAKA">TAKA</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1 text-xs">{t.ocrNotes}</label>
              <textarea
                value={pendingOcrData.raw_gujarati_notes || ""}
                onChange={(e) => setPendingOcrData({ ...pendingOcrData, raw_gujarati_notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleConfirmOcrSave}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-md"
              >
                {t.btnConfirmSave}
              </button>
              <button
                onClick={() => setOcrModalOpen(false)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                {t.btnCancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: TRANCHE PARTIAL DISPATCH MODAL                   */}
      {/* ========================================================= */}
      {dispatchModalOpen && selectedLotForDispatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {t.dispatchModalTitle}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedLotForDispatch.party_name} • ચલણ: {selectedLotForDispatch.challan_number}
                </p>
              </div>
              <button
                onClick={() => setDispatchModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDispatch} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {t.dispatchOutwardNo}
                </label>
                <input
                  type="text"
                  required
                  value={dispatchForm.outward_challan_number}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, outward_challan_number: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-emerald-800 block mb-1">
                    {t.dispatchFreshQty}
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={dispatchForm.fresh_quantity}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, fresh_quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-emerald-300 bg-emerald-50 rounded-xl font-bold font-mono text-emerald-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-blue-800 block mb-1">
                    {t.dispatchReturnedRaw}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={dispatchForm.returned_raw_quantity}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, returned_raw_quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-blue-300 bg-blue-50 rounded-xl font-bold font-mono text-blue-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-rose-800 block mb-1">
                    {t.dispatchKasar}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={dispatchForm.kasar_quantity}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, kasar_quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-rose-300 bg-rose-50 rounded-xl font-bold font-mono text-rose-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {t.dispatchFent}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={dispatchForm.fent_quantity}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, fent_quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {t.dispatchNotes}
                </label>
                <input
                  type="text"
                  value={dispatchForm.notes}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, notes: e.target.value })}
                  placeholder="દા.ત. પહેલો લોટ ટેમ્પોથી મોકલ્યો..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              {lastDispatchWhatsAppMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs space-y-2">
                  <p className="font-bold text-emerald-800">✅ {t.dispatchSuccessMsg}</p>
                  <p className="text-[11px] text-slate-700 font-mono bg-white p-2 rounded border border-emerald-200">
                    {lastDispatchWhatsAppMsg}
                  </p>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(lastDispatchWhatsAppMsg)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 bg-[#25d366] hover:bg-[#128c7e] text-white rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>{t.sendWhatsAppReceiptBtn}</span>
                  </a>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors shadow-md"
                >
                  {t.btnSaveDispatch}
                </button>
                <button
                  type="button"
                  onClick={() => setDispatchModalOpen(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  {t.btnCancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: PHOTO PREVIEW MODAL                              */}
      {/* ========================================================= */}
      {photoPreviewUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl max-w-md w-full p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="font-bold text-sm text-slate-900">
                {t.btnViewPhoto}
              </h4>
              <button
                onClick={() => setPhotoPreviewUrl(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 min-h-[260px] flex items-center justify-center">
              <div className="p-6 text-center space-y-2">
                <FileText className="w-16 h-16 text-amber-500 mx-auto" />
                <p className="font-bold text-slate-800 text-sm">ઓરિજિનલ પેપર ચલણ સ્લિપ</p>
                <p className="text-xs text-slate-500 font-mono">ફોટો પાથ: {photoPreviewUrl}</p>
                <div className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded inline-block font-semibold">
                  ✓ ડિજિટલ સહી અને વેરિફાઇડ સ્ટેમ્પ સાથે સંગ્રહિત
                </div>
              </div>
            </div>

            <button
              onClick={() => setPhotoPreviewUrl(null)}
              className="w-full py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900"
            >
              બંધ કરો (Close)
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: NEW SHIFT LOG MODAL                              */}
      {/* ========================================================= */}
      {newShiftFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="font-bold text-sm text-slate-900">
                {t.btnLogNewShift}
              </h4>
              <button
                onClick={() => setNewShiftFormOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShift} className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-0.5">{t.shiftMachineNo}</label>
                  <input
                    type="text"
                    required
                    value={newShift.machine_number}
                    onChange={(e) => setNewShift({ ...newShift, machine_number: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-0.5">{t.shiftType}</label>
                  <select
                    value={newShift.shift_type}
                    onChange={(e) => setNewShift({ ...newShift, shift_type: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="DAY">DAY (દિવસ)</option>
                    <option value="NIGHT">NIGHT (રાત્રિ)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-0.5">{t.shiftOperator}</label>
                <input
                  type="text"
                  required
                  value={newShift.operator_name}
                  onChange={(e) => setNewShift({ ...newShift, operator_name: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-0.5">{t.shiftStartCounter}</label>
                  <input
                    type="number"
                    required
                    value={newShift.start_stitch_counter}
                    onChange={(e) => setNewShift({ ...newShift, start_stitch_counter: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-0.5">{t.shiftEndCounter}</label>
                  <input
                    type="number"
                    required
                    value={newShift.end_stitch_counter}
                    onChange={(e) => setNewShift({ ...newShift, end_stitch_counter: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-0.5">{t.shiftTarget}</label>
                  <input
                    type="number"
                    value={newShift.target_stitches}
                    onChange={(e) => setNewShift({ ...newShift, target_stitches: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-0.5">{t.shiftDowntime}</label>
                  <input
                    type="number"
                    value={newShift.downtime_minutes}
                    onChange={(e) => setNewShift({ ...newShift, downtime_minutes: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-md"
                >
                  સેવ કરો (Save Shift)
                </button>
                <button
                  type="button"
                  onClick={() => setNewShiftFormOpen(false)}
                  className="py-2 px-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                >
                  રદ કરો
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
