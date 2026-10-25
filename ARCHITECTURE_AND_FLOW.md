# ChallanAI (EmbroideryOS) - System Architecture & End-to-End Flow Blueprint (v2.0)

> **File:** `ARCHITECTURE_AND_FLOW.md`  
> **System:** ChallanAI (EmbroideryOS) - Job-Work & Lot Reconciliation Operating System  
> **Target Clusters:** Gujarat Textile Hubs (Surat, Ahmedabad, Jetpur)  
> **Languages Supported:** Gujarati (`ગુજરાતી`) & English (`EN`)  
> **Specification Version:** `2.0 (Production Blueprint with Real-World Gujarat Job-Work Extensions)`  
> **Status:** Single Source of Truth (SSOT) Architecture Blueprint

---

## TABLE OF CONTENTS
1. [SECTION 1: High-Level System Architecture Diagram](#section-1-high-level-system-architecture-diagram)
   - 1.1 Five-Layer Architectural Stack
   - 1.2 Mermaid System Topology Diagram
   - 1.3 Master End-to-End Operational & Data Flowchart (Mermaid)
   - 1.4 ASCII System Architecture Map
   - 1.5 Detailed Layer Responsibilities & Protocols
2. [SECTION 2: Complete Repository Folder & File Tree](#section-2-complete-repository-folder--file-tree)
   - 2.1 Repository Directory Structure
   - 2.2 Deep File Responsibility & Boundary Matrix
3. [SECTION 3: Database Entity-Relationship (ER) Schema & Mathematical Models](#section-3-database-entity-relationship-er-schema--mathematical-models)
   - 3.1 Mermaid Entity-Relationship (ER) Diagram (v2.0)
   - 3.2 SQLModel Table Definitions & Field Constraints (v2.0)
   - 3.3 Core Mathematical Reconciliation & Financial Formulas (v2.0)
   - 3.4 Lot Balance State Machine & Lifecycle Transitions
4. [SECTION 4: Multimodal AI & Gujarati Vernacular Parsing Pipeline](#section-4-multimodal-ai--gujarati-vernacular-parsing-pipeline)
   - 4.1 Gemini 2.5 Flash Vision OCR Architecture (`google-genai` SDK)
   - 4.2 Gujarati Numeral Transliteration Engine
   - 4.3 Multimodal Prompt Blueprint & Strict JSON Schema (v2.0)
   - 4.4 Vernacular Voice/Text Intent Parsing Pipeline
   - 4.5 Machine LCD Stitch Counter Vision Parser
   - 4.6 Deterministic Offline & Local Demo Fallback Engine (4 Core Presets)
5. [SECTION 5: End-to-End User & Business Logic Flows](#section-5-end-to-end-user--business-logic-flows)
   - 5.1 Flow A: Physical Inward Challan Capture & Reconciliation
   - 5.2 Flow B: Tranche Partial Outward Dispatch, Returned Raw (`કાચો પરત`) & Kasar Dispute Prevention
   - 5.3 Flow C: Machine LCD Shift Stitch Tracking & Operator Bonus Calculation
   - 5.4 Flow D: Party Ledger, Zero-Dispute A4 Settlement & Tally Prime Export
6. [SECTION 6: API Endpoint Specification, Request/Response Contracts & Error Handling](#section-6-api-endpoint-specification-requestresponse-contracts--error-handling)
   - 6.1 REST Endpoint Master Table (Including Dashboard & Ledger Summary)
   - 6.2 Typed Request & Response JSON Contracts (v2.0)
   - 6.3 Validation Guards, Error Matrices & HTTP Status Codes

---

# SECTION 1: HIGH-LEVEL SYSTEM ARCHITECTURE DIAGRAM

ChallanAI (EmbroideryOS) is architected specifically for the rough, fast-paced environment of textile embroidery job-work factories. Floor operators ("Karigars") and supervisors ("Masters") need zero-friction capture (camera photos, WhatsApp voice/text in Gujarati), while factory owners ("Sethiayas") need mathematical precision to eliminate month-end "Kasar" (shortage/damage deduction) disputes and track unembroidered returned raw fabric (`કાચો માલ પરત`) with merchant clients ("Parties").

### 1.1 Five-Layer Architectural Stack

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 1. USER & SHOP-FLOOR LAYER                                                    │
│    • Factory Owner / Floor Supervisor ("Master") / Machine Operator ("Karigar")│
│    • Inputs: Smartphone Camera, WhatsApp Audio/Text, Web PWA (ગુજરાતી / EN)    │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │ HTTPS / WebRTC / Media
┌──────────────────────────────────────▼───────────────────────────────────────┐
│ 2. FRONTEND LAYER (Next.js 14 App Router, Port 3000)                         │
│    • Mobile-First PWA (360px - 430px optimized, desktop tablet compatible)   │
│    • 4 Tabs: 💬 WhatsApp Bot | 📦 Pending Lots | 🧮 Stitch Calc | 📄 Ledger   │
│    • Bilingual Engine (Instant Gujarati <-> English switch)                  │
│    • Print-Ready A4 PDF Engine (@media print) + Client-Side Offline Cache    │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │ REST API (JSON / Multipart Form-Data)
┌──────────────────────────────────────▼───────────────────────────────────────┐
│ 3. API & BUSINESS LOGIC LAYER (FastAPI + SQLModel, Port 8000)                │
│    • Duplicate Challan Guard & Cross-Party Collision Check                   │
│    • v2.0 Lot Reconciliation Engine (Fresh, Returned Raw, Kasar, Fent)       │
│    • Stitch-to-Profit Costing Engine (RPM, Heads, Thread, Margin)           │
│    • Karigar Shift Bonus & Persisted Machine Efficiency Downtime Analyzer   │
│    • Tally Prime CSV & WhatsApp Udhari Reminder URL Generator                │
└──────────────────┬───────────────────────────────────────────┬───────────────┘
                   │ gRPC / REST (google-genai)                │ SQL (psycopg3)
┌──────────────────▼──────────────────────────┐ ┌──────────────▼───────────────┐
│ 4. MULTIMODAL AI & OCR LAYER                │ │ 5. DATABASE & STORAGE LAYER  │
│    • Google Gemini 2.5 Flash Vision         │ │ • Neon Serverless PostgreSQL │
│    • Gujarati Numeral Converter (૧,૨,૩->1,2,3)│ │   (Pooled, SSL require)     │
│    • Vernacular Audio/Text Intent Extractor │ │ • Auto SQLite Fallback       │
│    • Machine LCD Counter OCR                │ │   (Local zero-config dev)    │
│    • Deterministic Offline Demo Fallback    │ │ • Static /uploads Directory  │
│      (4 Surat Presets: Inward, Outward,     │ │   (Challan photos, design    │
│       Duplicate Guard, LCD Counter)         │ │    samples, LCD photos)      │
└─────────────────────────────────────────────┘ └──────────────────────────────┘
```

---

### 1.2 Mermaid System Topology Diagram

```mermaid
flowchart TB
    subgraph Layer1["1. User & Shop-Floor Layer"]
        User["Factory Owner / Floor Master / Karigar"]
        InputCam["Smartphone Camera (Slip / LCD Photo / Design Sample)"]
        InputChat["WhatsApp Audio / Text (Gujarati / English)"]
        PWA["Bilingual Web PWA (ગુજરાતી / EN)"]
        User --> InputCam
        User --> InputChat
        User --> PWA
    end

    subgraph Layer2["2. Frontend Presentation Layer (Next.js 14 - Port 3000)"]
        AppRouter["Next.js App Router (TypeScript + Tailwind CSS)"]
        Tab1["Tab 1: 💬 WhatsApp AI Bot Simulator\n(Preset Quick-Tests, OCR Cards)"]
        Tab2["Tab 2: 📦 બાકી માલ (Pending Floor Stock)\n(Inward vs Fresh vs Returned Raw vs Kasar)"]
        Tab3["Tab 3: 🧮 સ્ટીચ ભાવ & શિફ્ટ લોગ (Stitch & Shift)\n(Cost Calculator, Day/Night LCD Bonus)"]
        Tab4["Tab 4: 📄 પાર્ટી ખાતું (Photo-Backed Ledger)\n(Billing Summary, WhatsApp Udhari Link)"]
        PrintEngine["@media print A4 Engine (Zero-Dispute Slip)"]
        OfflineCache["Client-Side Offline Data Cache (Zustand/Local)"]
        
        PWA --> AppRouter
        AppRouter --> Tab1
        AppRouter --> Tab2
        AppRouter --> Tab3
        AppRouter --> Tab4
        AppRouter --> PrintEngine
        AppRouter --> OfflineCache
    end

    subgraph Layer3["3. API & Business Logic Layer (FastAPI - Port 8000)"]
        FastAPI["FastAPI Application (Uvicorn + Pydantic v2)"]
        RouterChallan["/api/challans (Inward/Outward Router)"]
        RouterLots["/api/lots (Reconciliation & Dispatch Router)"]
        RouterAI["/api/ai (Vision OCR & NLP Router)"]
        RouterCalc["/api/calculator & /api/shifts"]
        RouterLedger["/api/ledger & /api/dashboard & /api/parties"]

        DupGuard["Duplicate Challan Guard (Party + Slip No Check)"]
        ReconEngine["v2.0 Lot Reconciliation Engine\n(Q_in - Q_fresh - Q_raw_ret - Q_kasar - Q_fent)"]
        CostEngine["Stitch-to-Profit Costing Engine (Break-Even & Quote)"]
        BonusEngine["Karigar Shift Bonus & Downtime Persister"]
        TallyGen["Tally Prime CSV & WhatsApp Udhari Link Gen"]

        FastAPI --> RouterChallan
        FastAPI --> RouterLots
        FastAPI --> RouterAI
        FastAPI --> RouterCalc
        FastAPI --> RouterLedger

        RouterChallan --> DupGuard
        RouterLots --> ReconEngine
        RouterCalc --> CostEngine
        RouterCalc --> BonusEngine
        RouterLedger --> TallyGen
    end

    subgraph Layer4["4. Multimodal AI & OCR Layer (ai_service.py)"]
        GeminiFlash["Google Gemini 2.5 Flash API (google-genai SDK)"]
        NumParser["Gujarati Numeral Transliteration (૧,૨,૩ -> 1,2,3)"]
        VernacularNLP["Gujarati/Hindi Intent & Entity Extractor"]
        LCDReader["7-Segment / LCD Stitch Counter OCR"]
        DemoFallback["Deterministic Local Fallback Engine\n(4 Surat Demo Presets)"]

        RouterAI --> GeminiFlash
        GeminiFlash --> NumParser
        GeminiFlash --> VernacularNLP
        GeminiFlash --> LCDReader
        RouterAI -.->|No API Key / Offline| DemoFallback
    end

    subgraph Layer5["5. Database & Storage Layer (database.py)"]
        NeonDB[("Neon Serverless PostgreSQL (Pooled, SSL Require)")]
        SQLiteDB[("Local SQLite Fallback (embroidery_os.db)")]
        UploadsFS[("Local File System: /uploads (Challans, Designs, LCDs)")]

        DupGuard & ReconEngine & CostEngine & BonusEngine & TallyGen --> NeonDB
        NeonDB -.->|Fallback if no DATABASE_URL| SQLiteDB
        FastAPI -->|Static Mount /uploads| UploadsFS
    end

    InputCam -->|Upload Photo| Tab1
    InputChat -->|Send Message| Tab1
    Tab1 & Tab2 & Tab3 & Tab4 -->|Fetch / Mutate| FastAPI
```

---

### 1.3 Master End-to-End Operational & Data Flowchart (Mermaid)

The following master flowchart visualizes the complete operational lifecycle of an order from arrival of raw fabric and paper challan to final month-end zero-dispute settlement and Tally Prime accounting:

```mermaid
flowchart TD
    %% Node Styling
    classDef startNode fill:#f97316,stroke:#ea580c,stroke-width:2px,color:#fff;
    classDef partyNode fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#fff;
    classDef aiNode fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff;
    classDef floorNode fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff;
    classDef calcNode fill:#06b6d4,stroke:#0891b2,stroke-width:2px,color:#fff;
    classDef dbNode fill:#475569,stroke:#334155,stroke-width:2px,color:#fff;
    classDef alertNode fill:#e11d48,stroke:#be123c,stroke-width:2px,color:#fff;

    subgraph STAGE1["STAGE 1: INWARD FABRIC & CHALLAN CAPTURE (આવક ચલણ)"]
        Party["Merchant Client ('Party')\nSends Fabric (Taka/Meters/Pcs) + Paper Slip"]:::partyNode
        Arrival["Goods & Handwritten Paper Challan\nArrive at Factory Floor"]
        PhotoSnap["Supervisor ('Master') snaps photo via\nSmartphone Camera / WhatsApp Bot Tab 1"]:::startNode
        VoiceNote["Or dictates Gujarati voice/text note\n('રાધે ક્રિએશન ડીઝાઇન ૧૦૨૪ ના ૧૨૦૦ પીસ, ભાવ ૪૨')"]
        
        Party --> Arrival
        Arrival --> PhotoSnap
        Arrival --> VoiceNote
    end

    subgraph STAGE2["STAGE 2: MULTIMODAL AI & GUJARATI OCR PIPELINE (ai_service.py)"]
        APICall["FastAPI: POST /api/ai/parse-challan-image\n(or POST /api/ai/process-message)"]
        CheckKey{"API Key &\nNetwork Online?"}
        GeminiFlash["Google Gemini 2.5 Flash API\n(google-genai SDK)"]:::aiNode
        DemoFallback["Deterministic Local Demo Engine\n(4 Presets: Inward, Outward, Dup Guard, LCD)"]:::aiNode
        GujaratiTrans["Gujarati Numeral Transliteration\n(૧,૨,૩... ➔ 1,2,3...) + Unit Standardizer"]:::aiNode
        StrictJSON["Strict JSON Extraction\n{party, challan_no, date, design, punch, rate, qty, unit}"]:::aiNode

        PhotoSnap --> APICall
        VoiceNote --> APICall
        APICall --> CheckKey
        CheckKey -->|Yes| GeminiFlash
        CheckKey -->|No / Offline| DemoFallback
        GeminiFlash --> GujaratiTrans
        DemoFallback --> GujaratiTrans
        GujaratiTrans --> StrictJSON
    end

    subgraph STAGE3["STAGE 3: HUMAN VERIFICATION & INWARD REGISTRATION (main.py)"]
        PreviewCard["Bilingual Editable Confirmation Card\nin WhatsApp Bot Simulator (ગુજરાતી / EN)"]
        ConfirmBtn["Master reviews data & clicks\n'કન્ફર્મ કરો (Confirm & Save)'"]:::startNode
        DupCheck{"Duplicate Guard:\nParty + Slip No\nAlready Exists?"}
        Reject409["409 Conflict Error:\n'આ ચલણ નંબર પહેલેથી જ નોંધાયેલ છે'"]:::alertNode
        SaveInward["Save to Database & /uploads:\nINSERT INTO challans (Type=INWARD,\nRate, Punch Code, Stitches)"]:::dbNode
        InitLot["Initialize Lot in Reconciliation Engine:\nStatus = RECEIVED | Balance = Q_in"]:::dbNode

        StrictJSON --> PreviewCard
        PreviewCard --> ConfirmBtn
        ConfirmBtn --> DupCheck
        DupCheck -->|Yes| Reject409
        DupCheck -->|No| SaveInward
        SaveInward --> InitLot
    end

    subgraph STAGE4["STAGE 4: FLOOR PRODUCTION & SHIFT LCD TRACKING (Tabs 2 & 3)"]
        Machines["Embroidery Production Run\n(20-Head Embroidery Machines, Matching Punch Code)"]:::floorNode
        StitchCalc["Stitch-to-Profit Costing Engine (Tab 3):\nStitches, RPM, Heads, Overhead\n➔ Break-Even Rate + 25% Party Quote"]:::calcNode
        ShiftChange["12-Hr Shift Change Handover\n(Day 8 AM - 8 PM / Night 8 PM - 8 AM)"]
        LCDPhoto["Karigar / Master snaps photo of\nMachine LCD Stitch Counter (Dahao/Richpeace)"]:::startNode
        BonusEngine["Shift Log & Bonus Calculator:\nStitches = End - Start Counter\nBonus = Excess Stitches * ₹15/10k\nAlert if Downtime > 90 min or Eff < 70%"]:::calcNode
        SaveShift["Persist to machine_shifts Table:\n(target_stitches, efficiency_pct, bonus_inr, alert)"]:::dbNode

        InitLot --> Machines
        Machines --> StitchCalc
        Machines --> ShiftChange
        ShiftChange --> LCDPhoto
        LCDPhoto --> BonusEngine
        BonusEngine --> SaveShift
    end

    subgraph STAGE5["STAGE 5: TRANCHE OUTWARD DISPATCH & KASAR / RAW RETURN DEFENSE (Tab 2)"]
        BatchDone["Partial Batch Finished (e.g. 400 pcs fresh + 50 raw return)"]
        DispatchModal["Master opens Tab 2: Pending Lots (બાકી માલ)\nClicks 'જાવક નોંધો (Log Delivery)'"]:::startNode
        InputOutward["Enter: Fresh Qty (400) + Returned Raw (50)\n+ Kasar Damage (20) + Fent (10)\n+ Signed Tempo Delivery Slip Photo"]
        OverdeliverCheck{"Accounted > Q_in * 1.02\n(Overdelivery Guard v2.0)?"}
        Reject400["400 Bad Request:\n'જાવક જથ્થો આવક કરતા વધારે છે'"]:::alertNode
        CommitDispatch["FastAPI: POST /api/lots/{id}/dispatch\nINSERT INTO challans (OUTWARD)\nINSERT INTO lot_deliveries (Fresh, Raw Ret, Kasar, Fent)"]:::dbNode
        ReconMath["Reconciliation Engine Recomputes Balance:\nQ_pending = Q_in - (Q_fresh + Q_raw_ret + Q_kasar + Q_fent)\nNet Billable Qty = Q_fresh (Only embroidered items charged!)"]:::dbNode
        WhatsAppNotice["Instant WhatsApp Dispatch Message to Party\nwith Photo Proof Link (Zero-Dispute Defense)"]:::partyNode

        Machines --> BatchDone
        BatchDone --> DispatchModal
        DispatchModal --> InputOutward
        InputOutward --> OverdeliverCheck
        OverdeliverCheck -->|Yes| Reject400
        OverdeliverCheck -->|No| CommitDispatch
        CommitDispatch --> ReconMath
        ReconMath --> WhatsAppNotice
    end

    subgraph STAGE6["STAGE 6: MONTH-END SETTLEMENT & TALLY PRIME EXPORT (Tab 4)"]
        AllSettled{"Lot Balance == 0?\n(COMPLETED)"}
        OpenLedger["Factory Owner opens Tab 4: Party Ledger\nSelects 'Radhe Creation'"]:::startNode
        AuditTable["Dual Reconciliation Audit View:\nInward Slips ↔ Fresh Outwards ↔ Returned Raw ↔ Kasar\nBillable Amount = Q_fresh * agreed_rate"]
        WhatsAppUdhari["1-Click WhatsApp Udhari Reminder Link:\nPre-filled polite Gujarati payment reminder\nwith Billable ₹ and Photo Proof link"]:::partyNode
        PrintA4["1-Click Print A4 Statement (@media print):\nZero-Dispute Statement for Physical Signature"]:::alertNode
        ExportTally["1-Click Tally Prime CSV Export:\nStandard RFC 4180 CSV for Accounting Entry"]:::alertNode

        ReconMath --> AllSettled
        AllSettled -->|Partial| DispatchModal
        AllSettled -->|Settled| OpenLedger
        OpenLedger --> AuditTable
        AuditTable --> WhatsAppUdhari
        AuditTable --> PrintA4
        AuditTable --> ExportTally
    end
```

---

### 1.4 ASCII System Architecture Map

```text
+====================================================================================================+
|                                    CHALLAN AI (EMBROIDERY OS) v2.0                                 |
+====================================================================================================+
 [SHOP-FLOOR]  Smartphone Camera / WhatsApp Voice-Text / Touch Screen PWA (Gujarati / English)
      │
      ▼ (HTTP/2, JSON, Multipart, Port 3000)
+────────────────────────────────────────────────────────────────────────────────────────────────────+
| FRONTEND: Next.js 14 (App Router) + Tailwind CSS + Lucide Icons                                   |
|   ├── Tab 1: WhatsApp AI Bot Simulator (Chat bubbles, 4 Demo presets, Camera OCR preview)         |
|   ├── Tab 2: Pending Lots / બાકી માલ (Progress: Inward vs Fresh vs Raw Return vs Kasar vs Fent)   |
|   ├── Tab 3: Stitch Calculator & Shift Log (Cost/Piece, 25% Quote, LCD Counter, Persisted Bonus)   |
|   ├── Tab 4: Party Ledger & Proofs (Billable amounts, WhatsApp Udhari Link, A4 print, Tally CSV)   |
|   └── Global: Gujarati / English instant toggle, Offline local store, @media print CSS rules       |
+────────────────────────────────────────────────────────────────────────────────────────────────────+
      │
      ▼ (REST API: /api/*, Port 8000, CORS enabled)
+────────────────────────────────────────────────────────────────────────────────────────────────────+
| BACKEND: FastAPI + SQLModel + Pydantic v2 Validation                                               |
|   ├── Security & Validation: Duplicate Challan Guard (409), Overdelivery Guard v2.0 (400)          |
|   ├── v2.0 Reconciliation Engine: Q_pending = Inward - (Fresh + Raw Return + Kasar + Fent)         |
|   ├── Stitch Costing Engine: (Stitches / (RPM * Eff)) * 720m * Heads -> Cost per Piece + Margin     |
|   ├── Shift Engine: Computes & stores target_stitches, efficiency_pct, bonus_inr, alert boolean   |
|   └── Export Engine: Tally Prime CSV generation + WhatsApp Udhari reminder link formatter          |
+───────────────────────────┬────────────────────────────────────────┬───────────────────────────────+
                            │                                        │
                            ▼ (google-genai SDK)                     ▼ (psycopg3 / sqlite3)
+─────────────────────────────────────────────+  +───────────────────────────────────────────────────+
| AI SERVICE (ai_service.py)                  |  | PERSISTENCE (database.py & models.py)             |
|   ├── Gemini 2.5 Flash Multimodal OCR       |  |   ├── Primary: Neon Serverless PostgreSQL         |
|   ├── Gujarati Numeral Parser (૧,૨,૩->1,2,3)|  |       (Connection Pool, SSL, Indexing)            |
|   ├── Vernacular Intent & Entity Router     |  |   ├── Fallback: Local SQLite (zero-config dev)    |
|   ├── Machine LCD 7-Segment Screen Reader   |  |   └── File Storage: /uploads (Challans,           |
|   └── 4 Core Deterministic Presets          |  |       sample designs, LCD screen photos)          |
+─────────────────────────────────────────────+  +───────────────────────────────────────────────────+
```

---

### 1.5 Detailed Layer Responsibilities & Protocols

| Layer | Component | Tech Stack | Port / Protocol | Core Responsibilities |
|---|---|---|---|---|
| **Layer 1** | User & Shop-Floor | Mobile Browser, Camera, WhatsApp | HTTPS / WSS | Capture paper slips, dictate audio/text notes in Gujarati, view live lot statuses, log returned raw fabric. |
| **Layer 2** | Web Application | Next.js 14, React 18, TypeScript, Tailwind CSS | Port 3000 / HTTP | UI presentation, 4-tab mobile layout, bilingual language dictionary, photo preview modals, A4 print formatting, 1-click WhatsApp Udhari trigger. |
| **Layer 3** | REST API & Core Engine | FastAPI, SQLModel, Pydantic v2, Uvicorn | Port 8000 / HTTP | Business rules, duplicate slip prevention, v2.0 lot reconciliation, stitch pricing, shift bonus calculation, dashboard KPIs, Tally export. |
| **Layer 4** | Multimodal AI Engine | Gemini 2.5 Flash (`google-genai`), PIL | HTTPS / REST | Visual OCR of handwritten Gujarati slips with punch codes and rates, transliteration of regional digits, vernacular intent parsing, LCD counter reading. |
| **Layer 5** | Database & Storage | Neon PostgreSQL, SQLite, Static FS | TCP 5432 / Local Disk | Relational persistence, connection pooling, ACID transaction guarantees, static file serving under `/uploads`. |

---

# SECTION 2: COMPLETE REPOSITORY FOLDER & FILE TREE

### 2.1 Repository Directory Structure

```text
c:\Users\NAWAB\ai-chatbot\AI-chatbot-\
├── PROJECT_CONTEXT.md          # Domain rules, business logic & mathematical formulas
├── ARCHITECTURE_AND_FLOW.md    # This system architecture & end-to-end flow blueprint (v2.0)
├── README.md                   # Repository overview, quick-start & deployment instructions
├── backend/
│   ├── .env.example            # DATABASE_URL (Neon Postgres) & GEMINI_API_KEY environment template
│   ├── requirements.txt        # Production Python dependencies (FastAPI, SQLModel, google-genai)
│   ├── database.py             # Neon PostgreSQL engine, pooling & automatic SQLite fallback
│   ├── models.py               # SQLModel entities: Party, Challan, LotDelivery, MachineShift, RateQuote
│   ├── ai_service.py           # Gemini 2.5 Flash OCR, Gujarati parser & 4 deterministic demo presets
│   ├── seed.py                 # Realistic Gujarat embroidery seed data (Parties, Lots, Tranches, Shifts)
│   ├── main.py                 # FastAPI application, CORS, static uploads & all REST route handlers
│   └── uploads/                # Persistent storage for uploaded paper challan & LCD counter photos
└── frontend/
    ├── package.json            # Node.js dependencies (Next.js 14, Tailwind, Lucide Icons, clsx)
    ├── tsconfig.json           # TypeScript configuration with path alias mappings (@/*)
    ├── tailwind.config.ts      # Custom theme (Saffron, Indigo, Emerald, Slate) & print media utilities
    └── src/
        ├── lib/
        │   ├── api.ts          # Strongly-typed API client to FastAPI + offline mock dataset fallback
        │   └── translations.ts # Comprehensive Gujarati (ગુજરાતી) & English UI bilingual dictionary
        └── app/
            ├── layout.tsx      # Mobile-first viewport wrapper, fonts & print stylesheet hook
            ├── globals.css     # Tailwind styling, custom scrollbars & @media print A4 rules
            └── page.tsx        # 4-Tab Bilingual Application (WhatsApp Bot, Lots, Calculator, Ledger)
```

---

### 2.2 Deep File Responsibility & Boundary Matrix

#### A. Root Configuration & Knowledge Files
- **`PROJECT_CONTEXT.md`**: The domain Bible. Details the Job-Work manufacturing model, raw fabric zero-ownership constraints, tranche deliveries, Kasar shortage mechanics, stitch-to-profit equations, and SQL schema blueprints.
- **`ARCHITECTURE_AND_FLOW.md`**: This document (v2.0). Authoritative technical specification for all 5 layers, database relationships, AI OCR pipelines, user journeys, and REST API contracts.
- **`README.md`**: Developer and operator onboarding guide. Explains prerequisites, 1-command startup for both backend and frontend, and testing instructions.

#### B. Backend Layer (`/backend`)
- **`.env.example`**: Defines all required environment variables:
  * `DATABASE_URL`: Connection string to Neon PostgreSQL with connection pooling (`sslmode=require`).
  * `GEMINI_API_KEY`: Google Gemini API key for Gemini 2.5 Flash vision and language model.
  * `PORT`: Defaulting to `8000`.
  * `ENVIRONMENT`: `development` or `production`.
  * `CORS_ORIGINS`: Allowed frontend origins (e.g., `http://localhost:3000`).
- **`requirements.txt`**: Strict version pinning for `fastapi`, `uvicorn[standard]`, `sqlmodel`, `psycopg[binary]`, `pydantic`, `pydantic-settings`, `python-multipart`, `google-genai`, `pillow`, `python-dotenv`, and `httpx`.
- **`database.py`**:
  * Implements `get_engine()` with intelligent failover: checks `DATABASE_URL`; if invalid or absent, automatically falls back to `sqlite:///./embroidery_os.db`.
  * Configures connection pooling (`pool_size=10`, `max_overflow=20`, `pool_recycle=300`) for Neon serverless compatibility.
  * Exposes `get_session()` dependency for FastAPI routes.
  * Exposes `init_db()` to automatically create tables on startup.
- **`models.py` (v2.0)**:
  * Defines SQLModel tables with relational foreign keys:
    1. `Party`: Merchant client profiles (Name, Phone, City, Active lots).
    2. `Challan`: Physical paper challans with v2.0 fields:
       - `factory_punch_number`: Internal `.DST` machine code (e.g., `SK-45`).
       - `agreed_rate`: Agreed job-work rate in INR (e.g., `₹42.0`).
       - `stitches_per_piece`: Stitch count (e.g., `28000`).
       - `design_photo_url`: Sample image path.
    3. `LotDelivery`: Junction table with v2.0 fields:
       - `fresh_quantity`: Finished embroidered pieces (billable).
       - `returned_raw_quantity`: Unprocessed raw fabric returned to party (unbillable floor reduction).
       - `kasar_quantity`: Defective / shortage pieces accepted by party.
       - `fent_quantity`: Leftover roll cut-pieces returned.
    4. `MachineShift`: Day/Night operator shift logs with v2.0 persisted analytics:
       - `target_stitches`: Shift target (default `400000`).
       - `efficiency_pct`: Actual output efficiency percentage.
       - `bonus_earned_inr`: Karigar bonus in INR.
       - `is_low_efficiency_alert`: Flag for efficiency < 70% or downtime > 90 mins.
    5. `RateQuote`: Stitch pricing records, material consumption, break-even cost, and quoted rate.
  * Defines Python Enums: `ChallanType`, `UnitType`, `ShiftType`, `MaterialType`, `LotStatus`.
- **`ai_service.py` (v2.0)**:
  * Initializes the Google Gemini 2.5 Flash client via `google-genai` SDK (`genai.Client(api_key=...)`).
  * `parse_challan_image(file_bytes, filename)`: Multimodal visual OCR extracting Party, Challan No, Date, Design No, Factory Punch Code, Agreed Rate, Stitches, Qty, Unit, and Gujarati handwritten notes.
  * `transliterate_gujarati_numerals(text)`: Converts Gujarati numerals (`૧, ૨, ૩...`) to English Arabic digits (`1, 2, 3...`).
  * `process_vernacular_message(text_or_audio)`: Classifies user intent (Inward, Outward dispatch, Pending balance query, Stitch quote) and extracts structured parameters.
  * `parse_machine_lcd(file_bytes)`: Extracts numeric start/end stitch counters from machine LCD photos.
  * `get_deterministic_fallback(filename_or_preset)`: Provides realistic mock outputs for 4 Surat presets:
    1. `preset_radhe_inward.jpg` (1200 PCS Inward, `RC-1048`, `D-1024`, Punch `SK-45`, Rate `₹42`)
    2. `preset_maruti_outward.jpg` (400 Fresh PCS, 50 Returned Raw PCS, 20 Kasar PCS, 10 Fent PCS)
    3. `preset_duplicate_guard.jpg` (Triggers `409 Conflict` duplicate guard on `RC-1048`)
    4. `preset_dahao_lcd.jpg` (445k stitches vs 400k target -> 111.2% eff, +₹67.50 Karigar Bonus)
- **`seed.py` (v2.0)**:
  * Populates the database with realistic Surat/Ahmedabad textile hub records including factory punch codes, agreed rates, returned raw fabric, fent quantities, and computed shift bonuses.
- **`main.py` (v2.0)**:
  * FastAPI entry point configuring CORS, error handling middleware, and `/uploads` static file mount (`StaticFiles(directory="uploads")`).
  * Implements `GET /api/dashboard/summary` for top-level operational KPIs.
  * Implements `GET /api/ledger/{party_id}` with billable amount and WhatsApp Udhari link generation.
  * Registers all REST endpoints defined in Section 6.
- **`uploads/`**:
  * Directory for storing uploaded slip photos, signed proof photos, sample designs, and machine LCD counter captures.

#### C. Frontend Layer (`/frontend`)
- **`package.json`**: Configures Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide React icons, and utility packages.
- **`tsconfig.json`**: TypeScript configuration enabling strict type checks and `@/*` path mapping pointing to `src/*`.
- **`tailwind.config.ts`**: Theme tokens including rich textile saffron (`#f97316`), deep indigo (`#4f46e5`), emerald green (`#10b981`), dark slate cards, and print media utilities.
- **`src/lib/api.ts`**:
  * Axios/Fetch client wrapper pointing to backend (`http://localhost:8000`).
  * Includes resilient fallback logic: if backend is unreachable, loads pre-bundled offline mock data so users can test the UI immediately.
  * Type definitions for `Party`, `Challan`, `PendingLot`, `ShiftLog`, `RateQuote`, `AIResponse`, `DashboardSummary`.
- **`src/lib/translations.ts`**:
  * Full bidirectional translation dictionary (`gu` <-> `en`).
  * Covers navigation tabs, field labels, status badges, action buttons, alert banners, returned raw terms (`કાચો માલ પરત`), leftover fent (`ફેંટ`), and WhatsApp bot dialogue.
- **`src/app/layout.tsx`**:
  * Root HTML shell. Configures viewport meta tags for mobile PWA behavior, font declarations, and print styles.
- **`src/app/globals.css`**:
  * Tailwind directives, custom glassmorphism styles, scrollbar styling, and `@media print` rules for clean A4 printing (hides headers/tabs, prints clean ledger borders).
- **`src/app/page.tsx`**:
  * Primary application orchestrator. Houses top navigation bar with the Gujarati/English toggle, backend health indicator, and dashboard summary ribbon.
  * Renders the 4 core views:
    1. **Tab 1: WhatsApp AI Bot Simulator** (Chat feed, file upload, 4 quick-test preset buttons, AI confirmation dialog).
    2. **Tab 2: Pending Floor Stock** (Party-grouped lot cards, multi-segment completion gauges, 1-click partial delivery modal supporting Fresh, Returned Raw, Kasar, and Fent).
    3. **Tab 3: Stitch Costing & Shift Tracker** (Interactive sliders, cost breakdown cards, Day/Night LCD logger displaying persisted bonus & low-efficiency alerts).
    4. **Tab 4: Party Ledger & Proofs** (Party selector, Inward vs Outward dual audit table with photo thumbnail viewer, billable rupee totals, 1-click WhatsApp Udhari link, A4 print button, Tally CSV export).

---

# SECTION 3: DATABASE ENTITY-RELATIONSHIP (ER) SCHEMA & MATHEMATICAL MODELS

### 3.1 Mermaid Entity-Relationship (ER) Diagram (v2.0)

```mermaid
erDiagram
    PARTIES ||--o{ CHALLANS : "issues / receives"
    PARTIES ||--o{ RATE_QUOTES : "quoted for"
    CHALLANS ||--o{ LOT_DELIVERIES : "inward_lot_source"
    CHALLANS ||--o{ LOT_DELIVERIES : "outward_dispatch_slip"

    PARTIES {
        uuid id PK
        string name "Indexed"
        string phone "Nullable"
        string city "Default: Surat"
        datetime created_at
    }

    CHALLANS {
        uuid id PK
        string challan_type "INWARD | OUTWARD"
        uuid party_id FK "Indexed"
        string challan_number "Indexed (Slip No)"
        date challan_date "Slip Date"
        string design_number "Indexed (Party's design code)"
        string factory_punch_number "Internal machine .DST code (e.g. SK-45)"
        float agreed_rate "Agreed job-work rate in INR (e.g. 42.0)"
        int stitches_per_piece "Stitch count (e.g. 28000)"
        string design_photo_url "Nullable sample photo path"
        string fabric_type "e.g. Georgette, Silk"
        float total_quantity "Pieces / Meters / Takas"
        string unit "PCS | MTR | TAKA"
        string photo_url "Path to stored challan photo"
        text notes "Nullable notes"
        datetime created_at
    }

    LOT_DELIVERIES {
        uuid id PK
        uuid inward_challan_id FK "Original Inward Lot"
        uuid outward_challan_id FK "Outward Tranche Slip"
        float fresh_quantity "Finished Embroidered Pieces (Billable)"
        float returned_raw_quantity "Unprocessed Raw Returned (Unbillable)"
        float kasar_quantity "Damaged / Shortage Pieces Accepted"
        float fent_quantity "Leftover Roll Cloth Returned"
        date dispatch_date
        datetime created_at
    }

    MACHINE_SHIFTS {
        uuid id PK
        string machine_number "e.g. M-01, M-02"
        string shift_type "DAY | NIGHT"
        date shift_date
        string operator_name "Karigar name"
        bigint start_stitch_counter "LCD Counter at start"
        bigint end_stitch_counter "LCD Counter at end"
        bigint total_stitches "Computed: end - start"
        bigint target_stitches "Baseline target: 400000"
        float efficiency_pct "Computed: total / target * 100"
        float bonus_earned_inr "Computed Karigar bonus in INR"
        boolean is_low_efficiency_alert "True if eff < 70% or downtime > 90m"
        int rpm_average "Operating RPM"
        int downtime_minutes "Breakage/Electricity delay"
        string photo_url "LCD screen photo"
        text notes
        datetime created_at
    }

    RATE_QUOTES {
        uuid id PK
        uuid party_id FK "Nullable"
        string design_number
        int stitch_count "Stitches in design"
        int machine_heads "Needle heads (e.g. 20)"
        string material_type "THREAD_ONLY | JARI_THREAD | SEQUIN_CORD | MULTI_HEAVY"
        float cost_per_piece "Computed break-even"
        float quoted_rate "Recommended rate (+25%)"
        float profit_margin_pct "e.g. 25.0"
        datetime created_at
    }
```

---

### 3.2 SQLModel Table Definitions & Field Constraints (v2.0)

#### A. Table `parties` (વેપારી ખાતાઓ)
Represents merchant clients supplying fabric for embroidery job-work.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | Primary Key, Default: `uuid4()` | Unique identifier |
| `name` | `VARCHAR(255)` | Not Null, Index | Party trade name (e.g., "Radhe Creation") |
| `phone` | `VARCHAR(20)` | Nullable | WhatsApp contact number |
| `city` | `VARCHAR(100)` | Default: `'Surat'` | Primary textile cluster city |
| `created_at` | `TIMESTAMP` | Default: `utcnow()` | Record creation timestamp |

#### B. Table `challans` (આવક / જાવક ચલણ માસ્ટર - v2.0)
Stores both Inward (raw goods from Party) and Outward (finished goods dispatched) slips with job-work rates and machine punching codes.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | Primary Key, Default: `uuid4()` | Unique identifier |
| `challan_type` | `VARCHAR(10)` | Not Null, Enum: `INWARD`, `OUTWARD` | Type of slip |
| `party_id` | `UUID` | Foreign Key -> `parties.id`, Index | Linked party |
| `challan_number`| `VARCHAR(100)`| Not Null, Index | Physical paper slip number |
| `challan_date` | `DATE` | Not Null | Date inscribed on the slip |
| `design_number`| `VARCHAR(100)`| Not Null, Index | Party's embroidery design code (e.g., "D-1024") |
| `factory_punch_number`| `VARCHAR(100)`| Nullable | **v2.0:** Internal machine `.DST` punch code (e.g., "SK-45") |
| `agreed_rate` | `FLOAT` | Default: `0.0` | **v2.0:** Job-work rate in INR per piece/meter (e.g., `42.0`) |
| `stitches_per_piece` | `INTEGER` | Default: `0` | **v2.0:** Design stitch count (e.g., `28000`) |
| `design_photo_url` | `VARCHAR(500)`| Nullable | **v2.0:** Sample design photo path in `/uploads` |
| `fabric_type` | `VARCHAR(100)`| Not Null | Fabric base (e.g., "Georgette", "Silk") |
| `total_quantity`| `FLOAT` | Not Null, Positive | Total quantity in this slip |
| `unit` | `VARCHAR(10)` | Enum: `PCS`, `MTR`, `TAKA` | Measurement unit |
| `photo_url` | `VARCHAR(500)`| Nullable | Local file path or cloud URL to slip photo |
| `notes` | `TEXT` | Nullable | Transcribed handwritten Gujarati notes |
| `created_at` | `TIMESTAMP` | Default: `utcnow()` | Record creation timestamp |

*Composite Unique Guard:* `(party_id, challan_number, challan_type)` ensures no party's challan number can be logged twice.

#### C. Table `lot_deliveries` (ટુકડે-ટુકડે જાવક લિંક - v2.0)
The heart of the reconciliation engine. Links each partial outward delivery back to its original inward lot and records raw returns (`કાચો પરત`), Kasar, and Fent.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | Primary Key, Default: `uuid4()` | Unique identifier |
| `inward_challan_id` | `UUID` | Foreign Key -> `challans.id`, Index | Original inward lot ID |
| `outward_challan_id`| `UUID` | Foreign Key -> `challans.id`, Index | Outward delivery slip ID |
| `fresh_quantity` | `FLOAT` | Not Null, Default: `0.0` | Finished embroidered pieces delivered (**Billable**) |
| `returned_raw_quantity` | `FLOAT` | Not Null, Default: `0.0` | **v2.0:** Unprocessed raw fabric returned to party (**Billed at ₹0**) |
| `kasar_quantity` | `FLOAT` | Not Null, Default: `0.0` | Damaged / shortage pieces accepted by party |
| `fent_quantity` | `FLOAT` | Not Null, Default: `0.0` | **v2.0:** Leftover roll cloth returned |
| `dispatch_date` | `DATE` | Not Null | Date of outward dispatch |
| `created_at` | `TIMESTAMP` | Default: `utcnow()` | Record creation timestamp |

#### D. Table `machine_shifts` (શિફ્ટ વાઈઝ સ્ટીચ લોગ - v2.0)
Records 12-hour machine shift outputs (Day / Night) directly from machine LCD counters and persists operator bonuses and low-efficiency alerts.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | Primary Key, Default: `uuid4()` | Unique identifier |
| `machine_number` | `VARCHAR(50)` | Not Null, Index | Machine ID (e.g., "M-01", "M-02") |
| `shift_type` | `VARCHAR(10)` | Enum: `DAY`, `NIGHT` | Day (8 AM-8 PM) vs Night (8 PM-8 AM) |
| `shift_date` | `DATE` | Not Null | Shift operational date |
| `operator_name` | `VARCHAR(100)`| Not Null | Karigar / Operator name |
| `start_stitch_counter`| `BIGINT` | Not Null | LCD counter at start of shift |
| `end_stitch_counter` | `BIGINT` | Not Null | LCD counter at end of shift |
| `total_stitches` | `BIGINT` | Not Null (Computed: `end - start`) | Total stitches run in 12 hours |
| `target_stitches` | `BIGINT` | Default: `400000` | **v2.0:** Baseline 12-hr target stitches |
| `efficiency_pct` | `FLOAT` | Default: `0.0` | **v2.0:** `(total_stitches / target_stitches) * 100` |
| `bonus_earned_inr` | `FLOAT` | Default: `0.0` | **v2.0:** `max(0, total - target) / 10000 * 15.0` |
| `is_low_efficiency_alert`| `BOOLEAN` | Default: `False` | **v2.0:** `True` if `efficiency_pct < 70%` or `downtime > 90` |
| `rpm_average` | `INTEGER` | Default: `650` | Average running speed in RPM |
| `downtime_minutes` | `INTEGER` | Default: `0` | Idle minutes (thread break/electricity) |
| `photo_url` | `VARCHAR(500)`| Nullable | Photo proof of machine LCD screen |
| `notes` | `TEXT` | Nullable | Operator shift observations |
| `created_at` | `TIMESTAMP` | Default: `utcnow()` | Record creation timestamp |

#### E. Table `rate_quotes` (સ્ટીચ ભાવ કોટેશન)
Stores mathematical job-work costing calculations for embroidery designs.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | Primary Key, Default: `uuid4()` | Unique identifier |
| `party_id` | `UUID` | Foreign Key -> `parties.id`, Nullable | Client for whom quote is generated |
| `design_number` | `VARCHAR(100)`| Not Null | Design pattern reference |
| `stitch_count` | `INTEGER` | Not Null, Positive | Total stitches in design (e.g. 28,000) |
| `machine_heads` | `INTEGER` | Not Null, Default: 20 | Number of needle heads on machine |
| `material_type` | `VARCHAR(50)` | Enum: `THREAD_ONLY`, `JARI_THREAD`, etc. | Embroidery consumables used |
| `cost_per_piece` | `FLOAT` | Not Null | Computed break-even production cost |
| `quoted_rate` | `FLOAT` | Not Null | Quoted job-work price per piece |
| `profit_margin_pct` | `FLOAT` | Default: 25.0 | Target profit margin percentage |
| `created_at` | `TIMESTAMP` | Default: `utcnow()` | Record creation timestamp |

---

### 3.3 Core Mathematical Reconciliation & Financial Formulas (v2.0)

#### Formula 1: Real-Time Lot Reconciliation & Job-Work Billing (v2.0)
For every Inward Lot $L$ received with initial fabric quantity $Q_{\text{in}}$ and agreed rate $R$:

$$\text{Delivered Fresh Embroidered Quantity } (Q_{\text{fresh}}) = \sum_{i=1}^{k} \text{fresh\_quantity}_i$$

$$\text{Unprocessed Returned Raw Quantity } (Q_{\text{returned\_raw}}) = \sum_{i=1}^{k} \text{returned\_raw\_quantity}_i$$

$$\text{Accepted Kasar Damage Quantity } (Q_{\text{kasar}}) = \sum_{i=1}^{k} \text{kasar\_quantity}_i$$

$$\text{Leftover Fent Quantity } (Q_{\text{fent}}) = \sum_{i=1}^{k} \text{fent\_quantity}_i$$

$$\text{Total Accounted Floor Quantity } (Q_{\text{accounted}}) = Q_{\text{fresh}} + Q_{\text{returned\_raw}} + Q_{\text{kasar}} + Q_{\text{fent}}$$

$$\text{Live Pending Floor Balance } (Q_{\text{pending}}) = Q_{\text{in}} - Q_{\text{accounted}}$$

$$\text{Reconciliation Completion Rate } (\%) = \left( \frac{Q_{\text{accounted}}}{Q_{\text{in}}} \right) \times 100$$

**Commercial Billing Equations:**
$$\text{Net Billable Quantity} = Q_{\text{fresh}}$$
*Note: Unprocessed returned raw fabric ($Q_{\text{returned\_raw}}$), Kasar ($Q_{\text{kasar}}$), and Fent ($Q_{\text{fent}}$) are strictly unbillable and billed at ₹0.*

$$\text{Total Billable Job-Work Amount (INR)} = Q_{\text{fresh}} \times R$$

#### Formula 2: Stitch-to-Profit Job-Work Costing Equation
Given:
- $S$ = Total stitches per piece (e.g., $28,000$)
- $RPM$ = Average machine running speed (e.g., $650 \text{ RPM}$)
- $E$ = Machine shift efficiency factor ($0.75 \text{ to } 0.85$, accounting for thread breakage, bobbin changes, and cloth hooping)
- $H$ = Machine heads (e.g., $20 \text{ heads}$)
- $C_{\text{shift}}$ = 12-hour operational shift cost in ₹ (Electricity + Karigar wage + helper wage + factory rent + machine depreciation $\approx ₹2,200$)
- $C_{\text{mat}}$ = Material cost per piece (Embroidery thread, zari, sequin film, backing paper/hydro-film $\approx ₹8.50$)

**Step-by-step computation:**
1. $\text{Batch Run Time (Minutes)} = T_{\text{batch}} = \frac{S}{RPM \times E}$
2. $\text{Batches per 12-hr Shift (720 min)} = N_{\text{batch}} = \frac{720}{T_{\text{batch}}}$
3. $\text{Total Pieces Produced per Shift} = P_{\text{shift}} = N_{\text{batch}} \times H$
4. $\text{Machine Operational Cost per Piece} = C_{\text{machine}} = \frac{C_{\text{shift}}}{P_{\text{shift}}}$
5. $\text{Total Net Production Cost per Piece} = C_{\text{total}} = C_{\text{machine}} + C_{\text{mat}}$
6. $\text{Break-Even Rate per Piece} = ₹C_{\text{total}}$
7. $\text{Recommended Party Quotation (25% Profit)} = Q_{\text{party}} = C_{\text{total}} \times 1.25$

#### Formula 3: Persisted Karigar Operator Shift Bonus & Alert Model (v2.0)
Calculates shift performance, persists bonus earnings in INR, and flags low-efficiency alert conditions:

$$\Delta S = S_{\text{end}} - S_{\text{start}}$$

$$\text{Shift Efficiency Percentage } (\%) = \left( \frac{\Delta S}{S_{\text{target}}} \right) \times 100 \quad \text{where } S_{\text{target}} = 400,000$$

$$\text{Excess Stitches} = \max(0, \Delta S - S_{\text{target}})$$

$$\text{Bonus Earned (INR)} = \left( \frac{\text{Excess Stitches}}{10,000} \right) \times ₹15.0$$

$$\text{is\_low\_efficiency\_alert} = (\text{Efficiency } < 70\%) \lor (\text{Downtime Minutes} > 90)$$

---

### 3.4 Lot Balance State Machine & Lifecycle Transitions

```mermaid
stateDiagram-v2
    [*] --> RECEIVED: Inward Challan Uploaded (Q_pending = Q_in)
    
    RECEIVED --> IN_PROGRESS: First Partial Delivery or Raw Return (0 < Q_pending < Q_in)
    
    IN_PROGRESS --> IN_PROGRESS: Subsequent Delivery / Raw Return (0 < Q_pending < Q_in)
    
    IN_PROGRESS --> COMPLETED: Final Outward Dispatch (Q_pending == 0)
    RECEIVED --> COMPLETED: 100% Single-Batch Dispatch (Q_pending == 0)
    
    IN_PROGRESS --> OVERDELIVERED: Dispatch Exceeds Inward (Q_pending < 0)
    RECEIVED --> OVERDELIVERED: Dispatch Exceeds Inward (Q_pending < 0)
    
    OVERDELIVERED --> COMPLETED: Corrected by Master via Slip Adjustment
    
    COMPLETED --> [*]: Month-End Settlement & Zero-Dispute A4 Signed
```

| State | Condition | UI Badge Color | Action Allowed |
|---|---|---|---|
| `RECEIVED` | $Q_{\text{pending}} = Q_{\text{in}}$ | Blue (`#3b82f6`) | "જાવક નોંધો" (Log First Partial Delivery / Raw Return) |
| `IN_PROGRESS` | $0 < Q_{\text{pending}} < Q_{\text{in}}$ | Amber (`#f59e0b`) | "જાવક નોંધો" (Log Additional Delivery, Raw Return, or Kasar) |
| `COMPLETED` | $Q_{\text{pending}} = 0$ | Green (`#10b981`) | "ખાતું સેટલ કરો" (View Zero-Dispute Summary & Billable Amount) |
| `OVERDELIVERED` | $Q_{\text{pending}} < 0$ | Red (`#ef4444`) | "ભૂલ સુધારો" (Audit Challan Entries) |

---

# SECTION 4: MULTIMODAL AI & GUJARATI VERNACULAR PARSING PIPELINE

Textile job-work chalans in Surat and Ahmedabad are filled by floor masters under noisy, ink-stained conditions. They use blue ballpoint pens, carbon copy sheets, and frequently write numbers in Gujarati script (`૧, ૨, ૩...`). ChallanAI uses Google Gemini 2.5 Flash via the modern `google-genai` SDK to extract structured JSON while maintaining an instant deterministic fallback for offline resilience.

### 4.1 Gemini 2.5 Flash Vision OCR Architecture (`google-genai` SDK)

```mermaid
sequenceDiagram
    autonumber
    actor Master as Floor Master (SmartPhone)
    participant UI as Next.js PWA (/frontend)
    participant API as FastAPI Backend (/backend)
    participant AIService as AI Service (ai_service.py)
    participant Gemini as Google Gemini 2.5 Flash API
    participant DB as Neon DB / SQLite

    Master->>UI: Snaps photo of Gujarati paper challan
    UI->>API: POST /api/ai/parse-challan-image (Multipart FormData)
    API->>AIService: parse_challan_image(file_bytes, filename)
    
    alt Valid GEMINI_API_KEY Available
        AIService->>Gemini: client.models.generate_content(model="gemini-2.5-flash", contents=[image, prompt])
        Gemini-->>AIService: Raw JSON Response (with Gujarati digits, punch code, rate)
        AIService->>AIService: transliterate_gujarati_numerals(raw_json)
        AIService->>AIService: Schema validation & confidence score calculation
    else Offline or No GEMINI_API_KEY
        AIService->>AIService: Load Deterministic Demo Fallback Preset
    end

    AIService-->>API: Strict Validated JSON Payload (v2.0)
    API-->>UI: 200 OK + Extracted Challan Data
    UI->>Master: Displays Editable Confirmation Card (Party, Challan No, Punch Code, Rate, Qty)
    Master->>UI: Verifies & clicks "કન્ફર્મ કરો (Confirm & Save)"
    UI->>API: POST /api/challans (JSON)
    API->>DB: INSERT into challans (Protected by Duplicate Guard)
    DB-->>API: Saved Record (UUID)
    API-->>UI: 201 Created
```

---

### 4.2 Gujarati Numeral Transliteration Engine

Handwritten entries in Surat often mix English and Gujarati digits (e.g., `૧૨૫૦ Mtr` or `ડીઝાઇન નં ૪૦૨`). The pipeline applies a deterministic transliteration dictionary:

```python
GUJARATI_NUMERAL_MAP = {
    '૦': '0',
    '૧': '1',
    '૨': '2',
    '૩': '3',
    '૪': '4',
    '૫': '5',
    '૬': '6',
    '૭': '7',
    '૮': '8',
    '૯': '9',
}

def transliterate_gujarati_numerals(text: str) -> str:
    """Replaces all Gujarati numeral characters with standard Arabic digits."""
    for guj, eng in GUJARATI_NUMERAL_MAP.items():
        text = text.replace(guj, eng)
    return text
```

| Gujarati Digit | Arabic Digit | Gujarati Name | Pronunciation | Example in Slip | Converted Result |
|---|---|---|---|---|---|
| `૦` | 0 | શૂન્ય | Shunya | `૧૦૦૦` | 1000 |
| `૧` | 1 | એક | Ek | `૧૫૦ તાકા` | 150 TAKA |
| `૨` | 2 | બે | Be | `૨૪૦ મીટર` | 240 MTR |
| `૩` | 3 | ત્રણ | Tran | `૩૫૦ પીસ` | 350 PCS |
| `૪` | 4 | ચાર | Chaar | `ડીઝાઇન ૪૦૨` | DESIGN 402 |
| `૫` | 5 | પાંચ | Paanch | `૫૦૦ પીસ` | 500 PCS |
| `૬` | 6 | છ | Chha | `ચલણ ૬૫૧` | CHALLAN 651 |
| `૭` | 7 | સાત | Saat | `૭૨૦ મીટર` | 720 MTR |
| `૮` | 8 | આઠ | Aath | `ડીઝાઇન ૮૮૨` | DESIGN 882 |
| `૯` | 9 | નવ | Nav | `૯૪૦ પીસ` | 940 PCS |

---

### 4.3 Multimodal Prompt Blueprint & Strict JSON Schema (v2.0)

When sending an image to Gemini 2.5 Flash, `ai_service.py` executes the following system instruction and prompt:

```text
SYSTEM INSTRUCTION:
You are ChallanAI Munim, an expert Gujarati and English OCR assistant specialized in Gujarat textile embroidery job-work slips (આવક/જાવક ચલણ).
Extract data strictly into the provided JSON schema.
If digits are written in Gujarati (૧, ૨, ૩...), convert them into standard Arabic numbers (1, 2, 3...).
Normalize units into strictly one of: "PCS", "MTR", "TAKA".
Identify if the challan is an INWARD (આવક) slip or OUTWARD (જાવક) slip.
Extract internal factory punch codes (e.g. SK-45), agreed job-work rates in INR (e.g. 42.0), and design stitch counts if written.
If information is missing, use null. Never guess or hallucinate.
Return ONLY clean JSON without markdown codeblocks or extra commentary.

REQUIRED JSON SCHEMA (v2.0):
{
  "challan_type": "INWARD" | "OUTWARD",
  "party_name": "string (Trade name of party, e.g. Radhe Creation)",
  "challan_number": "string (Physical slip number, e.g. 1048)",
  "challan_date": "YYYY-MM-DD (Date written on slip or today's date if missing)",
  "design_number": "string (Party design code, e.g. D-1024)",
  "factory_punch_number": "string | null (Internal machine .DST punching code, e.g. SK-45)",
  "agreed_rate": float (Job-work rate in INR per piece/meter, default 0.0),
  "stitches_per_piece": integer (Stitch count in design, default 0),
  "fabric_type": "string (e.g. Fox Georgette, Organza, Rayon, Silk, Cotton)",
  "quantity": float (Total numeric quantity),
  "unit": "PCS" | "MTR" | "TAKA",
  "raw_gujarati_notes": "string (Verbatim transcription of any Gujarati remarks on slip)",
  "confidence_score": float (Between 0.0 and 1.0)
}
```

---

### 4.4 Vernacular Voice/Text Intent Parsing Pipeline

The WhatsApp AI Bot Simulator accepts natural language text and transcribed audio messages in Gujarati, Hindi, or English. It parses the intent and returns structured action cards:

```mermaid
flowchart LR
    Msg["User Message: 'રાધે ક્રિએશનનો બાકી માલ કેટલો છે?'"] --> NLP["Vernacular NLP Router"]
    NLP --> IntentClassifier{"Intent?"}
    
    IntentClassifier -->|Query Balance| IntentQuery["Intent: PENDING_QUERY\nEntity: party='Radhe Creation'"]
    IntentClassifier -->|Log Dispatch| IntentDispatch["Intent: OUTWARD_DISPATCH\nEntities: party, design, qty, raw_ret, kasar"]
    IntentClassifier -->|Stitch Rate| IntentRate["Intent: RATE_CALCULATOR\nEntities: stitches, heads, rpm"]
    IntentClassifier -->|Log Shift| IntentShift["Intent: SHIFT_LOG\nEntities: machine, start, end"]

    IntentQuery --> ExecuteQuery["FastAPI fetches pending lots for Radhe Creation"]
    ExecuteQuery --> ReturnCard["WhatsApp Bot renders Interactive Status Card"]
```

#### Natural Language Gujarati Examples Handled:
1. *"રાધે ક્રિએશનનો બાકી માલ કેટલો છે?"*  
   $\rightarrow$ `Intent: PENDING_QUERY`, `party: "Radhe Creation"`. Returns live balance card with progress bar.
2. *"મારુતિ એમ્બ્રોઈડરીમાં આજે ૪૦૦ પીસ ફ્રેશ, ૫૦ પીસ કાચો પરત અને ૨૦ પીસ કાસર મોકલી આપ્યા"*  
   $\rightarrow$ `Intent: OUTWARD_DISPATCH`, `party: "Maruti Embroidery"`, `fresh_qty: 400`, `returned_raw: 50`, `kasar: 20`. Returns 1-click confirmation dialog.
3. *"૨૮,૦૦૦ ટાંકાની નવી ડીઝાઇન છે, ૨૦ માથાનું મશીન છે, શું ભાવ પોસાય?"*  
   $\rightarrow$ `Intent: RATE_CALCULATOR`, `stitches: 28000`, `heads: 20`. Runs Stitch Costing Engine and returns Break-Even Rate (₹34.80) & Recommended Quote (₹43.50).

---

### 4.5 Machine LCD Stitch Counter Vision Parser

To prevent operators from misrepresenting shift production or masking excessive downtime, supervisors take a photo of the machine LCD screen (Dahao 328, Richpeace, or Tajima controller).

```text
PROMPT:
Analyze this embroidery machine LCD controller screen photo.
Extract:
1. "start_stitch_counter": integer (if visible or reset point)
2. "end_stitch_counter": integer (current cumulative stitches)
3. "current_rpm": integer (displayed speed, e.g. 680)
4. "machine_model": string (e.g. "Dahao", "Richpeace", "Tajima")
5. "error_flags": list of strings (e.g. "Thread Break Head 4", "Bobbin Empty")
```

---

### 4.6 Deterministic Offline & Local Demo Fallback Engine (4 Core Presets)

When testing locally without a `GEMINI_API_KEY` or during live factory floor demonstrations, `ai_service.py` features a deterministic fallback engine with **4 exact presets**:

```python
DEMO_PRESETS = {
    # Preset 1: 1,200 PCS Inward Challan with Punch Code & Agreed Rate
    "preset_radhe_inward.jpg": {
        "challan_type": "INWARD",
        "party_name": "Radhe Creation (સુરત)",
        "challan_number": "RC-1048",
        "challan_date": "2026-10-24",
        "design_number": "D-1024",
        "factory_punch_number": "SK-45",
        "agreed_rate": 42.0,
        "stitches_per_piece": 28000,
        "fabric_type": "Fox Georgette",
        "quantity": 1200.0,
        "unit": "PCS",
        "raw_gujarati_notes": "ગળા-દામન વર્ક, ૧૨૦૦ નંગ કટ પીસ, પંચિંગ SK-45, ભાવ ₹૪૨/પીસ",
        "confidence_score": 0.98
    },
    
    # Preset 2: Partial Outward Dispatch with Returned Raw Fabric & Kasar
    "preset_maruti_outward.jpg": {
        "challan_type": "OUTWARD",
        "party_name": "Maruti Embroidery (અમદાવાદ)",
        "challan_number": "ME-802",
        "challan_date": "2026-10-24",
        "design_number": "D-402",
        "factory_punch_number": "MR-12",
        "agreed_rate": 35.0,
        "stitches_per_piece": 22000,
        "fresh_quantity": 400.0,
        "returned_raw_quantity": 50.0,
        "kasar_quantity": 20.0,
        "fent_quantity": 10.0,
        "fabric_type": "Pure Silk",
        "quantity": 400.0,
        "unit": "PCS",
        "raw_gujarati_notes": "જાવક: ૪૦૦ પીસ ફ્રેશ, ૫૦ પીસ કાચો પરત, ૨૦ પીસ કાસર, ૧૦ પીસ ફેંટ",
        "confidence_score": 0.95
    },

    # Preset 3: Triggers 409 Conflict Duplicate Challan Guard on RC-1048
    "preset_duplicate_guard.jpg": {
        "challan_type": "INWARD",
        "party_name": "Radhe Creation (સુરત)",
        "challan_number": "RC-1048",  # Duplicate collision!
        "challan_date": "2026-10-24",
        "design_number": "D-1024",
        "factory_punch_number": "SK-45",
        "agreed_rate": 42.0,
        "stitches_per_piece": 28000,
        "fabric_type": "Fox Georgette",
        "quantity": 1200.0,
        "unit": "PCS",
        "raw_gujarati_notes": "ડુપ્લિકેટ ચલણ ચકાસણી ટેસ્ટ (Duplicate Guard Test)",
        "confidence_score": 0.99
    },

    # Preset 4: Dahao 328 LCD Counter Screen with Persisted Karigar Bonus
    "preset_dahao_lcd.jpg": {
        "machine_number": "M-01",
        "shift_type": "DAY",
        "operator_name": "Ramesh Karigar",
        "start_stitch_counter": 14200000,
        "end_stitch_counter": 14645000,
        "total_stitches": 445000,
        "target_stitches": 400000,
        "efficiency_pct": 111.25,
        "bonus_earned_inr": 67.50,
        "is_low_efficiency_alert": False,
        "rpm_average": 680,
        "downtime_minutes": 25,
        "confidence_score": 0.99
    }
}
```

The UI exposes quick-test buttons for each preset so any evaluator or floor supervisor can test the entire pipeline in under 3 seconds.

---

# SECTION 5: END-TO-END USER & BUSINESS LOGIC FLOWS

### 5.1 Flow A: Physical Inward Challan Capture & Reconciliation

```mermaid
sequenceDiagram
    autonumber
    actor Driver as Tempo Delivery Driver
    actor Master as Floor Supervisor ("Master")
    participant Phone as Mobile Camera / PWA Tab 1
    participant Backend as FastAPI Backend
    participant Gemini as Gemini 2.5 Flash
    participant DB as Neon PostgreSQL

    Driver->>Master: Hands over 1,200 pcs Georgette with paper slip
    Master->>Phone: Taps Camera icon in WhatsApp Bot Simulator
    Phone->>Backend: POST /api/ai/parse-challan-image
    Backend->>Gemini: Multimodal OCR Prompt (Extracts Punch SK-45 & Rate ₹42)
    Gemini-->>Backend: Parsed JSON (Party: Radhe, Qty: 1200, Design: D-1024, Punch: SK-45, Rate: 42)
    Backend-->>Phone: Returns OCR Preview Card
    Master->>Phone: Checks data against physical slip, taps "કન્ફર્મ કરો"
    Phone->>Backend: POST /api/challans
    Backend->>Backend: Duplicate Guard checks (Party="Radhe", No="RC-1048")
    Backend->>DB: INSERT into challans (Type=INWARD, Qty=1200, Punch="SK-45", Rate=42.0)
    DB-->>Backend: Record Created
    Backend-->>Phone: 201 Created + WhatsApp Success Bubble
    Phone->>Phone: Updates Tab 2 (Pending Lots) with new 1,200 pcs pending gauge
```

---

### 5.2 Flow B: Tranche Partial Outward Dispatch, Returned Raw (`કાચો પરત`) & Kasar Dispute Prevention

In the embroidery industry, an inward lot of 1,200 pieces is never delivered in a single batch. If the party requests unembroidered cut pieces back (`કાચો માલ પરત`), they are deducted from pending inventory but billed at ₹0.

```mermaid
sequenceDiagram
    autonumber
    actor Master as Floor Supervisor
    participant UI as Next.js PWA Tab 2 (બાકી માલ)
    participant Backend as FastAPI Backend
    participant DB as Neon PostgreSQL
    actor Party as Merchant Client (Party)

    Master->>UI: Selects Radhe Creation (Lot: 1,200 pcs D-1024)
    UI->>Master: Displays Pending: 1,200 | Delivered: 0 | Returned Raw: 0 | Kasar: 0
    Master->>UI: Clicks "જાવક નોંધો (Log Partial Delivery)"
    Master->>UI: Enters Fresh: 400 | Returned Raw: 50 | Kasar: 20 | Fent: 10
    Master->>UI: Attaches photo of signed tempo outward receipt
    UI->>Backend: POST /api/lots/{inward_id}/dispatch
    
    Backend->>Backend: Balance: 1200 - (400 + 50 + 20 + 10) = 720 Pending
    Backend->>Backend: Net Billable Qty = 400 (Billable Amount: 400 * 42 = ₹16,800)
    Backend->>DB: INSERT Outward Challan + INSERT LotDelivery
    DB-->>Backend: Records Committed
    Backend-->>UI: 200 OK + Updated Lot Balance
    
    UI->>Master: Generates WhatsApp 1-Click Dispatch Receipt Link
    Master->>Party: Sends WhatsApp dispatch notice with photo proof link
    Note over Master,Party: Zero dispute: Fresh billed at ₹42, Returned Raw at ₹0, Kasar agreed
```

---

### 5.3 Flow C: Machine LCD Shift Stitch Tracking & Operator Bonus Calculation

```mermaid
sequenceDiagram
    autonumber
    actor Karigar as Machine Operator (Karigar)
    actor Master as Shift Supervisor
    participant PWA as PWA Tab 3 (શિફ્ટ લોગ)
    participant Backend as FastAPI Backend
    participant DB as Neon PostgreSQL

    Note over Karigar,Master: 8:00 PM Night Shift Handover
    Master->>PWA: Selects Machine M-01, Shift: Day (8 AM - 8 PM)
    Master->>PWA: Snaps photo of Machine LCD Screen
    PWA->>Backend: POST /api/shifts/log (Multipart)
    Backend->>Backend: AI reads LCD: End=14,645,000 | Start=14,200,000
    Backend->>Backend: Total Stitches = 445,000 | Target = 400,000
    Backend->>Backend: Efficiency = 111.25% | Bonus = (45,000 / 10,000) * ₹15 = ₹67.50
    Backend->>Backend: Alert Flag = False (Efficiency >= 70% and Downtime <= 90)
    Backend->>DB: INSERT into machine_shifts (target, eff, bonus, alert)
    DB-->>Backend: Saved
    Backend-->>PWA: 200 OK + Shift Performance Summary Card
    PWA-->>Master: Displays: Stitches: 445,000 | Efficiency: 111.2% | Bonus: ₹67.50
```

---

### 5.4 Flow D: Party Ledger, Zero-Dispute A4 Settlement & Tally Prime Export

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Factory Owner ("Sethiaya")
    participant UI as PWA Tab 4 (પાર્ટી ખાતું)
    participant Backend as FastAPI Backend
    participant DB as Neon PostgreSQL
    actor Party as Merchant Party

    Owner->>UI: Selects Party "Radhe Creation"
    UI->>Backend: GET /api/ledger/{party_id}
    Backend->>DB: Queries all Inwards, Outwards, Returned Raw, Kasar, Rates
    DB-->>Backend: Complete relational audit trail
    Backend-->>Backend: Computes Billable Fresh Qty, Returned Raw Qty, Kasar Qty, Total ₹
    Backend-->>Backend: Formats WhatsApp Udhari Reminder URL with polite Gujarati message
    Backend-->>UI: 200 OK (Summary + Transactions + whatsapp_udhari_url)
    UI-->>Owner: Renders Dual Audit Table with thumbnails + WhatsApp Udhari Button
    
    par 1. WhatsApp Udhari Reminder
        Owner->>UI: Clicks "📲 વોટ્સએપ ઉઘરાણી મેસેજ"
        UI->>Party: Opens WhatsApp chat with prefilled Gujarati statement & proof link
    and 2. Printable Zero-Dispute Statement
        Owner->>UI: Clicks "🖨️ A4 સ્ટેટમેન્ટ પ્રિન્ટ કરો"
        UI->>UI: Triggers window.print() with @media print stylesheet
        UI-->>Party: Gives signed A4 paper statement with photos
    and 3. Tally Prime Integration
        Owner->>UI: Clicks "📊 Tally CSV ડાઉનલોડ"
        UI->>Backend: GET /api/ledger/{party_id}/export-tally
        Backend-->>UI: Returns RFC 4180 CSV compatible with Tally Prime
        UI->>Owner: Downloads `Radhe_Creation_Tally_Ledger.csv`
    end
```

---

# SECTION 6: API ENDPOINT SPECIFICATION, REQUEST/RESPONSE CONTRACTS & ERROR HANDLING

| HTTP Method | Path | Summary & Purpose | Auth | Request Body | Success Response | Status |
|---|---|---|---|---|---|---|
| `GET` | `/` | Root endpoint: API overview, Swagger docs link, cluster status | None | None | `{system, version, status, docs}` | `200 OK` |
| `GET` | `/api/health` | System health, DB type (Neon/SQLite), AI status | None | None | `{status, db, ai_mode, version}` | `200 OK` |
| `GET` | `/api/dashboard/summary` | **v2.0:** High-level factory KPIs & alerts | None | None | `DashboardSummaryRead` | `200 OK` |
| `POST` | `/api/challans` | Create Inward/Outward Challan (w/ Duplicate Guard) | None | `ChallanCreate` (JSON) | `ChallanRead` | `201 Created` |
| `GET` | `/api/challans` | List challans (filterable by party, type, date) | None | Query params | `List[ChallanRead]` | `200 OK` |
| `GET` | `/api/challans/{id}` | Get single challan with linked deliveries | None | Path `id` | `ChallanDetailRead` | `200 OK` |
| `GET` | `/api/lots/pending` | Active lots with live balances & completion % | None | None | `List[PendingLotRead]` | `200 OK` |
| `POST` | `/api/lots/{id}/dispatch` | **v2.0:** Partial delivery (Fresh, Returned Raw, Kasar, Fent) | None | `LotDispatchCreate` | `LotDispatchResponse` | `200 OK` |
| `POST` | `/api/ai/parse-challan-image` | Multimodal Vision OCR on handwritten slip | None | `file` (Multipart FormData) | `AIChallanOCRResponse` | `200 OK` |
| `POST` | `/api/ai/process-message` | Gujarati/English natural language intent parsing | None | `{message: string}` | `AIMessageResponse` | `200 OK` |
| `POST` | `/api/calculator/quote` | Compute break-even cost and 25% quote rate | None | `QuoteRequest` | `QuoteResponse` | `200 OK` |
| `POST` | `/api/shifts/log` | **v2.0:** Record LCD counter & persist bonus/alert | None | `ShiftLogCreate` | `ShiftLogRead` | `201 Created` |
| `GET` | `/api/shifts/summary` | Machine shift comparison & bonus reports | None | Query `?date=YYYY-MM-DD` | `List[ShiftSummaryRead]` | `200 OK` |
| `GET` | `/api/parties` | List parties with active lot count & contact | None | None | `List[PartyRead]` | `200 OK` |
| `GET` | `/api/ledger/{party_id}` | **v2.0:** Reconciled statement, billing ₹ & WhatsApp link | None | Path `party_id` | `PartyLedgerRead` | `200 OK` |
| `GET` | `/api/ledger/{party_id}/export-tally` | Download Tally Prime-compatible CSV ledger | None | Path `party_id` | `text/csv` attachment | `200 OK` |

---

### 6.2 Typed Request & Response JSON Contracts (v2.0)

#### Contract 1: `GET /api/dashboard/summary` (v2.0 Factory KPIs)
**Response (`200 OK`):**
```json
{
  "total_pending_pcs": 2480.0,
  "total_pending_mtr": 4200.0,
  "active_lots_count": 5,
  "estimated_pending_billing_inr": 104160.0,
  "low_shift_alerts_count": 1,
  "system_status": "ONLINE",
  "database_type": "NEON_POSTGRESQL"
}
```

#### Contract 2: `POST /api/ai/parse-challan-image` (v2.0 OCR Extraction)
**Request:** Multipart form data with field `file` (image binary: JPEG/PNG/WebP).

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "challan_type": "INWARD",
    "party_name": "Radhe Creation (સુરત)",
    "challan_number": "RC-1048",
    "challan_date": "2026-10-24",
    "design_number": "D-1024",
    "factory_punch_number": "SK-45",
    "agreed_rate": 42.0,
    "stitches_per_piece": 28000,
    "fabric_type": "Fox Georgette",
    "quantity": 1200.0,
    "unit": "PCS",
    "raw_gujarati_notes": "ગળા-દામન વર્ક, ૧૨૦૦ નંગ કટ પીસ, પંચિંગ SK-45, ભાવ ₹૪૨",
    "confidence_score": 0.98,
    "is_demo_fallback": false,
    "photo_url": "/uploads/challan_rc_1048_1729774000.jpg"
  }
}
```

#### Contract 3: `POST /api/lots/{inward_id}/dispatch` (v2.0 Tranche Delivery)
**Request:**
```json
{
  "outward_challan_number": "JW-405",
  "fresh_quantity": 400.0,
  "returned_raw_quantity": 50.0,
  "kasar_quantity": 20.0,
  "fent_quantity": 10.0,
  "dispatch_date": "2026-10-24",
  "photo_url": "/uploads/outward_jw_405.jpg",
  "notes": "૪૦૦ પીસ ફ્રેશ, ૫૦ પીસ કાચો પરત, ૨૦ પીસ કાસર, ૧૦ પીસ ફેંટ"
}
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "message": "જાવક સફળતાપૂર્વક નોંધાઈ ગઈ (Outward delivery recorded)",
  "data": {
    "lot_id": "c3a1b2d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "total_inward": 1200.0,
    "fresh_quantity": 400.0,
    "returned_raw_quantity": 50.0,
    "kasar_quantity": 20.0,
    "fent_quantity": 10.0,
    "total_accounted": 480.0,
    "pending_balance": 720.0,
    "billable_amount_inr": 16800.0,
    "status": "IN_PROGRESS",
    "whatsapp_message": "નમસ્તે રાધે ક્રિએશન, ચલણ RC-1048 સામે જાવક JW-405 થી 400 પીસ ફ્રેશ (બિલિંગ રકમ: ₹16,800), 50 પીસ કાચો પરત, 20 પીસ કાસર મોકલેલ છે. હવે બાકી માલ 720 પીસ રહ્યો છે."
  }
}
```

#### Contract 4: `GET /api/ledger/{party_id}` (v2.0 Reconciled Statement & WhatsApp Udhari)
**Response (`200 OK`):**
```json
{
  "party_id": "9f8e7d6c-5b4a-3f2e-1d0c-9b8a7f6e5d4c",
  "party_name": "Radhe Creation (સુરત)",
  "party_phone": "+91 98250 12345",
  "city": "Surat",
  "summary": {
    "total_inward_qty": 1200.0,
    "total_billable_fresh_qty": 400.0,
    "total_returned_raw_qty": 50.0,
    "total_kasar_qty": 20.0,
    "total_fent_qty": 10.0,
    "pending_balance_qty": 720.0,
    "total_billable_amount_inr": 16800.0,
    "settlement_status": "PARTIALLY_DELIVERED"
  },
  "whatsapp_udhari_url": "https://wa.me/919825012345?text=%E0%AA%A8%E0%AA%AE%E0%AA%B8%E0%AB%8D%E0%AA%A4%E0%AB%87%20%E0%AA%B0%E0%AA%BE%E0%AA%A7%E0%AB%87%20%E0%AA%95%E0%AB%8D%E0%AA%B0%E0%AA%BF%E0%AA%8F%E0%AA%B6%E0%AA%A8%2C%20%E0%AA%9A%E0%AA%B2%E0%AA%BE%E0%AA%A8%20%E0%AA%B8%E0%AB%87%E0%AA%9F%E0%AA%B2%E0%AA%AE%E0%AB%87%E0%AA%A8%E0%AB%8D%E0%AA%9F%20%E0%AA%AE%E0%AB%81%E0%AA%9C%E0%AA%AC%20400%20%E0%AA%AB%E0%AB%8D%E0%AA%B0%E0%AB%87%E0%AA%B6%20%E0%AA%AA%E0%AB%80%E0%AA%B8%20%E0%AA%9A%E0%AB%8B%E0%AA%96%E0%AB%80%20%E0%AA%95%E0%AB%81%E0%AA%B2%20%E0%AA%AC%E0%AA%BF%E0%AA%B2%E0%AA%BF%E0%AA%82%E0%AA%97%20%E0%AA%B0%E0%AA%95%E0%AA%AE%20%E2%82%B916%2C800%20%E0%AA%A5%E0%AA%BE%E0%AA%AF%20%E0%AA%9B%E0%AB%87.%20%E0%AA%AB%E0%AB%8B%E0%AA%9F%E0%AB%8B%20%E0%AA%AA%E0%AB%8D%E0%AA%B0%E0%AB%82%E0%AA%AB%20%E0%AA%B8%E0%AA%BE%E0%AA%A5%E0%AB%87%20%E0%AA%9A%E0%AA%B2%E0%AA%A3%20%E0%AA%9C%E0%AB%8B%E0%AA%B5%E0%AA%BE%20%E0%AA%B2%E0%AA%BF%E0%AA%82%E0%AA%95%20%E0%AA%95%E0%AB%8D%E0%AA%B2%E0%AA%BF%E0%AA%95%20%E0%AA%95%E0%AA%B0%E0%AB%8B.",
  "inward_challans": [
    {
      "id": "c3a1b2d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
      "challan_number": "RC-1048",
      "challan_date": "2026-10-24",
      "design_number": "D-1024",
      "factory_punch_number": "SK-45",
      "agreed_rate": 42.0,
      "total_quantity": 1200.0,
      "unit": "PCS",
      "photo_url": "/uploads/challan_rc_1048.jpg"
    }
  ],
  "outward_deliveries": [
    {
      "outward_challan_number": "JW-405",
      "dispatch_date": "2026-10-24",
      "fresh_quantity": 400.0,
      "returned_raw_quantity": 50.0,
      "kasar_quantity": 20.0,
      "fent_quantity": 10.0,
      "billable_amount_inr": 16800.0,
      "photo_url": "/uploads/outward_jw_405.jpg"
    }
  ]
}
```

---

### 6.3 Validation Guards, Error Matrices & HTTP Status Codes

#### A. Core Business Validation Guards
1. **Duplicate Challan Guard (`409 Conflict`):**  
   Before creating an Inward or Outward Challan, queries `challans` where `party_id = :party_id AND challan_number = :challan_number AND challan_type = :challan_type`. If a match is found, creation is aborted with a bilingual error message.
2. **Overdelivery Guard v2.0 (`400 Bad Request`):**  
   In partial outward dispatches, the engine checks:
   $$\text{Existing Accounted} + \text{New Fresh} + \text{New Returned Raw} + \text{New Kasar} + \text{New Fent} \le Q_{\text{in}} \times 1.02$$
   A $2\%$ tolerance accommodates minor meterage variations in raw fabric rolls. Any dispatch beyond $102\%$ throws an overdelivery warning.
3. **Strict Unit Normalization (`422 Unprocessable Entity`):**  
   Only `PCS`, `MTR`, and `TAKA` are permitted. Inputs such as "Pieces", "Meters", or "Than" are normalized automatically by Pydantic validators before database insertion.

#### B. HTTP Error Matrix

| HTTP Code | Error Slug | Scenario | Bilingual Error Message |
|---|---|---|---|
| `400` | `OVERDELIVERY_EXCEEDED` | Outward dispatch quantity exceeds Inward Lot balance | જાવક જથ્થો આવક કરતા વધારે છે (Outward quantity exceeds inward balance) |
| `404` | `PARTY_NOT_FOUND` | Supplied `party_id` does not exist in `parties` table | વેપારી ખાતું મળ્યું નથી (Party record not found) |
| `404` | `LOT_NOT_FOUND` | Supplied `inward_challan_id` does not exist | આવક લોટ મળ્યો નથી (Inward lot record not found) |
| `409` | `DUPLICATE_CHALLAN_NUMBER` | Party already has a challan registered with this number | આ ચલણ નંબર પહેલેથી જ નોંધાયેલ છે (This challan number is already registered) |
| `422` | `INVALID_NUMERIC_FIELD` | Negative stitches, zero heads, or invalid date format | અમાન્ય માહિતી (Validation error in input fields) |
| `500` | `AI_EXTRACTION_FAILURE` | Image could not be parsed and no fallback matched | OCR પ્રોસેસિંગમાં ભૂલ આવી (Failed to process challan image) |
| `503` | `DATABASE_UNAVAILABLE` | Neon connection failed and SQLite fallback disabled | ડેટાબેઝ કનેક્શન નિષ્ફળ (Database connection unavailable) |

---

### Summary & Developer Next Steps
This blueprint (`ARCHITECTURE_AND_FLOW.md`) represents the complete, immutable architectural contract for **ChallanAI (EmbroideryOS) v2.0**.

Every module developed in Phase 1 (`/backend`) and Phase 2 (`/frontend`) must adhere strictly to the contracts, folder structures, and mathematical formulas specified in this document.
