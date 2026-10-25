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
  Palette,
  QrCode,
  Wallet,
  ChevronDown,
  ChevronUp,
  Zap,
  Check,
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
  KarigarAdvance,
  KarigarSalaryRecord,
  DesignMasterItem,
  ConsumableStockItem,
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
  fetchKarigarSalarySummary,
  logKarigarAdvance,
  fetchDesignCatalog,
  fetchConsumablesStock,
  toggleConsumableStock,
  resetDemoData,
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
  // FACTORY EXPANSION ADD-ONS STATE (SECTIONS 1, 2, 3, 4, 5)
  // -------------------------------------------------------------
  // Add-on 1: Karigar Upaad & Salary
  const [tab3SubTab, setTab3SubTab] = useState<"calculator" | "shifts" | "karigar">("calculator");
  const [karigarsSalary, setKarigarsSalary] = useState<KarigarSalaryRecord[]>([]);
  const [upaadModalOpen, setUpaadModalOpen] = useState(false);
  const [upaadForm, setUpaadForm] = useState({
    karigar_name: "Ramesh Karigar",
    amount: 1500,
    advance_date: new Date().toISOString().split("T")[0],
    notes: "રવિવાર રોકડ ઉપાડ (Sunday Cash)",
  });

  // Add-on 2: Visual Design Master Catalog
  const [designGalleryOpen, setDesignGalleryOpen] = useState(false);
  const [designCatalog, setDesignCatalog] = useState<DesignMasterItem[]>([]);
  const [designSearch, setDesignSearch] = useState("");

  // Add-on 3: Consumables Quick Alert Bar
  const [consumables, setConsumables] = useState<ConsumableStockItem[]>([]);
  const [consumablesExpanded, setConsumablesExpanded] = useState(true);

  // Add-on 4: GST 5% Job-Work Toggle
  const [isGstBill, setIsGstBill] = useState(false);

  // Add-on 5: Floating Speed Action Menu
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);

  useEffect(() => {
    loadAddonData();
  }, []);

  const loadAddonData = async () => {
    try {
      const [kData, dData, cData] = await Promise.all([
        fetchKarigarSalarySummary(),
        fetchDesignCatalog(),
        fetchConsumablesStock(),
      ]);
      setKarigarsSalary(kData);
      setDesignCatalog(dData);
      setConsumables(cData);
    } catch (e) {
      console.warn("Error loading add-on data:", e);
    }
  };

  const handleSaveUpaad = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await logKarigarAdvance({
        karigar_name: upaadForm.karigar_name,
        amount: Number(upaadForm.amount),
        advance_date: upaadForm.advance_date,
        notes: upaadForm.notes,
      });
      showToast("રોકડ ઉપાડ સફળતાપૂર્વક નોંધાઈ ગયો! (Advance logged)", "success");
      setUpaadModalOpen(false);
      const updatedSalaries = await fetchKarigarSalarySummary();
      setKarigarsSalary(updatedSalaries);
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleToggleConsumableItem = async (key: string) => {
    try {
      const updated = await toggleConsumableStock(key);
      setConsumables((prev) =>
        prev.map((c) => (c.key === key ? { ...c, is_low_stock: updated.is_low_stock } : c))
      );
      showToast(
        updated.is_low_stock
          ? `⚠️ એલર્ટ: ${key} સ્ટોક ખૂટે છે!`
          : `✅ ${key} સ્ટોક સામાન્ય (In Stock) છે.`,
        updated.is_low_stock ? "error" : "success"
      );
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleQuoteDesign = (design: DesignMasterItem) => {
    const updated = {
      ...calcInputs,
      stitch_count: design.stitches,
      material_cost_per_piece: Math.round(design.last_agreed_rate * 0.35),
    };
    setCalcInputs(updated);
    recalcQuote(updated);
    setActiveTab("calculator");
    setTab3SubTab("calculator");
    setDesignGalleryOpen(false);
    showToast(
      `ડીઝાઇન ${design.design_number} (${design.stitches.toLocaleString()} ટાંકા) કેલ્ક્યુલેટરમાં સેટ થઈ ગઈ!`,
      "success"
    );
  };

  // -------------------------------------------------------------
  // TAB 1: WHATSAPP BOT STATE
  // -------------------------------------------------------------
  const [messages, setMessages] = useState<
    Array<{
      sender: "user" | "bot";
      text: string;
      time: string;
      ocrData?: ExtractedChallanData;
      isDuplicateAlert?: boolean;
      showJumpToLots?: boolean;
      lcdProofUrl?: string;
    }>
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

  // 1-Click Demo Reset State & Handler
  const [isResettingDemo, setIsResettingDemo] = useState(false);
  const handleResetDemo = async () => {
    try {
      setIsResettingDemo(true);
      const res = await resetDemoData();
      showToast(t.resetDemoSuccess || res.message, "success");
      await loadInitialData();
      await loadPendingLotsData();
      await loadShiftsData();
      if (selectedPartyId) await loadPartyLedgerData(selectedPartyId);
    } catch (e: any) {
      showToast(e.message || "Reset failed", "error");
    } finally {
      setIsResettingDemo(false);
    }
  };

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
    if (presetFilename === "preset_duplicate_guard.jpg") {
      setIsProcessing(true);
      const userTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setMessages((prev) => [
        ...prev,
        { sender: "user", text: `⚠️ [ડુપ્લિકેટ ચલણ ચકાસણી]: Radhe Creation #RC-1048`, time: userTime },
      ]);

      setTimeout(() => {
        const botTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: `⚠️ [409 Conflict Guard - ડુપ્લિકેટ ચલણ અટકાવવામાં આવ્યું]\n\nવેપારી: Radhe Creation (સુરત)\nચલણ નંબર: RC-1048\n\nઆ ચલણ નંબર આ પાર્ટી માટે તારીખ 24/10/2026 ના રોજ 1,200 પીસ આવક તરીકે પહેલેથી જ નોંધાયેલ છે! સિસ્ટમે ડબલ એન્ટ્રી અટકાવી દીધી છે.`,
            time: botTime,
            isDuplicateAlert: true,
          },
        ]);
        showToast("409 Conflict Guard: ડબલ એન્ટ્રી અટકાવાઈ!", "error");
        setIsProcessing(false);
      }, 600);
      return;
    }

    if (presetFilename === "preset_dahao_lcd.jpg") {
      setIsProcessing(true);
      const userTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setMessages((prev) => [
        ...prev,
        { sender: "user", text: `🖥️ [મશીન LCD સ્કેન]: Dahao 328 Machine M-01`, time: userTime },
      ]);

      setTimeout(() => {
        const botTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: `🖥️ Dahao 328 LCD સ્ટીચ કાઉન્ટર સફળતાપૂર્વક વંચાઈ ગયું!\n\nમશીન: M-01 (DAY શિફ્ટ)\nઓપરેટર: Ramesh Karigar\nશરૂઆત કાઉન્ટર: 14,200,000\nઆખર કાઉન્ટર: 14,645,000\nકુલ ઉત્પાદન: 4,45,000 ટાંકા\nકાર્યક્ષમતા: 111.25%\nકારીગર બોનસ: +₹67.50\nડાઉનટાઇમ: 25 મિનિટ`,
            time: botTime,
            lcdProofUrl: "/uploads/preset_dahao_lcd.jpg",
          },
        ]);
        showToast("Dahao LCD સ્કેન સફળ! શિફ્ટ લોગમાં જોઈ શકાય છે.", "success");
        setIsProcessing(false);
      }, 600);
      return;
    }

    // Default flow for Radhe Inward or Maruti Outward
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
        fresh_quantity: pendingOcrData.fresh_quantity ?? pendingOcrData.quantity,
        returned_raw_quantity: pendingOcrData.returned_raw_quantity ?? 0,
        kasar_quantity: pendingOcrData.kasar_quantity ?? 0,
        fent_quantity: pendingOcrData.fent_quantity ?? 0,
        unit: pendingOcrData.unit,
        photo_url: pendingOcrData.photo_url,
        notes: pendingOcrData.raw_gujarati_notes,
      });

      showToast("ચલણ ખાતાવહીમાં સેવ થઈ ગયું! (Challan successfully saved)", "success");
      setOcrModalOpen(false);

      const botTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      if (pendingOcrData.challan_type === "OUTWARD") {
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: `✅ જાવક ચલણ #${pendingOcrData?.challan_number} (${pendingOcrData?.party_name}) કન્ફર્મ થયું!\nબાકી માલ બેલેન્સ લાઈવ અપડેટ થઈ ગયું છે.`,
            time: botTime,
            showJumpToLots: true,
          },
        ]);
      }

      setPendingOcrData(null);
      await loadPendingLotsData();
      await loadInitialData();
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

            {/* 1-Click Demo Reset Button */}
            <button
              onClick={handleResetDemo}
              disabled={isResettingDemo}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all shadow-sm disabled:opacity-50"
              title={t.btnResetDemo}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-rose-600 ${isResettingDemo ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{t.btnResetDemo}</span>
            </button>

            {/* Design Master Catalog Button */}
            <button
              onClick={() => setDesignGalleryOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-all shadow-sm"
              title={t.btnDesignCatalog}
            >
              <Palette className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden sm:inline">{t.btnDesignCatalog}</span>
            </button>

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

                      {/* Duplicate 409 Alert Bubble */}
                      {m.isDuplicateAlert && (
                        <div className="mt-2.5 p-3 rounded-xl bg-rose-50 border-2 border-rose-400 text-rose-900 font-bold space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-rose-700">
                            <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
                            <span>{t.duplicateAlertTitle}</span>
                          </div>
                          <p className="text-[11px] font-normal text-rose-800 leading-relaxed">
                            {t.duplicateAlertMsg}
                          </p>
                        </div>
                      )}

                      {/* Jump to Pending Lots Button */}
                      {m.showJumpToLots && (
                        <button
                          onClick={() => setActiveTab("pending")}
                          className="mt-2.5 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-colors"
                        >
                          <Package className="w-4 h-4" />
                          <span>{t.btnJumpToLots}</span>
                        </button>
                      )}

                      {/* Machine LCD Proof Viewer Button */}
                      {m.lcdProofUrl && (
                        <button
                          onClick={() => setPhotoPreviewUrl(m.lcdProofUrl!)}
                          className="mt-2.5 w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-600" />
                          <span>🖥️ Dahao LCD ફોટો પ્રૂફ જુઓ</span>
                        </button>
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
            {/* ADD-ON SECTION 3: 🧵 દોરા અને જરી સ્ટોક એલર્ટ (CONSUMABLES STATUS BAR) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
              <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-50 via-white to-amber-50/30 flex items-center justify-between gap-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm shrink-0">
                    🧵
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>{t.consumablesTitle}</span>
                      {consumables.filter((c) => c.is_low_stock).length > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                          🔴 {consumables.filter((c) => c.is_low_stock).length} {t.stockAlertCountBadge}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {t.stockInStock}
                        </span>
                      )}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-slate-500 font-medium">
                      {t.consumablesSubtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* WhatsApp Order Button for Low Stock */}
                  {consumables.filter((c) => c.is_low_stock).length > 0 && (
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `*શ્રી કૃષ્ણ એમ્બ્રોઇડરી - તાત્કાલિક સ્ટોક ઓર્ડર*\n\nનીચેની વસ્તુઓ તાત્કાલિક ફેક્ટરીમાં ખૂટે છે:\n${consumables
                          .filter((c) => c.is_low_stock)
                          .map((c) => `• ${lang === "gu" ? c.name_gu : c.name_en}`)
                          .join("\n")}\n\nકૃપા કરીને સવારે વહેલા ટેમ્પોથી મોકલી આપવા વિનંતી.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#25d366] hover:bg-[#128c7e] text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>{t.btnSendVendorAlert}</span>
                    </a>
                  )}

                  <button
                    onClick={() => setConsumablesExpanded(!consumablesExpanded)}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 transition-colors"
                  >
                    {consumablesExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {consumablesExpanded && (
                <div className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 bg-slate-50/50">
                  {consumables.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleToggleConsumableItem(item.key)}
                      className={`text-left p-2.5 rounded-xl border transition-all flex flex-col justify-between shadow-xs hover:shadow-sm ${
                        item.is_low_stock
                          ? "bg-rose-50/80 border-rose-300 hover:border-rose-400"
                          : "bg-white border-slate-200 hover:border-emerald-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <span className="text-xs font-bold text-slate-800 leading-tight">
                          {lang === "gu" ? item.name_gu : item.name_en}
                        </span>
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 mt-0.5 ${
                            item.is_low_stock ? "bg-rose-500 animate-ping" : "bg-emerald-500"
                          }`}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span
                          className={`font-black px-1.5 py-0.5 rounded ${
                            item.is_low_stock
                              ? "bg-rose-100 text-rose-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {item.is_low_stock ? t.stockLow : t.stockInStock}
                        </span>
                        <span className="text-slate-400 font-mono">
                          {lang === "gu" ? item.unit_gu : item.unit_en}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

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

                <button
                  onClick={() => setDesignGalleryOpen(true)}
                  className="px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 flex items-center gap-1.5 shadow-xs"
                >
                  <Palette className="w-3.5 h-3.5 text-purple-600" />
                  <span>{t.btnDesignCatalog}</span>
                </button>
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

                  {/* Design, Punch & Billable Earned */}
                  <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      ડીઝાઇન: <span className="font-bold text-slate-900">{lot.design_number}</span> ({lot.fabric_type})
                    </div>
                    <div>
                      ટાંકા: <span className="font-mono font-bold text-slate-700">{lot.stitches_per_piece?.toLocaleString() || "28,000"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs bg-emerald-50/80 border border-emerald-200 px-3 py-1.5 rounded-xl">
                    <span className="text-emerald-800 font-semibold">{t.billableEarnedSoFar || "કમાયેલ બિલ રકમ (Billable Earned):"}</span>
                    <span className="font-mono font-extrabold text-emerald-700">₹{Math.round(lot.total_fresh_delivered * lot.agreed_rate).toLocaleString("en-IN")}</span>
                  </div>

                  {/* 4-Color Stacked Progress Bar */}
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                      <span>પૂર્ણતા: {lot.completion_percentage}%</span>
                      <span className="text-amber-600">બાકી માલ: {lot.pending_balance} {lot.unit}</span>
                    </div>
                    <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                      <div
                        style={{ width: `${Math.min(100, (lot.total_fresh_delivered / lot.total_inward) * 100)}%` }}
                        className="bg-emerald-500 h-full transition-all"
                        title={`Fresh Delivered: ${lot.total_fresh_delivered}`}
                      />
                      <div
                        style={{ width: `${Math.min(100, (lot.total_returned_raw / lot.total_inward) * 100)}%` }}
                        className="bg-sky-400 h-full transition-all"
                        title={`Returned Raw: ${lot.total_returned_raw}`}
                      />
                      <div
                        style={{ width: `${Math.min(100, ((lot.total_kasar + lot.total_fent) / lot.total_inward) * 100)}%` }}
                        className="bg-rose-400 h-full transition-all"
                        title={`Kasar + Fent: ${lot.total_kasar + lot.total_fent}`}
                      />
                      <div
                        style={{ width: `${Math.max(0, Math.min(100, (lot.pending_balance / lot.total_inward) * 100))}%` }}
                        className="bg-slate-400 h-full transition-all"
                        title={`Pending on Floor: ${lot.pending_balance}`}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 px-1 font-medium">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>ફ્રેશ</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400 inline-block"></span>કાચો પરત</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block"></span>કસર/ફેંટ</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span>બાકી</span>
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
                    <div className="bg-sky-50 p-1.5 rounded-lg border border-sky-100">
                      <p className="text-[9px] text-sky-600 uppercase">કાચો પરત</p>
                      <p className="font-bold text-sky-700">{lot.total_returned_raw}</p>
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
          <div className="space-y-5">
            {/* SUB-TAB CONTROLLER FOR TAB 3 */}
            <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                {[
                  { id: "calculator", label: t.subTabCalc, icon: Calculator },
                  { id: "shifts", label: t.subTabShifts, icon: Clock },
                  { id: "karigar", label: t.subTabKarigar, icon: User },
                ].map((st) => {
                  const Icon = st.icon;
                  const isActive = tab3SubTab === st.id;
                  return (
                    <button
                      key={st.id}
                      onClick={() => setTab3SubTab(st.id as any)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                        isActive
                          ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                          : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{st.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Design Catalog Shortcut in Tab 3 */}
              <button
                onClick={() => setDesignGalleryOpen(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Palette className="w-3.5 h-3.5 text-purple-600" />
                <span>{t.btnDesignCatalog}</span>
              </button>
            </div>

            {/* SUB-TAB 1: STITCH-TO-PROFIT PRICING CALCULATOR */}
            {tab3SubTab === "calculator" && (
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
            )}

            {/* SUB-TAB 2: MACHINE LCD SHIFTS & BONUS LOG */}
            {tab3SubTab === "shifts" && (
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
                        <td className="p-3 font-bold">
                          {s.bonus_earned_inr > 0 ? (
                            <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-lg border border-emerald-300 font-extrabold text-[11px] inline-block shadow-xs">
                              +₹{Number(s.bonus_earned_inr).toFixed(2)} કારીગર બોનસ
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">₹0.00</span>
                          )}
                        </td>
                        <td className="p-3 font-sans">
                          {s.is_low_efficiency_alert ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-300 animate-pulse shadow-sm">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span>{t.lowEfficiencyAlert}</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg font-medium border border-emerald-200">
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
            )}

            {/* SUB-TAB 3: 👷 કારીગર ઉપાડ અને પગાર ખાતું (KARIGAR UPAAD & MONTHLY SALARY TRACKER) */}
            {tab3SubTab === "karigar" && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                        <User className="w-5 h-5 text-amber-600" />
                        <span>{t.karigarTitle}</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t.karigarSubtitle}
                      </p>
                    </div>

                    <button
                      onClick={() => setUpaadModalOpen(true)}
                      className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20 w-fit"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{t.btnLogUpaad}</span>
                    </button>
                  </div>

                  {/* Karigar KPI Summary Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-[11px] font-bold text-slate-500 uppercase">કુલ કારીગરો</p>
                      <p className="text-2xl font-black text-slate-900 font-mono mt-1">
                        {karigarsSalary.length} <span className="text-xs font-normal">ઓપરેટર</span>
                      </p>
                    </div>

                    <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200">
                      <p className="text-[11px] font-bold text-blue-700 uppercase">કુલ ભરેલી શિફ્ટ</p>
                      <p className="text-2xl font-black text-blue-900 font-mono mt-1">
                        {karigarsSalary.reduce((a, c) => a + c.shifts_completed, 0)} <span className="text-xs font-normal">શિફ્ટ</span>
                      </p>
                    </div>

                    <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200">
                      <p className="text-[11px] font-bold text-rose-700 uppercase">{t.tblTotalUpaad}</p>
                      <p className="text-2xl font-black text-rose-800 font-mono mt-1">
                        ₹{karigarsSalary.reduce((a, c) => a + c.total_upaad, 0).toLocaleString()}
                      </p>
                    </div>

                    <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-300">
                      <p className="text-[11px] font-extrabold text-emerald-800 uppercase">{t.tblNetPayable}</p>
                      <p className="text-2xl font-black text-emerald-900 font-mono mt-1">
                        ₹{karigarsSalary.reduce((a, c) => a + c.net_payable_salary, 0).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Karigar Salary Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">{t.tblKarigarName}</th>
                          <th className="p-3 text-center">{t.tblShiftsCompleted}</th>
                          <th className="p-3">{t.tblBasePay}</th>
                          <th className="p-3 text-emerald-700">{t.tblBonusEarned}</th>
                          <th className="p-3 font-bold">{t.tblGrossEarnings}</th>
                          <th className="p-3 text-rose-700 font-bold">{t.tblTotalUpaad}</th>
                          <th className="p-3 text-emerald-800 font-black">{t.tblNetPayable}</th>
                          <th className="p-3 text-center">{t.tblAction}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {karigarsSalary.map((k, idx) => {
                          const whatsappSlipText = `*શ્રી કૃષ્ણ એમ્બ્રોઇડરી - કારીગર માસિક પગાર સ્લિપ*\n\nકારીગર: ${k.karigar_name}\nકુલ શિફ્ટ: ${k.shifts_completed} (રૂ. ${k.total_base_pay.toLocaleString()})\nસ્ટીચ બોનસ: રૂ. ${k.total_stitch_bonus.toLocaleString()}\nકુલ કમાણી: રૂ. ${k.total_gross_earnings.toLocaleString()}\nકુલ રોકડ ઉપાડ: -રૂ. ${k.total_upaad.toLocaleString()}\n--------------------------------\n*ચૂકવવાપાત્ર ચોખ્ખો પગાર: રૂ. ${k.net_payable_salary.toLocaleString()}*\n--------------------------------\nતારીખ: ${new Date().toLocaleDateString("en-GB")}\n*સુપરવાઇઝર સહી સાથે સ્વીકારેલ.*`;

                          return (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-3 font-sans">
                                <span className="font-bold text-slate-900 block">{k.karigar_name}</span>
                                <span className="text-[10px] text-slate-400">{k.phone}</span>
                              </td>
                              <td className="p-3 text-center font-bold text-slate-800">
                                {k.shifts_completed}
                              </td>
                              <td className="p-3 font-bold text-slate-700">
                                ₹{k.total_base_pay.toLocaleString()}
                                <span className="block text-[9px] text-slate-400 font-normal">(@₹{k.base_shift_pay_rate}/shift)</span>
                              </td>
                              <td className="p-3 font-bold text-emerald-600">
                                +₹{k.total_stitch_bonus.toLocaleString()}
                              </td>
                              <td className="p-3 font-bold text-slate-900">
                                ₹{k.total_gross_earnings.toLocaleString()}
                              </td>
                              <td className="p-3 font-bold text-rose-600 bg-rose-50/40">
                                -₹{k.total_upaad.toLocaleString()}
                              </td>
                              <td className="p-3">
                                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-black text-sm border border-emerald-200 inline-block">
                                  ₹{k.net_payable_salary.toLocaleString()}
                                </span>
                              </td>
                              <td className="p-3 text-center font-sans">
                                <a
                                  href={`https://wa.me/?text=${encodeURIComponent(whatsappSlipText)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25d366] hover:bg-[#128c7e] text-white rounded-lg text-[11px] font-bold transition-colors shadow-xs"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                  <span>WhatsApp સ્લિપ</span>
                                </a>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent Cash Advance Vouchers */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-amber-600" />
                    <span>{t.recentUpaadTitle}</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {karigarsSalary
                      .flatMap((k) => k.advances)
                      .slice(0, 6)
                      .map((adv) => (
                        <div key={adv.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-900 block">{adv.karigar_name}</span>
                            <span className="text-[10px] text-slate-400">{adv.advance_date} • {adv.notes}</span>
                          </div>
                          <span className="font-bold font-mono text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            -₹{adv.amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
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

            {/* ADD-ON SECTION 4: 🧾 GST 5% JOB-WORK TOGGLE SWITCH */}
            <div className="no-print bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold text-slate-700 whitespace-nowrap">બિલ પ્રકાર (Bill Type):</span>
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setIsGstBill(false)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      !isGstBill
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {t.gstToggleEstimate}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsGstBill(true)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                      isGstBill
                        ? "bg-amber-500 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <span>{t.gstToggleGst}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-600 text-white font-mono">
                      HSN 998821
                    </span>
                  </button>
                </div>
              </div>

              {isGstBill ? (
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-slate-500">
                    CGST (2.5%): <strong className="text-slate-800">₹{((partyLedger?.summary.total_billable_amount_inr || 0) * 0.025).toFixed(2)}</strong>
                  </span>
                  <span className="text-slate-500">
                    SGST (2.5%): <strong className="text-slate-800">₹{((partyLedger?.summary.total_billable_amount_inr || 0) * 0.025).toFixed(2)}</strong>
                  </span>
                  <span className="bg-amber-50 text-amber-900 font-bold px-2.5 py-1 rounded-lg border border-amber-200">
                    GST સહિત કુલ: ₹{((partyLedger?.summary.total_billable_amount_inr || 0) * 1.05).toLocaleString()}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-slate-500 italic">
                  * કાચો હિસાબ સ્લિપ (Zero Tax Estimate Voucher)
                </span>
              )}
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
                  <span className={`inline-block text-white text-xs font-bold px-3 py-1 rounded ${isGstBill ? "bg-amber-600" : "bg-slate-900"}`}>
                    {isGstBill ? "પાકું GST બિલ (TAX INVOICE)" : "ખાતાવહી ઓડિટ સ્લિપ (ESTIMATE)"}
                  </span>
                  <p className="text-xs text-slate-500 font-mono mt-1">
                    તારીખ: {new Date().toLocaleDateString("en-GB")}
                  </p>
                  {isGstBill && (
                    <p className="text-[10px] text-amber-800 font-mono font-bold mt-0.5">
                      HSN / SAC: 998821 (Embroidery Job-Work)
                    </p>
                  )}
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

                {isGstBill ? (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-300">
                    <p className="text-[10px] text-amber-800 uppercase font-extrabold">{t.gstTotalWithTax}</p>
                    <p className="text-xl font-black text-amber-900 mt-0.5 font-mono">
                      ₹{((partyLedger?.summary.total_billable_amount_inr || 0) * 1.05).toLocaleString()}
                    </p>
                    <span className="text-[9px] text-amber-700 font-mono">
                      મૂળ રકમ ₹{(partyLedger?.summary.total_billable_amount_inr || 0).toLocaleString()} + 5% GST (₹{((partyLedger?.summary.total_billable_amount_inr || 0) * 0.05).toFixed(2)})
                    </span>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-300">
                    <p className="text-[10px] text-amber-800 uppercase font-extrabold">{t.ledgerNetPayable}</p>
                    <p className="text-xl font-black text-amber-900 mt-0.5 font-mono">
                      ₹{partyLedger?.summary.total_billable_amount_inr.toLocaleString()}
                    </p>
                    <span className="text-[9px] text-slate-500">બિન-જીએસટી ચોખ્ખી રકમ</span>
                  </div>
                )}
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
                        <th className="p-2 border border-slate-300 text-center">{t.tblPhotoProof}</th>
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
                          <td className="p-2 border border-slate-300 text-center">
                            <button
                              onClick={() => setPhotoPreviewUrl(inc.photo_url || "/uploads/preset_radhe_inward.jpg")}
                              className="no-print text-amber-600 hover:text-amber-800 underline font-sans text-[11px]"
                            >
                              જુઓ
                            </button>
                            <div className="hidden print:block text-center">
                              <img
                                src={inc.photo_url || "/uploads/preset_radhe_inward.jpg"}
                                alt="Slip"
                                className="w-10 h-10 object-cover rounded border border-slate-400 mx-auto"
                              />
                            </div>
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
                          <td className="p-2 border border-slate-300 text-center">
                            <button
                              onClick={() => setPhotoPreviewUrl(out.photo_url || "/uploads/preset_maruti_outward.jpg")}
                              className="no-print text-indigo-600 hover:text-indigo-800 underline font-sans text-[11px]"
                            >
                              જુઓ
                            </button>
                            <div className="hidden print:block text-center">
                              <img
                                src={out.photo_url || "/uploads/preset_maruti_outward.jpg"}
                                alt="Slip"
                                className="w-10 h-10 object-cover rounded border border-slate-400 mx-auto"
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {isGstBill && (
                      <tfoot className="bg-slate-50 font-mono text-xs border-t-2 border-slate-400">
                        <tr>
                          <td colSpan={8} className="p-2 text-right font-bold border border-slate-300">{t.gstTaxableSubtotal}</td>
                          <td colSpan={2} className="p-2 font-bold text-slate-900 border border-slate-300">₹{(partyLedger?.summary.total_billable_amount_inr || 0).toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td colSpan={8} className="p-2 text-right text-slate-600 border border-slate-300">CGST (2.5%) - HSN 998821:</td>
                          <td colSpan={2} className="p-2 text-slate-800 border border-slate-300">₹{((partyLedger?.summary.total_billable_amount_inr || 0) * 0.025).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td colSpan={8} className="p-2 text-right text-slate-600 border border-slate-300">SGST (2.5%) - HSN 998821:</td>
                          <td colSpan={2} className="p-2 text-slate-800 border border-slate-300">₹{((partyLedger?.summary.total_billable_amount_inr || 0) * 0.025).toFixed(2)}</td>
                        </tr>
                        <tr className="bg-amber-100/70 font-extrabold text-amber-900">
                          <td colSpan={8} className="p-2 text-right border border-slate-400">{t.gstTotalWithTax}</td>
                          <td colSpan={2} className="p-2 text-sm border border-slate-400">₹{((partyLedger?.summary.total_billable_amount_inr || 0) * 1.05).toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* ADD-ON SECTION 4: FACTORY PAYMENT SUMMARY BOX & UPI QR CODE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border border-slate-300 bg-slate-50/70">
                {/* Bank Account Details */}
                <div className="space-y-1.5 text-xs text-slate-700">
                  <h5 className="font-bold text-slate-900 flex items-center gap-1.5 pb-1 border-b border-slate-200">
                    <Building className="w-4 h-4 text-amber-600" />
                    <span>{t.bankDetailsTitle}</span>
                  </h5>
                  <p><strong className="text-slate-900">બેંકનું નામ:</strong> HDFC Bank (વરાછા રોડ શાખા, સુરત)</p>
                  <p><strong className="text-slate-900">ખાતાધારક:</strong> Shree Krishna Embroidery</p>
                  <p><strong className="text-slate-900">કરન્ટ ખાતા નં:</strong> <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-300">50200089234120</span></p>
                  <p><strong className="text-slate-900">IFSC કોડ:</strong> <span className="font-mono font-bold">HDFC0001234</span></p>
                  <p><strong className="text-slate-900">શાખા:</strong> પ્લોટ નં. ૪૫, એમ્બ્રોઇડરી પાર્ક, વરાછા, સુરત - ૩૯૫૦૦૬</p>
                </div>

                {/* Scan-to-Pay UPI QR Code */}
                <div className="flex items-center justify-between sm:justify-start gap-4 p-3 bg-white rounded-xl border border-slate-300">
                  {/* Clean Vector SVG QR Code */}
                  <div className="w-24 h-24 shrink-0 bg-white p-1 rounded-lg border border-slate-200 flex items-center justify-center shadow-xs">
                    <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900 fill-current">
                      {/* Top-left Finder */}
                      <rect x="5" y="5" width="28" height="28" rx="4" fill="#0f172a" />
                      <rect x="9" y="9" width="20" height="20" rx="2" fill="#ffffff" />
                      <rect x="13" y="13" width="12" height="12" rx="1" fill="#0f172a" />
                      {/* Top-right Finder */}
                      <rect x="67" y="5" width="28" height="28" rx="4" fill="#0f172a" />
                      <rect x="71" y="9" width="20" height="20" rx="2" fill="#ffffff" />
                      <rect x="75" y="13" width="12" height="12" rx="1" fill="#0f172a" />
                      {/* Bottom-left Finder */}
                      <rect x="5" y="67" width="28" height="28" rx="4" fill="#0f172a" />
                      <rect x="9" y="71" width="20" height="20" rx="2" fill="#ffffff" />
                      <rect x="13" y="75" width="12" height="12" rx="1" fill="#0f172a" />
                      {/* Data Dots */}
                      <rect x="38" y="8" width="6" height="6" fill="#0f172a" />
                      <rect x="48" y="14" width="6" height="6" fill="#0f172a" />
                      <rect x="56" y="8" width="6" height="6" fill="#0f172a" />
                      <rect x="38" y="24" width="6" height="6" fill="#0f172a" />
                      <rect x="48" y="28" width="6" height="6" fill="#0f172a" />
                      <rect x="8" y="38" width="6" height="6" fill="#0f172a" />
                      <rect x="20" y="44" width="6" height="6" fill="#0f172a" />
                      <rect x="8" y="54" width="6" height="6" fill="#0f172a" />
                      <rect x="26" y="52" width="6" height="6" fill="#0f172a" />
                      <rect x="38" y="42" width="24" height="24" rx="4" fill="#f59e0b" />
                      <text x="50" y="58" fontSize="14" fontWeight="bold" textAnchor="middle" fill="#ffffff">₹</text>
                      <rect x="68" y="38" width="6" height="6" fill="#0f172a" />
                      <rect x="84" y="44" width="6" height="6" fill="#0f172a" />
                      <rect x="74" y="54" width="6" height="6" fill="#0f172a" />
                      <rect x="90" y="52" width="6" height="6" fill="#0f172a" />
                      <rect x="38" y="72" width="6" height="6" fill="#0f172a" />
                      <rect x="48" y="78" width="6" height="6" fill="#0f172a" />
                      <rect x="58" y="72" width="6" height="6" fill="#0f172a" />
                      <rect x="68" y="82" width="6" height="6" fill="#0f172a" />
                      <rect x="80" y="74" width="6" height="6" fill="#0f172a" />
                      <rect x="76" y="88" width="6" height="6" fill="#0f172a" />
                      <rect x="88" y="86" width="6" height="6" fill="#0f172a" />
                      <rect x="44" y="88" width="6" height="6" fill="#0f172a" />
                    </svg>
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-1 text-slate-900 font-bold">
                      <QrCode className="w-4 h-4 text-emerald-600" />
                      <span>{t.upiPaymentTitle}</span>
                    </div>
                    <p className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      shreekrishna.embroidery@okaxis
                    </p>
                    <p className="text-[11px] font-bold text-emerald-700 font-mono">
                      કુલ ચૂકવવાપાત્ર: ₹{(isGstBill ? (partyLedger?.summary.total_billable_amount_inr || 0) * 1.05 : (partyLedger?.summary.total_billable_amount_inr || 0)).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {t.upiScanNotice}
                    </p>
                  </div>
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

              {pendingOcrData.challan_type === "OUTWARD" ? (
                <div className="col-span-1 sm:col-span-2 p-3 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 text-xs">જાવક ડિલિવરી વિગત (Outward Tranche Breakdown):</span>
                    <span className="text-[10px] text-amber-800 font-semibold bg-amber-100 px-2 py-0.5 rounded-full">
                      બાકી લોટમાંથી આપમેળે કપાશે
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="font-bold text-emerald-800 block mb-1 text-[11px]">તૈયાર (Fresh Qty)</label>
                      <input
                        type="number"
                        value={pendingOcrData.fresh_quantity ?? pendingOcrData.quantity}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const raw = pendingOcrData.returned_raw_quantity ?? 0;
                          const kasar = pendingOcrData.kasar_quantity ?? 0;
                          const fent = pendingOcrData.fent_quantity ?? 0;
                          setPendingOcrData({
                            ...pendingOcrData,
                            fresh_quantity: val,
                            quantity: val + raw + kasar + fent,
                          });
                        }}
                        className="w-full px-2.5 py-1.5 border border-emerald-300 bg-emerald-50 rounded-lg font-bold font-mono text-emerald-900"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-sky-800 block mb-1 text-[11px]">કાચો પરત (₹0)</label>
                      <input
                        type="number"
                        value={pendingOcrData.returned_raw_quantity ?? 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const fresh = pendingOcrData.fresh_quantity ?? pendingOcrData.quantity;
                          const kasar = pendingOcrData.kasar_quantity ?? 0;
                          const fent = pendingOcrData.fent_quantity ?? 0;
                          setPendingOcrData({
                            ...pendingOcrData,
                            returned_raw_quantity: val,
                            quantity: fresh + val + kasar + fent,
                          });
                        }}
                        className="w-full px-2.5 py-1.5 border border-sky-300 bg-sky-50 rounded-lg font-bold font-mono text-sky-900"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-rose-800 block mb-1 text-[11px]">કસર (Kasar)</label>
                      <input
                        type="number"
                        value={pendingOcrData.kasar_quantity ?? 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const fresh = pendingOcrData.fresh_quantity ?? pendingOcrData.quantity;
                          const raw = pendingOcrData.returned_raw_quantity ?? 0;
                          const fent = pendingOcrData.fent_quantity ?? 0;
                          setPendingOcrData({
                            ...pendingOcrData,
                            kasar_quantity: val,
                            quantity: fresh + raw + val + fent,
                          });
                        }}
                        className="w-full px-2.5 py-1.5 border border-rose-300 bg-rose-50 rounded-lg font-bold font-mono text-rose-900"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1 text-[11px]">ફેંટ (Fent)</label>
                      <input
                        type="number"
                        value={pendingOcrData.fent_quantity ?? 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const fresh = pendingOcrData.fresh_quantity ?? pendingOcrData.quantity;
                          const raw = pendingOcrData.returned_raw_quantity ?? 0;
                          const kasar = pendingOcrData.kasar_quantity ?? 0;
                          setPendingOcrData({
                            ...pendingOcrData,
                            fent_quantity: val,
                            quantity: fresh + raw + kasar + val,
                          });
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-300 bg-slate-50 rounded-lg font-bold font-mono text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{t.ocrQty}</label>
                  <input
                    type="number"
                    value={pendingOcrData.quantity}
                    onChange={(e) => setPendingOcrData({ ...pendingOcrData, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold font-mono"
                  />
                </div>
              )}

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

              {/* Quick Preset Chips for Floor Operator */}
              <div className="flex items-center gap-1.5 flex-wrap bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-600">ઝડપી સેટિંગ:</span>
                <button
                  type="button"
                  onClick={() => setDispatchForm({ ...dispatchForm, fresh_quantity: selectedLotForDispatch.pending_balance })}
                  className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[11px] font-bold transition-colors"
                >
                  ⚡ {t.chipAllFresh} ({selectedLotForDispatch.pending_balance})
                </button>
                <button
                  type="button"
                  onClick={() => setDispatchForm({ ...dispatchForm, fresh_quantity: Math.min(selectedLotForDispatch.pending_balance, (dispatchForm.fresh_quantity || 0) + 100) })}
                  className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[11px] font-bold transition-colors"
                >
                  {t.chipPlus100}
                </button>
                <button
                  type="button"
                  onClick={() => setDispatchForm({ ...dispatchForm, fresh_quantity: Math.min(selectedLotForDispatch.pending_balance, (dispatchForm.fresh_quantity || 0) + 200) })}
                  className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[11px] font-bold transition-colors"
                >
                  {t.chipPlus200}
                </button>
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

              {/* Live Calculation Preview Box */}
              {(() => {
                const totalDelivering = (dispatchForm.fresh_quantity || 0) + (dispatchForm.returned_raw_quantity || 0) + (dispatchForm.kasar_quantity || 0) + (dispatchForm.fent_quantity || 0);
                const newPending = Math.max(0, selectedLotForDispatch.pending_balance - totalDelivering);
                const billableAmt = (dispatchForm.fresh_quantity || 0) * (selectedLotForDispatch.agreed_rate || 0);
                return (
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl grid grid-cols-2 gap-3 text-center">
                    <div>
                      <p className="text-[10px] text-amber-800 font-bold uppercase">{t.previewNewPending}</p>
                      <p className="font-mono font-black text-base text-amber-900 mt-0.5">
                        {newPending} {selectedLotForDispatch.unit}
                      </p>
                      <span className="text-[9px] text-amber-700">ખાતાવહી બાકી માલ</span>
                    </div>
                    <div>
                      <p className="text-[10px] text-emerald-800 font-bold uppercase">{t.previewBillable}</p>
                      <p className="font-mono font-black text-base text-emerald-800 mt-0.5">
                        ₹{Math.round(billableAmt).toLocaleString("en-IN")}
                      </p>
                      <span className="text-[9px] text-emerald-700">ફ્રેશ નંગ * ₹{selectedLotForDispatch.agreed_rate}</span>
                    </div>
                  </div>
                );
              })()}

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
          <div className="bg-white rounded-3xl max-w-lg w-full p-4 sm:p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                <span>{t.photoModalTitle || t.btnViewPhoto}</span>
              </h4>
              <button
                onClick={() => setPhotoPreviewUrl(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900/5 min-h-[300px] flex items-center justify-center p-2">
              <img
                src={photoPreviewUrl}
                alt="Challan / Screen Proof"
                className="max-h-[70vh] w-auto max-w-full rounded-xl object-contain shadow-md bg-white border border-slate-200"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-mono truncate max-w-[250px]">{photoPreviewUrl}</span>
              <button
                onClick={() => setPhotoPreviewUrl(null)}
                className="py-1.5 px-4 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors"
              >
                બંધ કરો (Close)
              </button>
            </div>
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
      {/* ========================================================= */}
      {/* MODAL 5: 🎨 VISUAL DESIGN MASTER CATALOG MODAL            */}
      {/* ========================================================= */}
      {designGalleryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base sm:text-lg text-slate-900 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-purple-600" />
                  <span>{t.designModalTitle}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t.designModalSubtitle}
                </p>
              </div>
              <button
                onClick={() => setDesignGalleryOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={designSearch}
                onChange={(e) => setDesignSearch(e.target.value)}
                placeholder="ડીઝાઇન નંબર, પંચિંગ કોડ (.DST), પાર્ટી અથવા કાપડ શોધો..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Design Cards Grid */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pr-1">
              {designCatalog
                .filter(
                  (d) =>
                    !designSearch.trim() ||
                    d.design_number.toLowerCase().includes(designSearch.toLowerCase()) ||
                    d.factory_punch_number.toLowerCase().includes(designSearch.toLowerCase()) ||
                    d.party_name.toLowerCase().includes(designSearch.toLowerCase()) ||
                    d.fabric_type.toLowerCase().includes(designSearch.toLowerCase())
                )
                .map((design) => (
                  <div
                    key={design.id}
                    className="border border-slate-200 hover:border-purple-400 rounded-2xl p-4 bg-white hover:shadow-md transition-all flex flex-col justify-between space-y-3 group"
                  >
                    {/* Thumbnail Badge & Category */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                          {design.category}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          {design.stitches.toLocaleString()} ટાંકા
                        </span>
                      </div>

                      {/* Pattern Preview Box */}
                      <div
                        className={`h-20 rounded-xl bg-gradient-to-tr ${design.thumbnail_color} p-3 flex flex-col justify-between text-white shadow-inner relative overflow-hidden`}
                      >
                        <div className="absolute -right-4 -bottom-4 opacity-20 text-5xl font-mono font-black">
                          DST
                        </div>
                        <div className="flex justify-between items-start z-10">
                          <span className="text-lg font-black tracking-tight">{design.design_number}</span>
                          <span className="text-[10px] font-mono bg-black/30 backdrop-blur-xs px-2 py-0.5 rounded font-bold">
                            {design.factory_punch_number}
                          </span>
                        </div>
                        <p className="text-[11px] font-medium opacity-90 truncate z-10">{design.party_name}</p>
                      </div>

                      {/* Design Specs */}
                      <div className="space-y-1 pt-2.5 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span className="text-slate-400">{t.designFabric}</span>
                          <span className="font-semibold text-slate-800">{design.fabric_type}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span className="text-slate-400">{t.designThread}</span>
                          <span className="font-semibold text-slate-800 truncate max-w-[150px]">{design.thread_jari_type}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span className="text-slate-400">{t.designAgreedRate}</span>
                          <span className="font-bold text-emerald-700 font-mono">₹{design.last_agreed_rate}/pc</span>
                        </div>
                      </div>
                    </div>

                    {/* Action: 🧮 આ ડિઝાઇનનો ભાવ ગણો */}
                    <button
                      onClick={() => handleQuoteDesign(design)}
                      className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>{t.btnCalcThisDesign}</span>
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 6: 💸 LOG KARIGAR CASH ADVANCE (ઉપાડ) MODAL          */}
      {/* ========================================================= */}
      {upaadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-amber-600" />
                <span>{t.upaadModalTitle}</span>
              </h3>
              <button
                onClick={() => setUpaadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUpaad} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {t.upaadKarigarSelect}
                </label>
                <select
                  value={upaadForm.karigar_name}
                  onChange={(e) => setUpaadForm({ ...upaadForm, karigar_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                >
                  {karigarsSalary.map((k) => (
                    <option key={k.karigar_name} value={k.karigar_name}>
                      {k.karigar_name} (બાકી લેવાના: ₹{k.net_payable_salary.toLocaleString()})
                    </option>
                  ))}
                  <option value="Ramesh Karigar">Ramesh Karigar</option>
                  <option value="Maheshbhai">Maheshbhai</option>
                  <option value="Udinbhai">Udinbhai</option>
                  <option value="Bhaveshbhai">Bhaveshbhai</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {t.upaadAmount}
                  </label>
                  <input
                    type="number"
                    required
                    min={100}
                    step={100}
                    value={upaadForm.amount}
                    onChange={(e) => setUpaadForm({ ...upaadForm, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-rose-300 bg-rose-50 rounded-xl font-bold font-mono text-rose-800 text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {t.upaadDate}
                  </label>
                  <input
                    type="date"
                    required
                    value={upaadForm.advance_date}
                    onChange={(e) => setUpaadForm({ ...upaadForm, advance_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {t.upaadNotes}
                </label>
                <input
                  type="text"
                  value={upaadForm.notes}
                  onChange={(e) => setUpaadForm({ ...upaadForm, notes: e.target.value })}
                  placeholder="દા.ત. રવિવાર રોકડ ઉપાડ, તહેવાર ખર્ચ..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-500/20"
                >
                  {t.btnSaveUpaad}
                </button>
                <button
                  type="button"
                  onClick={() => setUpaadModalOpen(false)}
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
      {/* ADD-ON SECTION 5: ⚡ FLOATING SPEED ACTION BUTTON & MENU   */}
      {/* ========================================================= */}
      <div className="fixed bottom-6 right-6 z-40 no-print flex flex-col items-end gap-3">
        {/* Backdrop for speed menu */}
        {speedMenuOpen && (
          <div
            onClick={() => setSpeedMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30"
          />
        )}

        {/* Speed Action Items */}
        {speedMenuOpen && (
          <div className="relative z-40 flex flex-col items-end gap-2.5 mb-2 animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Action 1: Snap Challan in AI Bot */}
            <button
              onClick={() => {
                setSpeedMenuOpen(false);
                setActiveTab("bot");
                setTimeout(() => fileInputRef.current?.click(), 300);
              }}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-white hover:bg-amber-50 rounded-2xl border border-amber-300 shadow-xl text-xs font-bold text-slate-900 hover:text-amber-800 transition-all hover:scale-105 group"
            >
              <span>{t.speedSnapChallan}</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                <Camera className="w-4 h-4" />
              </div>
            </button>

            {/* Action 2: Quick Outward Dispatch */}
            <button
              onClick={() => {
                setSpeedMenuOpen(false);
                setActiveTab("pending");
                if (pendingLots.length > 0) {
                  handleOpenDispatch(pendingLots[0]);
                }
              }}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-white hover:bg-emerald-50 rounded-2xl border border-emerald-300 shadow-xl text-xs font-bold text-slate-900 hover:text-emerald-800 transition-all hover:scale-105 group"
            >
              <span>{t.speedOutwardDispatch}</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                <Package className="w-4 h-4" />
              </div>
            </button>

            {/* Action 3: Log Karigar Advance (Upaad) */}
            <button
              onClick={() => {
                setSpeedMenuOpen(false);
                setUpaadModalOpen(true);
              }}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-white hover:bg-rose-50 rounded-2xl border border-rose-300 shadow-xl text-xs font-bold text-slate-900 hover:text-rose-800 transition-all hover:scale-105 group"
            >
              <span>{t.speedLogUpaad}</span>
              <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md">
                <Wallet className="w-4 h-4" />
              </div>
            </button>

            {/* Action 4: Quick Stitch Rate Quote */}
            <button
              onClick={() => {
                setSpeedMenuOpen(false);
                setActiveTab("calculator");
                setTab3SubTab("calculator");
              }}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-white hover:bg-indigo-50 rounded-2xl border border-indigo-300 shadow-xl text-xs font-bold text-slate-900 hover:text-indigo-800 transition-all hover:scale-105 group"
            >
              <span>{t.speedStitchQuote}</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                <Calculator className="w-4 h-4" />
              </div>
            </button>
          </div>
        )}

        {/* Master Floating Toggle Button */}
        <button
          onClick={() => setSpeedMenuOpen(!speedMenuOpen)}
          className={`relative z-40 flex items-center gap-2 h-12 px-4 rounded-full shadow-2xl transition-all duration-300 ${
            speedMenuOpen
              ? "bg-slate-900 text-white rotate-0"
              : "bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 text-white shadow-amber-500/40 hover:scale-105 active:scale-95"
          }`}
          title={t.speedActionTitle}
        >
          <div
            className={`transition-transform duration-300 ${
              speedMenuOpen ? "rotate-45" : "rotate-0"
            }`}
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="text-xs font-extrabold tracking-wide pr-1">
            {speedMenuOpen ? "બંધ કરો" : "+ ઝડપી એન્ટ્રી"}
          </span>
        </button>
      </div>
    </div>
  );
}
