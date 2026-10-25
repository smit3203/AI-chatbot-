# 🧵 ChallanAI (EmbroideryOS) v2.0
### Surat & Gujarat Textile Embroidery Job-Work Operating System
**Bilingual (ગુજરાતી / English) • Mobile-First PWA • Multimodal Vision OCR • Zero-Dispute Lot Reconciliation**

---

## 🌟 Overview

**ChallanAI (EmbroideryOS)** is an AI-powered job-work operating system engineered specifically for Gujarat's textile embroidery clusters (Surat, Ahmedabad, Jetpur). It replaces physical paper slips, chaotic WhatsApp voice notes, and manual registers with an automated, photo-verified operating system designed for the rough conditions of factory floors.

### 🏭 Why It Matters in Surat Job-Work
1. **Zero Fabric Ownership:** Job-work units embroider merchant fabric on a piece/meter basis.
2. **Tranche Deliveries (ટુકડે-ટુકડે જાવક):** Finished embroidered goods leave the factory in multiple small dispatches.
3. **The Kasar Dilemma (કાસર / Shortage Disputes):** Merchants deduct 8%–15% at month-end unless the factory produces incontrovertible photo proofs.
4. **Returned Raw Fabric (કાચો માલ પરત):** Unembroidered grey fabric is returned raw at ₹0 billing and must deduct from the lot balance without adding to the billable amount.
5. **Shop-Floor Ergonomics:** Built for operators ("Karigars") and floor masters in vernacular Gujarati with 1-tap quick buttons and high-contrast touch interfaces.

---

## 🚀 Quick Start (Windows PowerShell)

Ensure you have **Python 3.10+** and **Node.js 18+** installed.

### 1️⃣ Start the Backend API (FastAPI, Port 8000)

Open a PowerShell terminal:

```powershell
# Navigate to backend directory
cd c:\Users\NAWAB\ai-chatbot\AI-chatbot-\backend

# (Optional) Activate Python virtual environment if configured
# .\.venv\Scripts\Activate.ps1

# Install Python dependencies
pip install -r requirements.txt

# Seed canonical v2.0 Gujarat dataset (Parties, Inward Lots, Outward Dispatches, Shifts, Upaad)
python seed.py

# Launch FastAPI backend with auto-reload
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

* API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
* Health Status: [http://localhost:8000/api/health](http://localhost:8000/api/health)
* Dashboard Summary: [http://localhost:8000/api/dashboard/summary](http://localhost:8000/api/dashboard/summary)

---

### 2️⃣ Start the Frontend Web App (Next.js 14, Port 3000)

Open a **separate** PowerShell terminal:

```powershell
# Navigate to frontend directory
cd c:\Users\NAWAB\ai-chatbot\AI-chatbot-\frontend

# Install Node dependencies
npm install

# Run Next.js development server
npm run dev
```

* Frontend Application: [http://localhost:3000](http://localhost:3000)
* Built with Next.js 14 App Router, Lucide Icons, and Vanilla Tailwind CSS.

---

## 🏗️ v2.0 Core Architecture & Features

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ChallanAI (EmbroideryOS) v2.0                         │
├────────────────────────────────┬────────────────────────────────────────────┤
│ 💬 Tab 1: WhatsApp AI Bot       │ • OCR via Gemini 2.5 Flash Vision          │
│                                │ • 4 Presets: Inward, Outward, 409 Guard,   │
│                                │   and Dahao LCD Stitch Counter             │
│                                │ • Vernacular Gujarati text/audio queries   │
├────────────────────────────────┼────────────────────────────────────────────┤
│ 📦 Tab 2: બાકી માલ (Lots)      │ • 4-Color Stacked Progress Bar:            │
│                                │   Emerald (Fresh), Sky (Raw ₹0), Rose      │
│                                │   (Kasar/Fent), Slate (Pending Floor)      │
│                                │ • Consumables Quick Alert Bar (Cones, Jari)│
│                                │ • 1-Tap Outward Quick-Dispatch Modal       │
├────────────────────────────────┼────────────────────────────────────────────┤
│ 🧮 Tab 3: સ્ટીચ ભાવ & શિફ્ટ     │ • Stitch-to-Profit Costing Calculator      │
│                                │ • Day/Night Machine Shift Stitch Tracking  │
│                                │ • 👷 Karigar Upaad & Monthly Salary Ledger │
│                                │ • 1-Click WhatsApp Salary Slip Generator   │
├────────────────────────────────┼────────────────────────────────────────────┤
│ 📄 Tab 4: પાર્ટી ખાતું (Ledger)  │ • Zero-Dispute Inward vs. Outward Ledger   │
│                                │ • 5% Job-Work GST Toggle (HSN 998821)      │
│                                │ • High-Resolution A4 Statement Print       │
│                                │ • Factory Bank Details & Vector UPI QR Box │
├────────────────────────────────┼────────────────────────────────────────────┤
│ ⚡ Floating Quick-Action Button │ • 1-Tap shortcut menu for all core tasks   │
│ 🎨 Design Master Catalog       │ • Punching Code (.DST) & Stitch Catalog    │
└────────────────────────────────┴────────────────────────────────────────────┘
```

---

## 📐 Mathematical Reconciliation Formulas

### 1. Lot Balance Formula
$$\text{Pending Balance} = Q_{\text{in}} - \left( \sum Q_{\text{fresh}} + \sum Q_{\text{raw}} + \sum Q_{\text{kasar}} + \sum Q_{\text{fent}} \right)$$

### 2. 102% Overdelivery Guard
$$\text{Total Outward} \le Q_{\text{in}} \times 1.02$$
*(Rejects duplicate dispatches exceeding 102% of inward lot volume).*

### 3. Net Billable Job-Work Amount
$$\text{Net Billable ₹} = \sum \left( Q_{\text{fresh}} \times \text{Agreed Rate} \right)$$
*(Returned Raw fabric is strictly accounted at ₹0 rate in billing).*

### 4. Operator Shift Efficiency & Bonus
$$\text{Efficiency \%} = \left( \frac{\text{Total Stitches}}{\text{Target Stitches}} \right) \times 100$$
$$\text{Bonus ₹} = \max\left(0, \frac{\text{Actual} - \text{Target}}{1000} \times ₹0.20\right)$$

---

## 🧪 Testing & Validation

```powershell
# Validate Frontend TypeScript (0 errors)
cd frontend
npx tsc --noEmit

# Validate Production Next.js Build
npm run build

# Validate Backend API & Reseed
cd ../backend
python seed.py
```

---

## 📄 License
Private & Proprietary — Developed for Gujarat Textile Hubs & Modern Job-Work Factories.