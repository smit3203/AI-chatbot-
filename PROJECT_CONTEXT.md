# ChallanAI (EmbroideryOS) - Master Project Architecture & Context

## 1. Domain Overview & Industry Reality
In the Gujarat embroidery job-work clusters (Ahmedabad, Surat, Jetpur), manufacturing units operate under a pure **Job-Work Model**:
- **Zero Raw Fabric Ownership:** The embroidery unit never buys the cloth. Merchant clients ("Parties") supply raw fabric rolls (Taka/Meters) or pre-cut garment pieces (Kurtis, Sarees, Blouse pieces, Lehengas).
- **Physical Inward Challan (આવક ચલણ):** Delivered with paper challans written by hand or carbon copies, frequently in Gujarati or mixed Gujarati-English with regional numerals (`૧, ૨, ૩...` and Gujarati party/design notations).
- **Tranche Deliveries (ટુકડે-ટુકડે જાવક ચલણ):** Finished embroidered goods leave the factory in 3 to 6 batches as machine heads finish them. Each batch gets an Outward Challan.
- **The Kasar Dilemma (કાસર / Shortage Disputes):** Fabric defects, thread breaks, or lost paper challans cause disputes at month-end settlement. Parties claim shortages ("Kasar") and deduct 8%–15% from job-work payments unless the factory produces incontrovertible, photo-backed delivery receipts.
- **Shop-Floor Language & Literacy:** Supervisors ("Masters") and operators ("Karigars") avoid complex enterprise software. They work primarily via WhatsApp photos, voice notes, and vernacular texts in Gujarati and Hindi.

---

## 2. Core Reconciliation Equations

### A. Lot Balance Formula
For every Inward Lot $L$ received from a Party:
$$\text{Total Inward Qty} = Q_{\text{in}}$$
$$\text{Total Outward Delivered} = \sum Q_{\text{out\_fresh}}$$
$$\text{Total Kasar (Defect/Damage/Shortage)} = \sum Q_{\text{kasar}}$$
$$\text{Live Pending Balance (બાકી માલ)} = Q_{\text{in}} - \left( \sum Q_{\text{out\_fresh}} + \sum Q_{\text{kasar}} \right)$$

- **Lot Status Logic:**
  - $\text{Pending Balance} = Q_{\text{in}} \implies \text{RECEIVED (Not Started)}$
  - $0 < \text{Pending Balance} < Q_{\text{in}} \implies \text{IN\_PROGRESS (Partial Delivery)}$
  - $\text{Pending Balance} = 0 \implies \text{COMPLETED (Settled)}$
  - $\text{Pending Balance} < 0 \implies \text{OVERDELIVERED (Error Flag)}$

### B. Stitch-to-Profit Job-Work Rate Formula
Given:
- $S$ = Total Stitches in design (e.g., 28,000 stitches)
- $H$ = Machine Heads (e.g., 20 heads)
- $RPM$ = Effective Machine Running Speed (e.g., 650 RPM)
- $E$ = Machine Shift Efficiency Factor ($\approx 75\% - 85\%$ accounting for thread breakage and bobbin change)
- $C_{\text{shift}}$ = Shift Operational Cost (electricity + operator wages + maintenance + building overhead per 12-hr shift)
- $C_{\text{mat}}$ = Material Cost per piece (Jari thread, viscose embroidery thread, sequin/cord, backing paper/hydro-film)

$$\text{Effective Production Time per Batch (Minutes)} = \frac{S}{RPM \times E}$$
$$\text{Batches per 12-hr Shift} = \frac{720 \text{ min}}{\text{Production Time per Batch}}$$
$$\text{Total Pieces per Shift} = \text{Batches per Shift} \times H$$
$$\text{Machine Base Cost per Piece} = \frac{C_{\text{shift}}}{\text{Total Pieces per Shift}}$$
$$\text{Total Production Cost per Piece} = \text{Machine Base Cost per Piece} + C_{\text{mat}}$$
$$\text{Minimum Break-Even Rate} = \text{Total Production Cost per Piece}$$
$$\text{Recommended Party Quote (25% Margin)} = \text{Total Production Cost per Piece} \times 1.25$$

---

## 3. Database Schema Blueprint (PostgreSQL / SQLModel)

### 3.1 `parties` (વેપારી ખાતાઓ)
- `id`: UUID / Primary Key
- `name`: String (Indexed)
- `phone`: String (Nullable)
- `city`: String (Default: 'Surat' / 'Ahmedabad')
- `created_at`: DateTime (UTC)

### 3.2 `challans` (આવક / જાવક ચલણ માસ્ટર)
- `id`: UUID / Primary Key
- `challan_type`: Enum (`INWARD`, `OUTWARD`)
- `party_id`: UUID (Foreign Key -> `parties.id`, Indexed)
- `challan_number`: String (Physical slip number, Indexed)
- `challan_date`: Date
- `design_number`: String (Indexed)
- `fabric_type`: String (e.g., Silk, Rayon, Cotton, Georgette, Organza)
- `total_quantity`: Float
- `unit`: Enum (`PCS`, `MTR`, `TAKA`)
- `photo_url`: String (Path to uploaded challan photo)
- `notes`: Text (Nullable)
- `created_at`: DateTime (UTC)

### 3.3 `lot_deliveries` (ટુકડે-ટુકડે જાવક લિંક)
Links outward deliveries to original inward challan lots.
- `id`: UUID / Primary Key
- `inward_challan_id`: UUID (Foreign Key -> `challans.id`, Indexed)
- `outward_challan_id`: UUID (Foreign Key -> `challans.id`, Indexed)
- `fresh_quantity`: Float (Fresh delivered pieces/meters)
- `kasar_quantity`: Float (Damaged / shortage pieces accepted by party)
- `dispatch_date`: Date
- `created_at`: DateTime (UTC)

### 3.4 `machine_shifts` (શિફ્ટ વાઈઝ સ્ટીચ લોગ)
- `id`: UUID / Primary Key
- `machine_number`: String (e.g., 'M-01', 'M-02')
- `shift_type`: Enum (`DAY`, `NIGHT`)
- `shift_date`: Date
- `operator_name`: String
- `start_stitch_counter`: BigInt
- `end_stitch_counter`: BigInt
- `total_stitches`: BigInt (Computed: `end - start`)
- `rpm_average`: Integer
- `downtime_minutes`: Integer (Breakage / electricity / bobbin delay)
- `photo_url`: String (Photo of machine LCD counter screen)
- `notes`: Text (Nullable)
- `created_at`: DateTime (UTC)

### 3.5 `rate_quotes` (સ્ટીચ ભાવ કોટેશન)
- `id`: UUID / Primary Key
- `party_id`: UUID (Foreign Key -> `parties.id`, Nullable)
- `design_number`: String
- `stitch_count`: Integer
- `machine_heads`: Integer
- `material_type`: Enum (`THREAD_ONLY`, `JARI_THREAD`, `SEQUIN_CORD`, `MULTI_HEAVY`)
- `cost_per_piece`: Float
- `quoted_rate`: Float
- `profit_margin_pct`: Float
- `created_at`: DateTime (UTC)

---

## 4. REST API Endpoints Specification (FastAPI)

### A. Health & Diagnostics
- `GET /api/health` -> System status, DB connectivity, AI service mode.

### B. Challans & Lot Management
- `POST /api/challans` -> Create Inward/Outward challan with optional photo upload.
- `GET /api/challans` -> List filtered challans (by party, date, type).
- `GET /api/challans/{id}` -> Detailed challan info with linked deliveries.
- `GET /api/lots/pending` -> Live pending lot balances (grouped by Party and Design).
- `POST /api/lots/{inward_id}/dispatch` -> Record partial outward dispatch against an inward lot.

### C. AI Vision & Vernacular Message Processing
- `POST /api/ai/parse-challan-image` -> Multipart form image upload -> Gemini Vision OCR extracts structured JSON (`challan_type`, `party_name`, `challan_number`, `date`, `design_number`, `quantity`, `unit`, Gujarati text transcript) with smart local fallback if offline.
- `POST /api/ai/process-message` -> Natural language text/voice transcript (Gujarati/Hindi/English) -> AI extracts intent and auto-creates or queries challan/balance records.

### D. Stitch Calculator & Shift Tracking
- `POST /api/calculator/quote` -> Computes machine runtime, material consumption, break-even cost, and recommended quote.
- `POST /api/shifts/log` -> Log machine LCD stitch counters (Day/Night) and flag low-efficiency downtime.
- `GET /api/shifts/summary` -> Shift stitch comparison across machines.

### E. Party Ledger & Exports
- `GET /api/parties` -> List all parties with current active lot count.
- `GET /api/ledger/{party_id}` -> Complete date-wise ledger reconciling Inwards and Outwards with photo proof links.
- `GET /api/ledger/{party_id}/export-tally` -> Generates Tally Prime-compatible CSV format.

---

## 5. Frontend 4-Tab Mobile-First UI Blueprint

### Global Features
- **Bilingual Toggle (ગુજરાતી / English):** Instant language switch stored in local storage, changing all tab titles, labels, badges, and AI bot responses.
- **Mobile-First Responsive PWA:** Optimized for factory floor smartphones (360px - 430px) as well as desktop tablets/PCs.
- **Live Sync Badge:** Real-time indicator showing backend and database connection status.

### Tab 1: 💬 WhatsApp AI Bot (`/bot`)
- Authentic WhatsApp-styled conversation interface.
- Camera / Photo Upload button for paper challans + Quick-Test preloaded challan samples (Handwritten Gujarati & English challan samples).
- Text/Audio input supporting Gujarati queries (e.g., *"રાધે ક્રિએશનનો બાકી માલ કેટલો છે?"*).
- AI Munim response bubbles with structured summary cards, photo previews, and 1-click confirmation buttons to commit directly into the database.

### Tab 2: 📦 બાકી માલ - Pending Lots (`/pending`)
- Party-wise grouped lot cards showing: Inward Challan No, Design No, Fabric, Inward Date.
- Visual Progress Bar: Delivered vs. Kasar vs. Pending.
- 1-Click "જાવક નોંધો (Log Partial Delivery)" modal with instant Kasar damage quantity entry.

### Tab 3: 🧮 સ્ટીચ ભાવ - Stitch Rate & Shift Tracker (`/calculator`)
- **Stitch-to-Profit Calculator:** Interactive sliders/inputs for Stitch Count, Heads, RPM, Shift Cost, Material Type. Visual cards for Break-even Rate and Party Quote (25% profit).
- **Day/Night Machine Counter Log:** Machine number selector, Shift toggle (Day 8 AM - 8 PM vs. Night 8 PM - 8 AM), Start/End LCD stitch inputs, and low output alert.

### Tab 4: 📄 પાર્ટી ખાતું - Party Ledger & Proofs (`/ledger`)
- Party selector dropdown with search.
- Dual-table reconciliation view:
  - Inward vs. Outward with original Challan Photo thumbnail modals.
  - Zero-dispute Kasar summary.
- Export actions: 1-Click printable clean A4 layout for WhatsApp sharing + Tally CSV export.
