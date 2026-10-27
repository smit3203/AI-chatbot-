"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Settings,
  LogOut,
  KeyRound,
  Crown,
  ArrowRight,
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
  User as UserIcon,
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
  Users,
  UserPlus,
  Trash2,
} from "lucide-react";

import {
  translations,
  Language,
} from "@/lib/translations";

import {
  SystemIntegrations,
  fetchSystemIntegrations,
  User,
  Factory,
  fetchStaffMembers,
  createStaffMember,
  deleteStaffMember,
  StaffCreatePayload,
  DemoTenant,
  getCurrentUser,
  getCurrentFactory,
  clearAuthSession,
  login,
  registerFactory,
  fetchMe,
  updateFactoryProfile,
  fetchDemoTenants,
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

  // --- MULTI-TENANT SAAS AUTH & PROFILE STATE ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentFactory, setCurrentFactory] = useState<Factory | null>(null);
  const [demoTenantsList, setDemoTenantsList] = useState<DemoTenant[]>([]);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [integrations, setIntegrations] = useState<SystemIntegrations | null>(null);
  const [integrationsModalOpen, setIntegrationsModalOpen] = useState(false);

  // Staff & Roles Management State (v3.1 RBAC)
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffList, setStaffList] = useState<User[]>([]);
  const [isStaffLoading, setIsStaffLoading] = useState(false);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [staffForm, setStaffForm] = useState<{
    full_name: string;
    login_id: string;
    password: string;
    role: "MASTER" | "KARIGAR" | "OWNER";
  }>({
    full_name: "",
    login_id: "",
    password: "123456",
    role: "MASTER",
  });

  // Login form state
  const [loginForm, setLoginForm] = useState({
    login_id: "9825012345",
    password: "123456",
  });

  // Register form state
  const [registerForm, setRegisterForm] = useState({
    factory_name: "શ્રી રાધે એમ્બ્રોઇડરી",
    owner_name: "સંજયભાઈ પટેલ",
    phone: "9879012345",
    password: "123456",
    city: "Surat",
    address: "પ્લોટ નં. ૧૨, એ.કે. રોડ, સુરત",
    gstin: "24AAAPL9999Z1Z1",
    bank_name: "State Bank of India (વરાછા શાખા)",
    bank_account_no: "30129845612",
    bank_ifsc: "SBIN0001234",
    upi_id: "sanjay.embroidery@oksbi",
  });

  // Profile modal form state
  const [profileForm, setProfileForm] = useState<Partial<Factory>>({});

  // Initialize auth from localStorage & load demo tenants
  useEffect(() => {
    initAuthAndTenants();
  }, []);

  const initAuthAndTenants = async () => {
    try {
      const demos = await fetchDemoTenants();
      setDemoTenantsList(demos);
    } catch (e) {
      console.warn("Error fetching demo tenants:", e);
    }

    const savedUser = getCurrentUser();
    const savedFactory = getCurrentFactory();
    if (savedUser && savedFactory) {
      setCurrentUser(savedUser);
      setCurrentFactory(savedFactory);
      setProfileForm(savedFactory);
      if (savedUser.role === "KARIGAR") {
        setActiveTab("calculator");
        setTab3SubTab("shifts");
      }
      fetchMe()
        .then((me) => {
          setCurrentUser(me.user);
          setCurrentFactory(me.factory);
          setProfileForm(me.factory);
          if (me.user?.role === "KARIGAR") {
            setActiveTab("calculator");
            setTab3SubTab("shifts");
          }
        })
        .catch((e) => console.warn("fetchMe error:", e));
    }
  };

  // --- STAFF MANAGEMENT HANDLERS (v3.1 RBAC) ---
  const loadStaffMembers = async () => {
    setIsStaffLoading(true);
    try {
      const list = await fetchStaffMembers();
      setStaffList(list);
    } catch (err: any) {
      console.error("Failed to load staff list:", err);
    } finally {
      setIsStaffLoading(false);
    }
  };

  const handleOpenStaffModal = () => {
    setStaffModalOpen(true);
    loadStaffMembers();
  };

  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.full_name || !staffForm.login_id || !staffForm.password) {
      showToast("કૃપા કરીને બધી માહિતી ભરો (Please fill all fields)", "error");
      return;
    }
    setIsAddingStaff(true);
    try {
      const created = await createStaffMember(staffForm);
      showToast(`નવો સ્ટાફ એકાઉન્ટ '${created.full_name}' (${created.role}) સફળતાપૂર્વક ઉમેરાઈ ગયો!`, "success");
      setStaffForm({ full_name: "", login_id: "", password: "123456", role: "MASTER" });
      loadStaffMembers();
    } catch (err: any) {
      showToast(err.message || "સ્ટાફ ઉમેરવામાં ભૂલ આવી", "error");
    } finally {
      setIsAddingStaff(false);
    }
  };

  const handleDeleteStaff = async (userId: string, name: string) => {
    if (!confirm(`શું તમે ખરેખર '${name}' સ્ટાફ એકાઉન્ટ દૂર કરવા માંગો છો?`)) return;
    try {
      await deleteStaffMember(userId);
      showToast(`'${name}' સ્ટાફ એકાઉન્ટ દૂર કરવામાં આવ્યું.`, "success");
      loadStaffMembers();
    } catch (err: any) {
      showToast(err.message || "સ્ટાફ ડિલીટ કરવામાં ભૂલ આવી", "error");
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    try {
      const res = await login(loginForm);
      setCurrentUser(res.user);
      setCurrentFactory(res.factory);
      setProfileForm(res.factory);
      if (res.user.role === "KARIGAR") {
        setActiveTab("calculator");
        setTab3SubTab("shifts");
      } else {
        setActiveTab("bot");
      }
      showToast(`${t.loginSuccessAlert || "લોગિન સફળ"}: ${res.factory.factory_name}`, "success");
      await refreshAllData();
    } catch (err: any) {
      showToast(err.message || "Login failed", "error");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleQuickDemoLogin = async (loginId: string, password = "123456") => {
    setIsAuthLoading(true);
    try {
      const res = await login({ login_id: loginId, password });
      setCurrentUser(res.user);
      setCurrentFactory(res.factory);
      setProfileForm(res.factory);
      if (res.user.role === "KARIGAR") {
        setActiveTab("calculator");
        setTab3SubTab("shifts");
      } else {
        setActiveTab("bot");
      }
      showToast(`${t.loginSuccessAlert || "લોગિન સફળ"}: ${res.factory.factory_name} (${res.factory.factory_code})`, "success");
      await refreshAllData();
    } catch (err: any) {
      showToast(err.message || "Quick switch failed", "error");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    try {
      const res = await registerFactory(registerForm);
      setCurrentUser(res.user);
      setCurrentFactory(res.factory);
      setProfileForm(res.factory);
      showToast(`${t.registerSuccessAlert || "કારખાનું રજીસ્ટર થયું"}: ${res.factory.factory_code} - ${res.factory.factory_name}`, "success");
      await refreshAllData();
    } catch (err: any) {
      showToast(err.message || "Registration failed", "error");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    setCurrentUser(null);
    setCurrentFactory(null);
    showToast(t.logoutSuccessAlert || "ખાતામાંથી બહાર નીકળ્યા (Logged out)", "info");
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      const updated = await updateFactoryProfile(profileForm);
      setCurrentFactory(updated);
      setProfileForm(updated);
      setProfileModalOpen(false);
      showToast(t.profileUpdateSuccess || "પ્રોફાઇલ સેવ થઈ ગઈ!", "success");
      if (selectedPartyId) await loadPartyLedgerData(selectedPartyId);
    } catch (err: any) {
      showToast(err.message || "Update profile failed", "error");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const refreshAllData = async () => {
    setSelectedPartyId("");
    setPartyLedger(null);
    try {
      await Promise.allSettled([
        loadInitialData(),
        loadPendingLotsData(),
        loadShiftsData(),
        loadPartiesData(),
        loadAddonData(),
      ]);
      fetchSystemIntegrations().then((res) => setIntegrations(res)).catch(() => {});
    } catch (e) {
      console.warn("Error refreshing all data:", e);
    }
  };

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
      const [hData, dData, iData] = await Promise.all([
        fetchHealth(),
        fetchDashboardSummary(),
        fetchSystemIntegrations(),
      ]);
      setHealth(hData);
      setDashboard(dData);
      setIntegrations(iData);
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
      if (pList.length > 0) {
        setSelectedPartyId(pList[0].id);
        loadPartyLedgerData(pList[0].id);
      } else {
        setSelectedPartyId("");
        setPartyLedger(null);
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
  // -------------------------------------------------------------  // If not authenticated, render the executive Multi-Tenant SaaS Portal
  if (!currentFactory) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 flex flex-col justify-between p-4 sm:p-6 text-slate-100 font-sans">
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

        {/* SaaS Header */}
        <header className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-amber-500/25">
              શ્રી
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  ChallanAI <span className="text-amber-400 font-mono text-xs">v3.0</span>
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  B2B SaaS
                </span>
              </div>
              <p className="text-xs text-slate-400">
                EmbroideryOS • સુરત • અમદાવાદ • જેતપુર
              </p>
            </div>
          </div>

          <button
            onClick={() => setLang(lang === "gu" ? "en" : "gu")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-600 hover:border-amber-400 bg-slate-800/80 text-xs font-bold text-slate-200 transition-all shadow-sm"
          >
            <span className="text-amber-400">🌐</span>
            <span>{t.langToggle}</span>
          </button>
        </header>

        {/* SaaS Gateway Main Card */}
        <main className="max-w-2xl w-full mx-auto my-6 bg-slate-800/90 backdrop-blur-xl border border-slate-700 rounded-3xl p-5 sm:p-8 shadow-2xl">
          {/* Tab Switcher: Login vs Register */}
          <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-700/80 mb-6">
            <button
              type="button"
              onClick={() => setAuthTab("login")}
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                authTab === "login"
                  ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>{t.loginTabLogin}</span>
            </button>
            <button
              type="button"
              onClick={() => setAuthTab("register")}
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                authTab === "register"
                  ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>{t.loginTabRegister}</span>
            </button>
          </div>

          {/* TAB A: LOGIN */}
          {authTab === "login" && (
            <div className="space-y-6">
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {t.loginIdLabel}
                  </label>
                  <input
                    type="text"
                    required
                    value={loginForm.login_id}
                    onChange={(e) => setLoginForm({ ...loginForm, login_id: e.target.value })}
                    placeholder={t.loginIdPlaceholder}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {t.passwordLabel}
                  </label>
                  <input
                    type="password"
                    required
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    placeholder={t.passwordPlaceholder}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isAuthLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  ) : (
                    <KeyRound className="w-4 h-4 text-slate-950" />
                  )}
                  <span>{t.btnLogin}</span>
                </button>
              </form>

{/* 1-Click 3-Role Demo Cards (v3.1 RBAC) */}
              <div className="pt-4 border-t border-slate-700/80">
                <div className="flex items-center justify-between gap-2 mb-3 text-amber-400 font-bold text-xs">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>૧-ક્લિક ૩-રોલ ડેમો કાર્ડ્સ (1-Click 3-Role Demo Cards):</span>
                  </div>
                  <span className="text-[10px] font-mono bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded border border-amber-500/20">
                    EMB-1001 (Surat)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Role 1: OWNER */}
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin("owner", "123456")}
                    disabled={isAuthLoading}
                    className="p-3 bg-slate-900/90 hover:bg-slate-900 border border-amber-500/40 hover:border-amber-400 rounded-2xl text-left transition-all group shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          👑 OWNER (શેઠ)
                        </span>
                        <span className="text-[9px] text-amber-400 font-bold">Surat</span>
                      </div>
                      <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                        Prince (શેઠ)
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                        તમામ ૪ ટેબ • કોસ્ટિંગ • પાર્ટી ખાતું • સ્ટાફ મેનેજમેન્ટ
                      </p>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800 pt-1.5">
                      <span className="font-mono text-amber-400 font-bold">ID: owner</span>
                      <span className="text-amber-400 font-bold group-hover:translate-x-0.5 transition-transform">
                        પ્રવેશ →
                      </span>
                    </div>
                  </button>

                  {/* Role 2: MASTER */}
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin("master", "123456")}
                    disabled={isAuthLoading}
                    className="p-3 bg-slate-900/90 hover:bg-slate-900 border border-blue-500/40 hover:border-blue-400 rounded-2xl text-left transition-all group shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          📋 MASTER (માસ્તર)
                        </span>
                        <span className="text-[9px] text-blue-400 font-bold">Supervisor</span>
                      </div>
                      <h4 className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                        Bharatbhai (માસ્તર)
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                        વોટ્સએપ બોટ • બાકી માલ • મશીન શિફ્ટ • કારીગર ઉપાડ
                      </p>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800 pt-1.5">
                      <span className="font-mono text-blue-400 font-bold">ID: master</span>
                      <span className="text-blue-400 font-bold group-hover:translate-x-0.5 transition-transform">
                        પ્રવેશ →
                      </span>
                    </div>
                  </button>

                  {/* Role 3: KARIGAR */}
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin("karigar", "123456")}
                    disabled={isAuthLoading}
                    className="p-3 bg-slate-900/90 hover:bg-slate-900 border border-emerald-500/40 hover:border-emerald-400 rounded-2xl text-left transition-all group shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          ⚙️ KARIGAR (કારીગર)
                        </span>
                        <span className="text-[9px] text-emerald-400 font-bold">Operator</span>
                      </div>
                      <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                        Ramesh Karigar
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                        મશીન શિફ્ટ બદલો (+₹૬૭.૫૦ બોનસ) • પગાર & ઉપાડ ખાતું
                      </p>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800 pt-1.5">
                      <span className="font-mono text-emerald-400 font-bold">ID: karigar</span>
                      <span className="text-emerald-400 font-bold group-hover:translate-x-0.5 transition-transform">
                        પ્રવેશ →
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB B: REGISTER */}
          {authTab === "register" && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {t.factoryNameLabel} *
                  </label>
                  <input
                    type="text"
                    required
                    value={registerForm.factory_name}
                    onChange={(e) => setRegisterForm({ ...registerForm, factory_name: e.target.value })}
                    placeholder="દા.ત. શ્રી રાધે એમ્બ્રોઇડરી"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {t.ownerNameLabel} *
                  </label>
                  <input
                    type="text"
                    required
                    value={registerForm.owner_name}
                    onChange={(e) => setRegisterForm({ ...registerForm, owner_name: e.target.value })}
                    placeholder="દા.ત. સંજયભાઈ પટેલ"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {t.phoneLabel} *
                  </label>
                  <input
                    type="text"
                    required
                    value={registerForm.phone}
                    onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                    placeholder="દા.ત. 9879012345"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {t.passwordLabel} *
                  </label>
                  <input
                    type="password"
                    required
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    placeholder="પાસવર્ડ દાખલ કરો"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {t.cityLabel}
                  </label>
                  <select
                    value={registerForm.city}
                    onChange={(e) => setRegisterForm({ ...registerForm, city: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="Surat">Surat (સુરત)</option>
                    <option value="Ahmedabad">Ahmedabad (અમદાવાદ)</option>
                    <option value="Jetpur">Jetpur (જેતપુર)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {t.gstinLabel}
                  </label>
                  <input
                    type="text"
                    value={registerForm.gstin}
                    onChange={(e) => setRegisterForm({ ...registerForm, gstin: e.target.value })}
                    placeholder="24AAAPL9999Z1Z1"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {t.addressLabel}
                </label>
                <input
                  type="text"
                  value={registerForm.address}
                  onChange={(e) => setRegisterForm({ ...registerForm, address: e.target.value })}
                  placeholder="પ્લોટ નં. ૧૨, એ.કે. રોડ, સુરત"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {t.bankNameLabel}
                  </label>
                  <input
                    type="text"
                    value={registerForm.bank_name}
                    onChange={(e) => setRegisterForm({ ...registerForm, bank_name: e.target.value })}
                    placeholder="State Bank of India"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {t.bankAccountNoLabel}
                  </label>
                  <input
                    type="text"
                    value={registerForm.bank_account_no}
                    onChange={(e) => setRegisterForm({ ...registerForm, bank_account_no: e.target.value })}
                    placeholder="30129845612"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {t.bankIfscLabel}
                  </label>
                  <input
                    type="text"
                    value={registerForm.bank_ifsc}
                    onChange={(e) => setRegisterForm({ ...registerForm, bank_ifsc: e.target.value })}
                    placeholder="SBIN0001234"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {t.upiIdLabel}
                </label>
                <input
                  type="text"
                  value={registerForm.upi_id}
                  onChange={(e) => setRegisterForm({ ...registerForm, upi_id: e.target.value })}
                  placeholder="radhe.embroidery@oksbi"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {lang === "gu"
                    ? "૧૫ દિવસ મફત ટ્રાયલ સાથે તાત્કાલિક EMB-XXXX ફેક્ટરી કોડ જનરેટ થશે."
                    : "Immediate EMB-XXXX factory code generated with 15-day full SaaS trial."}
                </span>
              </div>

              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAuthLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                ) : (
                  <Building className="w-4 h-4 text-slate-950" />
                )}
                <span>{t.btnRegister}</span>
              </button>
            </form>
          )}
        </main>

        {/* Footer */}
        <footer className="max-w-4xl w-full mx-auto text-center text-xs text-slate-500 pt-4 border-t border-slate-800">
          ChallanAI (EmbroideryOS) v3.0 Multi-Tenant B2B SaaS • High Performance Next.js 14 & FastAPI
        </footer>
      </div>
    );
  }


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
          {/* Brand & Tenant Identification */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-white shadow-md shadow-amber-500/20 font-bold text-lg shrink-0">
              {currentFactory?.factory_name?.slice(0, 3) || "શ્રી"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  {currentFactory?.factory_name || t.appTitle}
                </h1>
                {currentFactory && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black font-mono bg-emerald-100 text-emerald-800 border border-emerald-300">
                    ID: {currentFactory.factory_code}
                  </span>
                )}
              </div>
              <div className="text-[11px] sm:text-xs text-slate-500 font-medium flex items-center flex-wrap gap-1.5 mt-0.5">
                <span>{currentFactory?.city || "Surat"}</span>
                {currentUser && (
                  <>
                    <span>•</span>
                    <span className="text-slate-800 font-semibold">{currentUser.full_name}</span>
                    {currentUser.role === "OWNER" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-xs">
                        <span>👑</span>
                        <span>OWNER (શેઠ)</span>
                      </span>
                    )}
                    {currentUser.role === "MASTER" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300 flex items-center gap-1 shadow-xs">
                        <span>📋</span>
                        <span>MASTER (માસ્તર)</span>
                      </span>
                    )}
                    {currentUser.role === "KARIGAR" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1 shadow-xs">
                        <span>⚙️</span>
                        <span>KARIGAR (કારીગર)</span>
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Status & Tenant Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">

            {/* Cloud & API Integrations Live Status Badge */}
            <button
              onClick={() => setIntegrationsModalOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-bold transition-all shadow-sm ${
                integrations?.database.mode === "NEON_POSTGRESQL"
                  ? "border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800"
                  : "border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800"
              }`}
              title="Cloud & API Integrations Diagnostics"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="hidden sm:inline">
                {integrations?.database.mode === "NEON_POSTGRESQL" ? "Neon Cloud • Gemini AI" : "Cloud Status"}
              </span>
            </button>

            {/* Manage Staff & Roles Button (ONLY for OWNER) */}
            {currentUser?.role === "OWNER" && (
              <button
                onClick={handleOpenStaffModal}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold transition-all shadow-sm"
                title={t.btnStaffManagement}
              >
                <Users className="w-3.5 h-3.5 text-indigo-700" />
                <span className="hidden sm:inline">{t.btnStaffManagement}</span>
              </button>
            )}

            {/* Factory Profile & Plan Modal Button (ONLY for OWNER) */}
            {currentUser?.role === "OWNER" && (
              <button
                onClick={() => {
                  setProfileForm(currentFactory || {});
                  setProfileModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-sm"
                title={t.btnFactoryProfile}
              >
                <Settings className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">{t.btnFactoryProfile}</span>
              </button>
            )}

            {/* Logout / Switch Owner Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all shadow-sm"
              title={t.btnLogout}
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">{t.btnLogout}</span>
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

      {/* --- TAB NAVIGATION BAR (3-ROLE RBAC) --- */}
      <nav className="no-print bg-slate-900 text-slate-300 border-b border-slate-800 sticky top-[57px] z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center overflow-x-auto scrollbar-none px-2 sm:px-4">
          {(
            currentUser?.role === "KARIGAR"
              ? [
                  { id: "shifts", label: lang === "gu" ? "🖥️ મશીન શિફ્ટ બદલો" : "🖥️ Machine Shift Change", icon: Clock },
                  { id: "karigar", label: lang === "gu" ? "👷 કારીગર ઉપાડ & પગાર" : "👷 Karigar Upaad & Salary", icon: UserIcon },
                ]
              : currentUser?.role === "MASTER"
              ? [
                  { id: "bot", label: t.tabBot, icon: Sparkles },
                  { id: "pending", label: t.tabPending, icon: Package },
                  { id: "shifts", label: lang === "gu" ? "🖥️ મશીન શિફ્ટ બદલો" : "🖥️ Machine Shift Change", icon: Clock },
                  { id: "karigar", label: lang === "gu" ? "👷 કારીગર ઉપાડ & પગાર" : "👷 Karigar Upaad & Salary", icon: UserIcon },
                ]
              : [
                  { id: "bot", label: t.tabBot, icon: Sparkles },
                  { id: "pending", label: t.tabPending, icon: Package },
                  { id: "calculator", label: t.tabCalculator, icon: Calculator },
                  { id: "ledger", label: t.tabLedger, icon: FileText },
                ]
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive =
              tab.id === "shifts"
                ? activeTab === "calculator" && tab3SubTab === "shifts"
                : tab.id === "karigar"
                ? activeTab === "calculator" && tab3SubTab === "karigar"
                : activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === "shifts") {
                    setActiveTab("calculator");
                    setTab3SubTab("shifts");
                  } else if (tab.id === "karigar") {
                    setActiveTab("calculator");
                    setTab3SubTab("karigar");
                  } else {
                    setActiveTab(tab.id as any);
                  }
                }}
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
                  className="text-left px-3 py-2.5 bg-white rounded-xl border border-amber-200 hover:border-amber-400 hover:shadow-sm text-xs font-semibold text-slate-800 transition-all flex items-center justify-between gap-2 group"
                >
                  <span className="leading-tight">{t.presetRadhe}</span>
                  <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-mono shrink-0">
                    1200 PC
                  </span>
                </button>
                <button
                  onClick={() => triggerPreset("preset_maruti_outward.jpg")}
                  disabled={isProcessing}
                  className="text-left px-3 py-2.5 bg-white rounded-xl border border-amber-200 hover:border-amber-400 hover:shadow-sm text-xs font-semibold text-slate-800 transition-all flex items-center justify-between gap-2 group"
                >
                  <span className="leading-tight">{t.presetMaruti}</span>
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-mono shrink-0">
                    Tranche
                  </span>
                </button>
                <button
                  onClick={() => triggerPreset("preset_duplicate_guard.jpg")}
                  disabled={isProcessing}
                  className="text-left px-3 py-2.5 bg-white rounded-xl border border-rose-200 hover:border-rose-400 hover:shadow-sm text-xs font-semibold text-rose-800 transition-all flex items-center justify-between gap-2 group"
                >
                  <span className="leading-tight">{t.presetDuplicate}</span>
                  <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded font-mono shrink-0">
                    409 Guard
                  </span>
                </button>
                <button
                  onClick={() => triggerPreset("preset_dahao_lcd.jpg")}
                  disabled={isProcessing}
                  className="text-left px-3 py-2.5 bg-white rounded-xl border border-indigo-200 hover:border-indigo-400 hover:shadow-sm text-xs font-semibold text-indigo-800 transition-all flex items-center justify-between gap-2 group"
                >
                  <span className="leading-tight">{t.presetDahao}</span>
                  <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-mono shrink-0">
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
                  accept="image/*,application/pdf,.pdf"
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
                  title="ચલણ ફોટો અથવા PDF અપલોડ કરો (Upload Challan Photo or PDF)"
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
            {filteredLots.length === 0 && (
              <div className="bg-white rounded-3xl border-2 border-dashed border-amber-300 p-8 sm:p-12 text-center space-y-4 shadow-sm max-w-2xl mx-auto my-6">
                <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
                  🎉
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {t.welcomeNewTenant}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {lang === "gu"
                      ? "તમારા કારખાનામાં હજુ સુધી કોઈ લોટ નોંધાયેલ નથી. તાત્કાલિક પ્રથમ આવક ચલણ દાખલ કરવા નીચે ક્લિક કરો:"
                      : "No active lots found in your factory workspace yet. Click below to add your first inward challan or test via WhatsApp Bot:"}
                  </p>
                </div>
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setActiveTab("bot");
                      triggerPreset("preset_radhe_inward.jpg");
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t.btnAddPartyLot}</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("bot")}
                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>{t.tabBot}</span>
                  </button>
                </div>
              </div>
            )}

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
                  ...(currentUser?.role === "OWNER"
                    ? [{ id: "calculator", label: t.subTabCalc, icon: Calculator }]
                    : []),
                  { id: "shifts", label: t.subTabShifts, icon: Clock },
                  { id: "karigar", label: t.subTabKarigar, icon: UserIcon },
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

              {/* Design Catalog Shortcut in Tab 3 (OWNER & MASTER ONLY) */}
              {currentUser?.role !== "KARIGAR" && (
                <button
                  onClick={() => setDesignGalleryOpen(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Palette className="w-3.5 h-3.5 text-purple-600" />
                  <span>{t.btnDesignCatalog}</span>
                </button>
              )}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {t.materialCost}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={calcInputs.material_cost_per_piece}
                    onChange={(e) => {
                      const updated = { ...calcInputs, material_cost_per_piece: Number(e.target.value) };
                      setCalcInputs(updated);
                      recalcQuote(updated);
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl font-mono focus:border-amber-500 focus:outline-none text-emerald-800 font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">દોરો + જરી + પેપર ખર્ચ</span>
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
                        <UserIcon className="w-5 h-5 text-amber-600" />
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
                    {partyLedger?.factory_profile?.factory_name || currentFactory?.factory_name || t.appTitle}
                  </h2>
                  <p className="text-xs text-slate-600 font-medium">
                    {partyLedger?.factory_profile?.address || currentFactory?.address || "પ્લોટ નં. ૪૫, એમ્બ્રોઇડરી પાર્ક, વરાછા રોડ, સુરત"} {currentFactory?.phone ? `• મો: +91 ${currentFactory.phone}` : ""}
                  </p>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    GSTIN: {partyLedger?.factory_profile?.gstin || currentFactory?.gstin || "24AAACS1234E1Z5"} • જોબ-વર્ક હિસાબ સ્ટેટમેન્ટ
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
                        <th className="p-2 border border-slate-300 text-rose-700">KASAR + FENT (કસર+ફેંટ)</th>
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
                          <td className="p-2 border border-slate-300 font-bold text-rose-700">
                            {out.fent_quantity > 0 ? (
                              <span>
                                {out.kasar_quantity + out.fent_quantity}{" "}
                                <span className="text-[10px] font-normal text-rose-600 font-sans">
                                  ({out.kasar_quantity} કસર + {out.fent_quantity} ફેંટ)
                                </span>
                              </span>
                            ) : (
                              <span>{out.kasar_quantity}</span>
                            )}
                          </td>
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
                  <p><strong className="text-slate-900">બેંકનું નામ:</strong> {partyLedger?.factory_profile?.bank_name || currentFactory?.bank_name || "HDFC Bank (વરાછા રોડ શાખા, સુરત)"}</p>
                  <p><strong className="text-slate-900">ખાતાધારક:</strong> {partyLedger?.factory_profile?.factory_name || currentFactory?.factory_name || "Shree Krishna Embroidery"}</p>
                  <p><strong className="text-slate-900">કરન્ટ ખાતા નં:</strong> <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-300">{partyLedger?.factory_profile?.bank_account_no || currentFactory?.bank_account_no || "50200089234120"}</span></p>
                  <p><strong className="text-slate-900">IFSC કોડ:</strong> <span className="font-mono font-bold">{partyLedger?.factory_profile?.bank_ifsc || currentFactory?.bank_ifsc || "HDFC0001234"}</span></p>
                  <p><strong className="text-slate-900">શાખા/સરનામું:</strong> {partyLedger?.factory_profile?.address || currentFactory?.address || "પ્લોટ નં. ૪૫, એમ્બ્રોઇડરી પાર્ક, વરાછા, સુરત - ૩૯૫૦૦૬"}</p>
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
                      {partyLedger?.factory_profile?.upi_id || currentFactory?.upi_id || "shreekrishna.embroidery@okaxis"}
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
      {/* FACTORY PROFILE & SUBSCRIPTION MODAL                      */}
      {/* ========================================================= */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Settings className="w-5 h-5" />
                <h3 className="font-bold text-base sm:text-lg">
                  {t.profileModalTitle}
                </h3>
              </div>
              <button
                onClick={() => setProfileModalOpen(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Tenant Badge & Plan Overview */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-amber-800 font-semibold">{t.subscriptionStatusTitle}</p>
                  <p className="text-sm font-extrabold text-slate-900">
                    {profileForm.subscription_plan || "TRIAL_15_DAYS"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {profileForm.factory_code || currentFactory?.factory_code}
                  </span>
                  <p className="text-[10px] text-slate-500 font-medium mt-1">
                    {currentFactory?.days_remaining ?? 15} {t.daysLeft}
                  </p>
                </div>
              </div>

              {/* Form fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t.factoryNameLabel}</label>
                  <input
                    type="text"
                    value={profileForm.factory_name || ""}
                    onChange={(e) => setProfileForm({ ...profileForm, factory_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t.ownerNameLabel}</label>
                  <input
                    type="text"
                    value={profileForm.owner_name || ""}
                    onChange={(e) => setProfileForm({ ...profileForm, owner_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t.cityLabel}</label>
                  <select
                    value={profileForm.city || "Surat"}
                    onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="Surat">Surat</option>
                    <option value="Ahmedabad">Ahmedabad</option>
                    <option value="Jetpur">Jetpur</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">{t.gstinLabel}</label>
                  <input
                    type="text"
                    value={profileForm.gstin || ""}
                    onChange={(e) => setProfileForm({ ...profileForm, gstin: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t.addressLabel}</label>
                <input
                  type="text"
                  value={profileForm.address || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              {/* Bank Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t.bankNameLabel}</label>
                  <input
                    type="text"
                    value={profileForm.bank_name || ""}
                    onChange={(e) => setProfileForm({ ...profileForm, bank_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t.bankAccountNoLabel}</label>
                  <input
                    type="text"
                    value={profileForm.bank_account_no || ""}
                    onChange={(e) => setProfileForm({ ...profileForm, bank_account_no: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t.bankIfscLabel}</label>
                  <input
                    type="text"
                    value={profileForm.bank_ifsc || ""}
                    onChange={(e) => setProfileForm({ ...profileForm, bank_ifsc: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* UPI ID */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t.upiIdLabel}</label>
                <input
                  type="text"
                  value={profileForm.upi_id || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, upi_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Subscription Plan Switcher */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  SaaS પ્લાન પસંદ કરો (Subscription Upgrade):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setProfileForm({ ...profileForm, subscription_plan: "TRIAL_15_DAYS" })}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      profileForm.subscription_plan === "TRIAL_15_DAYS"
                        ? "border-amber-500 bg-amber-50 text-amber-900 font-bold"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    <p className="font-bold text-xs">{t.subscriptionPlanTrial}</p>
                    <p className="text-[10px] text-slate-500">₹0 / ૧૫ દિવસ</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileForm({ ...profileForm, subscription_plan: "PRO_MONTHLY_1500" })}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      profileForm.subscription_plan === "PRO_MONTHLY_1500"
                        ? "border-amber-500 bg-amber-50 text-amber-900 font-bold"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    <p className="font-bold text-xs">{t.subscriptionPlanProMonthly}</p>
                    <p className="text-[10px] text-slate-500">₹૧,૫૦૦ / મહિને</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileForm({ ...profileForm, subscription_plan: "PRO_YEARLY_15000" })}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      profileForm.subscription_plan === "PRO_YEARLY_15000"
                        ? "border-amber-500 bg-amber-50 text-amber-900 font-bold"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    <p className="font-bold text-xs">{t.subscriptionPlanProYearly}</p>
                    <p className="text-[10px] text-emerald-700 font-bold">૨ મહિના મફત</p>
                  </button>
                </div>
              </div>

              {/* Cloud & External API Integration Status Card */}
              <div className="p-3.5 bg-slate-900 text-slate-200 rounded-2xl border border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>🔌 ક્લાઉડ અને API ઇન્ટિગ્રેશન સ્ટેટસ (Cloud Diagnostics)</span>
                  </h4>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  {/* Database */}
                  <div className="p-2 bg-slate-800 rounded-xl border border-slate-700">
                    <p className="text-slate-400 font-semibold">ડેટાબેઝ (Database):</p>
                    <p className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                      <span>🟢</span>
                      <span>{integrations?.database.mode === "NEON_POSTGRESQL" ? "Neon Cloud PostgreSQL" : "Local SQLite Fallback"}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                      {integrations?.database.host || "Connected"}
                    </p>
                  </div>

                  {/* Gemini AI */}
                  <div className="p-2 bg-slate-800 rounded-xl border border-slate-700">
                    <p className="text-slate-400 font-semibold">AI OCR (Image + PDF):</p>
                    <p className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                      <span>🟢</span>
                      <span>{integrations?.gemini_ai.mode === "GEMINI_2_5_FLASH_LIVE" ? "Gemini 2.5 Flash Live" : "Demo Fallback Mode"}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                      Image & PDF OCR Active
                    </p>
                  </div>

                  {/* Multi-Tenant SaaS Auth */}
                  <div className="p-2 bg-slate-800 rounded-xl border border-slate-700">
                    <p className="text-slate-400 font-semibold">મલ્ટી-ટેનન્ટ Auth:</p>
                    <p className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                      <span>🟢</span>
                      <span>ટેનન્ટ આઇસોલેશન Active</span>
                    </p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                      Factory ID: {currentFactory?.factory_code || "EMB-1001"}
                    </p>
                  </div>

                  {/* PDF & Tally Engine */}
                  <div className="p-2 bg-slate-800 rounded-xl border border-slate-700">
                    <p className="text-slate-400 font-semibold">PDF & ટેલી એન્જિન:</p>
                    <p className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                      <span>🟢</span>
                      <span>PDF + A4 + Tally CSV</span>
                    </p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                      All Engines Operational
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition-colors"
                >
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isUpdatingProfile ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{t.btnSaveProfile}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CLOUD & API INTEGRATIONS DIAGNOSTIC MODAL                 */}
      {/* ========================================================= */}
      {integrationsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🔌</span>
                <div>
                  <h3 className="font-bold text-base sm:text-lg">
                    ક્લાઉડ અને API ઇન્ટિગ્રેશન સ્ટેટસ
                  </h3>
                  <p className="text-xs text-emerald-200">
                    Cloud Services & API Integration Health Monitor
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIntegrationsModalOpen(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              {/* Database Card */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg shrink-0">
                  🐘
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900">Neon Serverless PostgreSQL</h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      LIVE
                    </span>
                  </div>
                  <p className="text-slate-600 mt-0.5 text-[11px]">
                    Status: <strong className="text-emerald-700">{integrations?.database.connected ? "Connected (સંપર્ક સ્થાપિત)" : "Disconnected"}</strong>
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono mt-1 break-all">
                    Host: {integrations?.database.host}
                  </p>
                </div>
              </div>

              {/* Gemini AI Card */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-lg shrink-0">
                  ✨
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900">Google Gemini Multimodal OCR</h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      LIVE
                    </span>
                  </div>
                  <p className="text-slate-600 mt-0.5 text-[11px]">
                    Model: <strong className="text-amber-800 font-mono">Gemini 2.5 Flash / 3.0</strong>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    સપોર્ટ: <strong>ચલણ ફોટા (JPEG, PNG, WebP)</strong> અને <strong>PDF ડોક્યુમેન્ટ્સ</strong>
                  </p>
                </div>
              </div>

              {/* Multi-Tenant SaaS Auth Card */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-lg shrink-0">
                  🔐
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900">Multi-Tenant SaaS Security</h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                      SECURE
                    </span>
                  </div>
                  <p className="text-slate-600 mt-0.5 text-[11px]">
                    Stateless HMAC-SHA256 Token Auth + 100% Tenant Isolation
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    સક્રિય કારખાનું: <strong className="text-slate-800">{currentFactory?.factory_name} (ID: {currentFactory?.factory_code})</strong>
                  </p>
                </div>
              </div>

              {/* PDF & Tally Engine */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-lg shrink-0">
                  📄
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900">PDF Reader & Tally Export</h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                      READY
                    </span>
                  </div>
                  <p className="text-slate-600 mt-0.5 text-[11px]">
                    WhatsApp Inward PDF OCR + A4 Printable Ledger + Tally XML/CSV
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIntegrationsModalOpen(false)}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  બંધ કરો (Close)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STAFF & ROLE MANAGEMENT MODAL (OWNER ONLY)                */}
      {/* ========================================================= */}
      {staffModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-indigo-300" />
                <div>
                  <h3 className="font-bold text-base sm:text-lg">
                    {t.staffModalTitle}
                  </h3>
                  <p className="text-xs text-indigo-200">
                    {lang === "gu"
                      ? "તમારા કારખાના માટે માસ્તર અને કારીગર એકાઉન્ટ બનાવો અને મેનેજ કરો"
                      : "Create and manage Master & Karigar team accounts under your factory"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStaffModalOpen(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* Role Matrix Explanation Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200">
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black bg-amber-200 text-amber-900">
                    👑 OWNER (શેઠ)
                  </span>
                  <p className="text-[11px] text-slate-700 font-semibold mt-1">
                    {lang === "gu" ? "સંપૂર્ણ અધિકાર (Full Access)" : "Full Access Admin"}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {lang === "gu"
                      ? "બધા ૪ ટેબ + સ્ટીચ ભાવ ગણતરી + પાર્ટી ખાતાવહી + સ્ટાફ મેનેજમેન્ટ"
                      : "All 4 Tabs + Costing Calculator + Party Ledger + Staff"}
                  </p>
                </div>

                <div className="p-2.5 rounded-2xl bg-sky-50 border border-sky-200">
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black bg-sky-200 text-sky-900">
                    📋 MASTER (માસ્તર)
                  </span>
                  <p className="text-[11px] text-slate-700 font-semibold mt-1">
                    {lang === "gu" ? "ફ્લોર સુપરવાઈઝર (Floor Head)" : "Floor Supervisor"}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {lang === "gu"
                      ? "વોટ્સએપ બોટ + બાકી માલ + શિફ્ટ લોગ્સ + કારીગર ઉપાડ (ખાતાવહી બંધ)"
                      : "WhatsApp Bot + Pending Lots + Shift Logs + Upaad"}
                  </p>
                </div>

                <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black bg-emerald-200 text-emerald-900">
                    ⚙️ KARIGAR (કારીગર)
                  </span>
                  <p className="text-[11px] text-slate-700 font-semibold mt-1">
                    {lang === "gu" ? "મશીન ઓપરેટર (Operator)" : "Machine Operator"}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {lang === "gu"
                      ? "માત્ર મશીન શિફ્ટ સ્ટીચ લોગિંગ + પોતાનો ઉપાડ અને પગાર ખાતું"
                      : "Machine Shift Logs & Karigar Upaad & Salary ONLY"}
                  </p>
                </div>
              </div>

              {/* Add New Staff Form */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                  <h4 className="font-bold text-slate-900 text-sm">
                    {lang === "gu" ? "➕ નવો માસ્તર કે કારીગર ઉમેરો" : "➕ Add New Staff Account"}
                  </h4>
                </div>

                <form onSubmit={handleAddStaffSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {lang === "gu" ? "કર્મચારીનું પૂરું નામ" : "Full Name"} *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={lang === "gu" ? "દા.ત. સુરેશ માસ્તર" : "e.g. Suresh Floor Master"}
                        value={staffForm.full_name}
                        onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {lang === "gu" ? "લોગિન આઈડી / મોબાઈલ નંબર" : "Login ID / Mobile"} *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={lang === "gu" ? "દા.ત. suresh અથવા 9825011111" : "e.g. suresh or 9825011111"}
                        value={staffForm.login_id}
                        onChange={(e) => setStaffForm({ ...staffForm, login_id: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {lang === "gu" ? "પાસવર્ડ / પિન" : "Password / PIN"} *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="123456"
                        value={staffForm.password}
                        onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {lang === "gu" ? "રોલ પસંદ કરો (Role Permission)" : "Select Role"} *
                      </label>
                      <select
                        value={staffForm.role}
                        onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value as "OWNER" | "MASTER" | "KARIGAR" })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                      >
                        <option value="MASTER">
                          📋 MASTER (માસ્તર - Floor Supervisor)
                        </option>
                        <option value="KARIGAR">
                          ⚙️ KARIGAR (કારીગર - Machine Operator)
                        </option>
                        <option value="OWNER">
                          👑 OWNER (શેઠ - Partner/Co-Owner)
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isAddingStaff}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md disabled:opacity-50"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>
                        {isAddingStaff
                          ? lang === "gu" ? "ઉમેરાઈ રહ્યું છે..." : "Adding..."
                          : lang === "gu" ? "➕ સ્ટાફ એકાઉન્ટ બનાવો" : "Create Staff Account"}
                      </span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Existing Staff Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-600" />
                    <span>
                      {lang === "gu" ? "કારખાનાના સક્રિય સ્ટાફ એકાઉન્ટ્સ" : "Active Factory Staff Accounts"}
                    </span>
                    <span className="text-xs text-slate-500 font-normal">
                      ({staffList.length} {lang === "gu" ? "સભ્યો" : "members"})
                    </span>
                  </h4>
                  <button
                    type="button"
                    onClick={loadStaffMembers}
                    disabled={isStaffLoading}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isStaffLoading ? "animate-spin" : ""}`} />
                    <span>{lang === "gu" ? "રીફ્રેશ" : "Refresh"}</span>
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">કર્મચારી (Name & ID)</th>
                        <th className="p-2.5">લોગિન આઈડી (Username)</th>
                        <th className="p-2.5">રોલ (Role)</th>
                        <th className="p-2.5 text-right">એક્શન (Action)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {staffList.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 font-bold text-slate-900">
                            {member.full_name}
                            <span className="block text-[10px] text-slate-400 font-mono font-normal">
                              {member.user_code}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono text-slate-700 font-bold">
                            {member.login_id}
                          </td>
                          <td className="p-2.5">
                            {member.role === "OWNER" ? (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                                👑 OWNER
                              </span>
                            ) : member.role === "MASTER" ? (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-300">
                                📋 MASTER
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                ⚙️ KARIGAR
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-right">
                            {member.id === currentUser?.id ? (
                              <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-1 rounded">
                                {lang === "gu" ? "તમારું એકાઉન્ટ (You)" : "You (Active)"}
                              </span>
                            ) : member.role === "OWNER" ? (
                              <span className="text-[10px] text-slate-400 font-medium">
                                Co-Owner
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDeleteStaff(member.id, member.full_name)}
                                className="px-2 py-1 text-[11px] rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold transition-all"
                              >
                                🗑️ દૂર કરો
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setStaffModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
              >
                {lang === "gu" ? "બંધ કરો" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ADD-ON SECTION 5: ⚡ FLOATING SPEED ACTION BUTTON & MENU   */}
      {/* ========================================================= */}
      {currentUser?.role !== "KARIGAR" && (
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
      )}
    </div>
  );
}
