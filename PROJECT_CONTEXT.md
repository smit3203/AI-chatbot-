# ChallanAI (EmbroideryOS) - Master Project Architecture & Context (v2.0)

## 1. Domain Overview & Industry Reality
In the Gujarat embroidery job-work clusters (Surat, Ahmedabad, Jetpur), manufacturing units operate under a pure **Job-Work Model**:
- **Zero Raw Fabric Ownership:** The embroidery unit never buys the cloth. Merchant clients ("Parties") supply raw fabric rolls (Taka/Meters) or pre-cut garment pieces (Kurtis, Sarees, Blouse pieces, Lehengas).
- **Physical Inward Challan (આવક ચલણ):** Delivered with paper challans written by hand or carbon copies, frequently in Gujarati or mixed Gujarati-English with regional numerals (`૧, ૨, ૩...` and Gujarati party/design notations).
- **Tranche Deliveries (ટુકડે-ટુકડે જાવક ચલણ):** Finished embroidered goods leave the factory in 3 to 6 batches as machine heads finish them. Each batch gets an Outward Challan.
- **The Returned Raw Reality (કાચો માલ પરત - ₹0 Billed):** In Surat job-work, defective or excess unembroidered grey fabric is returned raw to the merchant. It must deduct from pending lot pieces but CANNOT be billed!
- **The Kasar Dilemma (કાસર / Shortage Disputes):** Fabric defects, thread breaks, or lost paper challans cause disputes at month-end settlement. Parties claim shortages ("Kasar") and deduct 8%–15% from job-work payments unless the factory produces incontrovertible, photo-backed delivery receipts.
- **Shop-Floor Language & Literacy:** Supervisors ("Masters") and operators ("Karigars") avoid complex enterprise software. They work primarily via WhatsApp photos, voice notes, and vernacular texts in Gujarati and Hindi.

---

## 2. Core Reconciliation Equations (v2.0)

### A. Lot Balance Formula (v2.0)
For every Inward Lot $L$ received from a Party:
$$\text{Total Inward Qty} = Q_{\text{in}}$$
$$\text{Total Outward Fresh Delivered} = \sum Q_{\text{out\_fresh}}$$
$$\text{Total Returned Raw (કાચો માલ પરત)} = \sum Q_{\text{returned\_raw}}$$
$$\text{Total Kasar (Defect/Damage/Shortage)} = \sum Q_{\text{kasar}}$$
$$\text{Total Fent (ફેંટ / ટુકડા)} = \sum Q_{\text{fent}}$$

$$\text{Live Pending Balance (બાકી માલ)} = Q_{\text{in}} - \left( \sum Q_{\text{out\_fresh}} + \sum Q_{\text{returned\_raw}} + \sum Q_{\text{kasar}} + \sum Q_{\text{fent}} \right)$$

- **Lot Status Logic:**
  - $\text{Pending Balance} = Q_{\text{in}} \implies \text{RECEIVED (Not Started)}$
  - $0 < \text{Pending Balance} < Q_{\text{in}} \implies \text{IN\_PROGRESS (Partial Delivery)}$
  - $\text{Pending Balance} = 0 \implies \text{COMPLETED (Settled)}$
  - $\text{Pending Balance} < 0 \implies \text{OVERDELIVERED (Error Flag / Guard Triggered)}$

- **102% Overdelivery Guard:**
  $$\text{Total Outward Accounted} \le Q_{\text{in}} \times 1.02$$
  Prevents fraudulent duplicate deliveries or wrong lot linking with an automatic 422 HTTP rejection.

- **Net Billable Amount Formula:**
  $$\text{Net Billable Job-Work ₹} = \sum \left( Q_{\text{out\_fresh}} \times \text{Agreed Rate} \right)$$
  *(Returned Raw fabric is strictly accounted at ₹0 rate in billing).*

### B. Machine Shift Efficiency & Operator Bonus Formulas (v2.0)
Given:
- $\text{Total Stitches} = \text{End Counter} - \text{Start Counter}$
- $\text{Target Stitches}$ (e.g., 400,000 stitches per 12-hr shift)
- $\text{Bonus Rate}$ (e.g., ₹0.20 per 1,000 stitches above target)

$$\text{Shift Efficiency \%} = \left( \frac{\text{Total Stitches}}{\text{Target Stitches}} \right) \times 100$$
$$\text{Operator Bonus ₹} = \max\left(0, \frac{\text{Total Stitches} - \text{Target Stitches}}{1000} \times \text{Bonus Rate}\right)$$
$$\text{Low Efficiency Alert} = \text{True if Efficiency \%} < 70\%$$

### C. Stitch-to-Profit Job-Work Rate Formula
Given:
- $S$ = Total Stitches in design (e.g., 28,000 stitches)
- $H$ = Machine Heads (e.g., 20 heads)
- $RPM$ = Effective Machine Running Speed (e.g., 650 RPM)
- $E$ = Machine Shift Efficiency Factor ($\approx 75\% - 85\%$)
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

## 3. Database Schema Blueprint (PostgreSQL / SQLModel v3.0 Multi-Tenant)

### 3.1 `factories` (કારખાના ટેનન્ટ ખાતાઓ - Tenant Table)
- `id`: UUID / Primary Key (default `uuid4`)
- `factory_code`: String (Unique, Indexed, e.g. `'EMB-1001'`, `'EMB-1002'`)
- `factory_name`: String (e.g. `'Shree Krishna Embroidery'`, `'Patel Twist & Embroidery'`)
- `owner_name`: String (e.g. `'Prince'`, `'Rameshbhai Patel'`)
- `phone`: String (Unique, Indexed — Owner contact)
- `city`: String (Default: `'Surat'` / `'Ahmedabad'`)
- `address`: String (Factory floor location)
- `gstin`: String (GST Identification Number)
- `bank_name`: String (e.g. `'HDFC Bank'`, `'Kotak Mahindra Bank'`)
- `bank_account_no`: String (Current account number)
- `bank_ifsc`: String (IFSC Code)
- `upi_id`: String (UPI Virtual Payment Address for QR bill)
- `default_machine_heads`: Integer (Default: 20)
- `subscription_plan`: String (`TRIAL_15_DAYS`, `PRO_MONTHLY_1500`, `PRO_YEARLY_15000`)
- `subscription_status`: String (`ACTIVE`, `EXPIRED`)
- `trial_ends_at`: DateTime (UTC, default +15 days)
- `created_at`: DateTime (UTC)

### 3.2 `users` (યુઝર લોગિન ખાતાઓ - User Table)
- `id`: UUID / Primary Key
- `user_code`: String (Unique, Indexed, e.g. `'USR-1001'`)
- `factory_id`: UUID (Foreign Key -> `factories.id`, Indexed)
- `login_id`: String (Unique, Indexed — Mobile or Username)
- `password_hash`: String (Hashed credentials)
- `full_name`: String
- `role`: String (`OWNER`, `SUPERVISOR`, `ACCOUNTANT`)
- `created_at`: DateTime (UTC)

### 3.3 `parties` (વેપારી ખાતાઓ - Scoped by `factory_id`)
- `id`: UUID / Primary Key
- `factory_id`: UUID (Foreign Key -> `factories.id`, Indexed)
- `name`: String (Indexed)
- `phone`: String (Nullable)
- `city`: String (Default: 'Surat' / 'Ahmedabad')
- `gstin`: String (Nullable)
- `created_at`: DateTime (UTC)

### 3.4 `challans` (આવક / જાવક ચલણ માસ્ટર - Scoped by `factory_id`)
- `id`: UUID / Primary Key
- `factory_id`: UUID (Foreign Key -> `factories.id`, Indexed)
- `challan_type`: Enum (`INWARD`, `OUTWARD`)
- `party_id`: UUID (Foreign Key -> `parties.id`, Indexed)
- `challan_number`: String (Physical slip number, Indexed)
- `challan_date`: Date
- `design_number`: String (Indexed, Party Design Number)
- `factory_punch_number`: String (Nullable, Machine .DST punch card e.g. 'SK-45')
- `fabric_type`: String (e.g., Silk, Rayon, Cotton, Georgette, Organza)
- `total_quantity`: Float
- `unit`: Enum (`PCS`, `MTR`, `TAKA`)
- `stitches_per_piece`: Integer (Default: 0)
- `agreed_rate`: Float (Default: 0.0, Job-work rate per piece/meter)
- `photo_url`: String (Path to uploaded challan photo)
- `design_photo_url`: String (Nullable, Photo of physical embroidery design sample)
- `notes`: Text (Nullable)
- `created_at`: DateTime (UTC)
- **Constraint:** DB UniqueConstraint `(factory_id, party_id, challan_number, challan_type)`

### 3.5 `lot_deliveries` (ટુકડે-ટુકડે જાવક લિંક - Scoped by `factory_id`)
Links outward deliveries to original inward challan lots.
- `id`: UUID / Primary Key
- `factory_id`: UUID (Foreign Key -> `factories.id`, Indexed)
- `inward_challan_id`: UUID (Foreign Key -> `challans.id`, Indexed)
- `outward_challan_id`: UUID (Foreign Key -> `challans.id`, Indexed)
- `fresh_quantity`: Float (Fresh delivered pieces/meters)
- `returned_raw_quantity`: Float (Unembroidered grey fabric returned raw @ ₹0)
- `kasar_quantity`: Float (Damaged / shortage pieces accepted by party)
- `fent_quantity`: Float (Cut fabric remnants / fent pieces)
- `dispatch_date`: Date
- `notes`: Text (Nullable)
- `created_at`: DateTime (UTC)

### 3.6 `machine_shifts` (શિફ્ટ વાઈઝ સ્ટીચ લોગ - Scoped by `factory_id`)
- `id`: UUID / Primary Key
- `factory_id`: UUID (Foreign Key -> `factories.id`, Indexed)
- `machine_number`: String (e.g., 'M-01', 'M-02')
- `shift_type`: Enum (`DAY`, `NIGHT`)
- `shift_date`: Date
- `operator_name`: String
- `start_stitch_counter`: BigInteger (Lifetime stitch counter)
- `end_stitch_counter`: BigInteger (Lifetime stitch counter)
- `total_stitches`: BigInteger (Computed: `end - start`)
- `target_stitches`: BigInteger (Shift production benchmark, default 400,000)
- `efficiency_pct`: Float (Computed: `(total / target) * 100`)
- `bonus_earned_inr`: Float (Operator incentive for exceeding target)
- `is_low_efficiency_alert`: Boolean (True if efficiency < 70%)
- `rpm_average`: Integer
- `downtime_minutes`: Integer (Breakage / electricity / bobbin delay)
- `photo_url`: String (Photo of machine LCD counter screen)
- `notes`: Text (Nullable)
- `created_at`: DateTime (UTC)

### 3.7 `karigar_advances` (કારીગર ઉપાડ ખાતું - Scoped by `factory_id`)
- `id`: UUID / Primary Key
- `factory_id`: UUID (Foreign Key -> `factories.id`, Nullable, Indexed)
- `operator_name`: String (Indexed)
- `advance_date`: Date
- `amount_inr`: Float
- `notes`: Text (Nullable)
- `created_at`: DateTime (UTC)

### 3.6 `rate_quotes` (સ્ટીચ ભાવ કોટેશન)
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

## 4. REST API Endpoints Specification (FastAPI v2.0)

### A. Health & Dashboard Summary
- `GET /api/health` -> System status, DB connectivity, AI service mode.
- `GET /api/dashboard/summary` -> High-level factory KPIs (Total Active Lots, Pending Pieces, Today's Stitches, Unsettled Ledger Balance ₹).
- `POST /api/demo/reset` -> Clears temporary demo rows and cleanly reseeds the canonical v2.0 Gujarat dataset.

### B. Challans & Lot Management
- `POST /api/challans` -> Create Inward/Outward challan with photo upload and automatic outward lot linking.
- `GET /api/challans` -> List filtered challans (by party, date, type).
- `GET /api/challans/{id}` -> Detailed challan info with linked deliveries.
- `GET /api/lots/pending` -> Live pending lot balances with 4-way progress (Fresh, Returned Raw, Kasar, Fent).
- `POST /api/lots/{inward_id}/dispatch` -> Record partial outward dispatch against an inward lot with 102% overdelivery protection.

### C. AI Vision & Vernacular Message Processing
- `POST /api/ai/parse-challan-image` -> Multipart form image upload -> Gemini 2.5 Flash Vision OCR extracts structured v2.0 JSON (`challan_type`, `party_name`, `challan_number`, `date`, `design_number`, `factory_punch_number`, `total_quantity`, `fresh_quantity`, `returned_raw_quantity`, `kasar_quantity`, `fent_quantity`, `unit`, `agreed_rate`, Gujarati transcript) with local fallback.
- `POST /api/ai/process-message` -> Natural language text/voice transcript (Gujarati/Hindi/English) -> AI extracts intent and executes or queries records.

### D. Stitch Calculator, Shift Tracking & Karigar Salary
- `POST /api/calculator/quote` -> Computes machine runtime, material consumption, break-even cost, and recommended quote.
- `POST /api/shifts/log` -> Log machine LCD stitch counters (Day/Night), computes efficiency %, bonus INR, and flags downtime.
- `GET /api/shifts/summary` -> Shift stitch comparison and operator rankings across machines.
- `GET /api/karigars/summary` -> Aggregates operator shifts, base pay, stitch bonuses, total upaad advances, and net payable salary.
- `POST /api/karigars/upaad` -> Record cash advance (ઉપાડ) for an operator.

### E. Party Ledger, Consumables & Exports
- `GET /api/parties` -> List all parties with current active lot count.
- `GET /api/ledger/{party_id}` -> Complete date-wise ledger reconciling Inwards and Outwards with sanitized WhatsApp reminder link and photo proof links.
- `GET /api/ledger/{party_id}/export-tally` -> Generates Tally Prime-compatible XML/CSV format.
- `GET /api/designs` -> Returns visual design master catalog with punching codes and agreed rates.
- `GET /api/consumables` & `POST /api/consumables/toggle` -> Thread/Jari/Bobbin stock alerts.

---

## 5. Frontend 4-Tab Mobile-First UI Blueprint (v2.0)

### Global Features
- **Bilingual Toggle (ગુજરાતી / English):** Instant language switch stored in localStorage, updating all tab titles, labels, badges, and bot slips.
- **Top Header:** Shows Factory Name (`શ્રી કૃષ્ણ એમ્બ્રોઇડરી`), Live DB/AI Status Badge, Demo Reset Button, and Design Catalog shortcut.
- **Floating Quick-Action Speed Button (`+ ઝડપી એન્ટ્રી`):** 4-action speed menu accessible anywhere in the app.

### Tab 1: 💬 WhatsApp AI Bot (`/bot`)
- Authentic WhatsApp-styled conversation interface.
- 4 Preset chips:
  1. `📸 Radhe Inward 1200 Pcs`
  2. `📦 Maruti Outward 400 Fresh + 50 Raw`
  3. `⚠️ Duplicate Guard Test #RC-1048`
  4. `🖥️ Dahao LCD 4.45L Stitches`
- Confirmation cards for Inward and Outward with direct linking into Tab 2.
- 409 Conflict duplicate prevention warning bubble in Gujarati & English.

### Tab 2: 📦 બાકી માલ - Pending Lots (`/pending`)
- Consumables status quick bar at the top (Polyester, Jari, Bobbin, Sequin, Paper) with 1-tap stock toggle and vendor reorder button.
- Party-wise grouped lot cards with **4-color stacked progress bars**:
  - Emerald (`Fresh Delivered`)
  - Sky Blue (`Returned Raw @ ₹0`)
  - Rose (`Kasar + Fent`)
  - Slate (`Pending Floor Balance`)
- 1-Click `જાવક નોંધો (Log Partial Delivery)` modal with 1-tap quick fill chips (`[ બાકી બધો માલ ફ્રેશ ]`, `[ +100 ]`, `[ +200 ]`) and live preview.

### Tab 3: 🧮 સ્ટીચ ભાવ, શિફ્ટ & કારીગર ખાતું (`/calculator`)
- **Sub-tab 1: Stitch-to-Profit Costing Calculator** with real-time visual cards for Break-even Rate, Recommended Quote, Pieces/Shift, and Shift Profit.
- **Sub-tab 2: Day/Night Machine Counter Logs** with efficiency %, operator bonus badges, and low-efficiency alert banners.
- **Sub-tab 3: 👷 કારીગર હિસાબ (Karigar Salary Tracker)** with shift counts, base pay, bonus, cash advance (upaad), net salary, and 1-click WhatsApp salary slip.

### Tab 4: 📄 પાર્ટી ખાતું - Party Ledger & Zero-Dispute A4 Print (`/ledger`)
- Party selector dropdown with search.
- **5% GST Toggle:** Switch between `કાચો હિસાબ (Estimate)` and `પાકું GST બિલ (5% Job-Work GST - HSN 998821)` with CGST (2.5%) + SGST (2.5%).
- Embedded SVG/JPG challan photo proof modals.
- Factory Bank Details & Vector Scan-to-Pay UPI QR Code.
- `@media print` A4 Zero-Dispute Party Statement with Inward vs. Outward tables, Returned Raw proof, and signature boxes.
