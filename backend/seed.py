import os
from pathlib import Path
from datetime import date, datetime, timezone, timedelta
from uuid import uuid4
from sqlmodel import Session, select
from database import engine, init_db
from models import (
    Factory, User, UserRole, SubscriptionPlan, SubscriptionStatus,
    Party, Challan, ChallanType, UnitType, LotDelivery,
    MachineShift, ShiftType, RateQuote, MaterialType, KarigarAdvance
)
from auth import hash_password

SVG_RADHE_INWARD = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="100%" height="100%">
  <rect width="600" height="800" fill="#fffdfa" stroke="#cbd5e1" stroke-width="2"/>
  <rect x="20" y="20" width="560" height="760" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4 2"/>
  <text x="300" y="55" font-family="'Noto Sans Gujarati', sans-serif" font-size="14" font-weight="bold" fill="#b45309" text-anchor="middle">|| શ્રી ગણેશાય નમઃ ||</text>
  <text x="300" y="90" font-family="'Noto Sans Gujarati', sans-serif" font-size="24" font-weight="900" fill="#0f172a" text-anchor="middle">રાધે ક્રિએશન (RADHE CREATION)</text>
  <text x="300" y="112" font-family="sans-serif" font-size="11" fill="#475569" text-anchor="middle">Ring Road Textile Market, Surat - 395002 | Mo. 98250 12345</text>
  <line x1="40" y1="125" x2="560" y2="125" stroke="#e2e8f0" stroke-width="2"/>
  <rect x="210" y="135" width="180" height="28" rx="6" fill="#0284c7"/>
  <text x="300" y="154" font-family="'Noto Sans Gujarati', sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle">આવક ચલણ (INWARD SLIP)</text>
  <rect x="40" y="180" width="520" height="70" rx="8" fill="#f8fafc" stroke="#e2e8f0"/>
  <text x="55" y="205" font-family="sans-serif" font-size="12" font-weight="bold" fill="#1e293b">Challan No: <tspan fill="#0284c7" font-weight="900">RC-1048</tspan></text>
  <text x="55" y="235" font-family="sans-serif" font-size="12" font-weight="bold" fill="#1e293b">Job-Worker: <tspan fill="#047857">Shree Krishna Embroidery</tspan></text>
  <text x="380" y="205" font-family="sans-serif" font-size="12" font-weight="bold" fill="#1e293b">Date: <tspan fill="#475569">24/10/2026</tspan></text>
  <text x="380" y="235" font-family="sans-serif" font-size="12" font-weight="bold" fill="#1e293b">City: <tspan fill="#475569">Surat (સુરત)</tspan></text>
  <rect x="40" y="270" width="520" height="32" fill="#0f172a" rx="4"/>
  <text x="60" y="291" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff">SR</text>
  <text x="110" y="291" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff">DESIGN / PUNCH</text>
  <text x="260" y="291" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff">FABRIC TYPE</text>
  <text x="400" y="291" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff">AGREED RATE</text>
  <text x="500" y="291" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff">QTY</text>
  <rect x="40" y="305" width="520" height="55" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="0.5"/>
  <text x="60" y="337" font-family="sans-serif" font-size="12" fill="#334155">1</text>
  <text x="110" y="328" font-family="sans-serif" font-size="13" font-weight="bold" fill="#0284c7">D-1024</text>
  <text x="110" y="348" font-family="sans-serif" font-size="11" fill="#64748b">Punch: SK-45 (28,000 st)</text>
  <text x="260" y="337" font-family="sans-serif" font-size="12" fill="#1e293b">Fox Georgette</text>
  <text x="400" y="337" font-family="sans-serif" font-size="13" font-weight="bold" fill="#047857">₹42.00 / Pc</text>
  <text x="500" y="337" font-family="sans-serif" font-size="14" font-weight="900" fill="#0f172a">1200 PCS</text>
  <rect x="40" y="365" width="520" height="35" fill="#e2e8f0"/>
  <text x="320" y="388" font-family="sans-serif" font-size="12" font-weight="bold" fill="#1e293b">TOTAL INWARD PIECES:</text>
  <text x="490" y="388" font-family="sans-serif" font-size="14" font-weight="900" fill="#0284c7">1,200 PCS</text>
  <rect x="40" y="420" width="520" height="90" rx="8" fill="#fffbeb" stroke="#fde68a"/>
  <text x="55" y="445" font-family="'Noto Sans Gujarati', sans-serif" font-size="12" font-weight="bold" fill="#92400e">વિગત (Notes):</text>
  <text x="55" y="470" font-family="'Noto Sans Gujarati', sans-serif" font-size="12" fill="#78350f">ગળા-દામન વર્ક, ૧૨૦૦ નંગ કટ પીસ, પંચિંગ SK-45 .DST, ભાવ ₹૪૨/પીસ નક્કી કરેલ છે.</text>
  <text x="55" y="492" font-family="'Noto Sans Gujarati', sans-serif" font-size="11" fill="#b45309">કાચો માલ પરત હિસાબમાં ₹૦ ગણવો. કાસર ૨% મર્યાદા રહેશે.</text>
  <g transform="translate(420, 620) rotate(-12)">
    <circle cx="50" cy="50" r="45" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-dasharray="3 2"/>
    <text x="50" y="42" font-family="sans-serif" font-size="10" font-weight="bold" fill="#dc2626" text-anchor="middle">RADHE CREATION</text>
    <text x="50" y="58" font-family="'Noto Sans Gujarati', sans-serif" font-size="11" font-weight="bold" fill="#dc2626" text-anchor="middle">સુરત</text>
    <text x="50" y="72" font-family="sans-serif" font-size="9" font-weight="bold" fill="#dc2626" text-anchor="middle">RECEIVED OK</text>
  </g>
  <line x1="60" y1="720" x2="200" y2="720" stroke="#64748b" stroke-width="1"/>
  <text x="130" y="738" font-family="'Noto Sans Gujarati', sans-serif" font-size="11" fill="#475569" text-anchor="middle">માલ આપનાર સહી</text>
  <line x1="400" y1="720" x2="540" y2="720" stroke="#64748b" stroke-width="1"/>
  <text x="470" y="738" font-family="'Noto Sans Gujarati', sans-serif" font-size="11" fill="#475569" text-anchor="middle">સ્વીકારનાર સહી (કારખાનું)</text>
</svg>"""

SVG_MARUTI_OUTWARD = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="100%" height="100%">
  <rect width="600" height="800" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
  <rect x="20" y="20" width="560" height="760" fill="none" stroke="#059669" stroke-width="2"/>
  <text x="300" y="55" font-family="'Noto Sans Gujarati', sans-serif" font-size="14" font-weight="bold" fill="#065f46" text-anchor="middle">|| શ્રી ઉમિયા માતાય નમઃ ||</text>
  <text x="300" y="90" font-family="'Noto Sans Gujarati', sans-serif" font-size="24" font-weight="900" fill="#0f172a" text-anchor="middle">મારુતિ એમ્બ્રોઇડરી (MARUTI EMBROIDERY)</text>
  <text x="300" y="112" font-family="sans-serif" font-size="11" fill="#475569" text-anchor="middle">Narol Textile GIDC, Ahmedabad - 382405 | Mo. 98980 67890</text>
  <line x1="40" y1="125" x2="560" y2="125" stroke="#a7f3d0" stroke-width="2"/>
  <rect x="190" y="135" width="220" height="28" rx="6" fill="#059669"/>
  <text x="300" y="154" font-family="'Noto Sans Gujarati', sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle">જાવક ડિલિવરી ચલણ (OUTWARD SLIP)</text>
  <rect x="40" y="180" width="520" height="70" rx="8" fill="#ffffff" stroke="#e2e8f0"/>
  <text x="55" y="205" font-family="sans-serif" font-size="12" font-weight="bold" fill="#1e293b">Outward Slip No: <tspan fill="#059669" font-weight="900">ME-802</tspan></text>
  <text x="55" y="235" font-family="sans-serif" font-size="12" font-weight="bold" fill="#1e293b">Against Inward Lot: <tspan fill="#475569">ME-101 (800 Pcs)</tspan></text>
  <text x="380" y="205" font-family="sans-serif" font-size="12" font-weight="bold" fill="#1e293b">Date: <tspan fill="#475569">24/10/2026</tspan></text>
  <text x="380" y="235" font-family="sans-serif" font-size="12" font-weight="bold" fill="#1e293b">Design: <tspan fill="#0284c7">D-402 (MR-12)</tspan></text>
  <rect x="40" y="270" width="520" height="32" fill="#065f46" rx="4"/>
  <text x="60" y="291" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff">CATEGORY</text>
  <text x="220" y="291" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff">PARTICULARS</text>
  <text x="380" y="291" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff">BILLING RATE</text>
  <text x="490" y="291" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff">DISPATCH QTY</text>
  <rect x="40" y="305" width="520" height="150" fill="#ffffff" stroke="#cbd5e1" stroke-width="0.5"/>
  <text x="60" y="330" font-family="sans-serif" font-size="12" font-weight="bold" fill="#047857">1. FRESH (તૈયાર)</text>
  <text x="220" y="330" font-family="sans-serif" font-size="12" fill="#1e293b">Finished Embroidered Silk</text>
  <text x="380" y="330" font-family="sans-serif" font-size="12" font-weight="bold" fill="#047857">₹35.00 / Pc</text>
  <text x="500" y="330" font-family="sans-serif" font-size="13" font-weight="900" fill="#047857">400 PCS</text>
  <line x1="45" y1="345" x2="555" y2="345" stroke="#f1f5f9"/>
  <text x="60" y="367" font-family="sans-serif" font-size="12" font-weight="bold" fill="#0284c7">2. RAW RET. (કાચો પરત)</text>
  <text x="220" y="367" font-family="sans-serif" font-size="12" fill="#1e293b">Unembroidered Grey Fabric</text>
  <text x="380" y="367" font-family="sans-serif" font-size="12" font-weight="bold" fill="#64748b">₹0.00 (Unbilled)</text>
  <text x="500" y="367" font-family="sans-serif" font-size="13" font-weight="900" fill="#0284c7">50 PCS</text>
  <line x1="45" y1="382" x2="555" y2="382" stroke="#f1f5f9"/>
  <text x="60" y="404" font-family="sans-serif" font-size="12" font-weight="bold" fill="#e11d48">3. KASAR (કાસર)</text>
  <text x="220" y="404" font-family="sans-serif" font-size="12" fill="#1e293b">Thread Defect / Shortage</text>
  <text x="380" y="404" font-family="sans-serif" font-size="12" fill="#64748b">-</text>
  <text x="500" y="404" font-family="sans-serif" font-size="13" font-weight="bold" fill="#e11d48">20 PCS</text>
  <line x1="45" y1="419" x2="555" y2="419" stroke="#f1f5f9"/>
  <text x="60" y="441" font-family="sans-serif" font-size="12" font-weight="bold" fill="#d97706">4. FENT (ફેંટ)</text>
  <text x="220" y="441" font-family="sans-serif" font-size="12" fill="#1e293b">Fabric Cut Piece Remnants</text>
  <text x="380" y="441" font-family="sans-serif" font-size="12" fill="#64748b">-</text>
  <text x="500" y="441" font-family="sans-serif" font-size="13" font-weight="bold" fill="#d97706">10 PCS</text>
  <rect x="40" y="465" width="520" height="40" fill="#ecfdf5" stroke="#a7f3d0"/>
  <text x="60" y="490" font-family="sans-serif" font-size="12" font-weight="bold" fill="#065f46">TOTAL DISPATCHED: 480 PCS</text>
  <text x="340" y="490" font-family="sans-serif" font-size="12" font-weight="bold" fill="#047857">BILLABLE AMOUNT: ₹14,000.00</text>
  <g transform="translate(420, 620) rotate(-8)">
    <circle cx="50" cy="50" r="45" fill="none" stroke="#059669" stroke-width="2.5" stroke-dasharray="3 2"/>
    <text x="50" y="42" font-family="sans-serif" font-size="10" font-weight="bold" fill="#059669" text-anchor="middle">MARUTI EMB.</text>
    <text x="50" y="58" font-family="'Noto Sans Gujarati', sans-serif" font-size="11" font-weight="bold" fill="#059669" text-anchor="middle">અમદાવાદ</text>
    <text x="50" y="72" font-family="sans-serif" font-size="9" font-weight="bold" fill="#059669" text-anchor="middle">DISPATCH OK</text>
  </g>
  <line x1="60" y1="720" x2="200" y2="720" stroke="#64748b" stroke-width="1"/>
  <text x="130" y="738" font-family="'Noto Sans Gujarati', sans-serif" font-size="11" fill="#475569" text-anchor="middle">ડ્રાઇવર / ડિલિવરી સહી</text>
  <line x1="400" y1="720" x2="540" y2="720" stroke="#64748b" stroke-width="1"/>
  <text x="470" y="738" font-family="'Noto Sans Gujarati', sans-serif" font-size="11" fill="#475569" text-anchor="middle">વેપારી રિસિવર સહી</text>
</svg>"""

SVG_OUTWARD_JW_405 = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="100%" height="100%">
  <rect width="600" height="800" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <rect x="25" y="25" width="550" height="750" fill="none" stroke="#2563eb" stroke-width="2"/>
  <text x="300" y="60" font-family="'Noto Sans Gujarati', sans-serif" font-size="14" font-weight="bold" fill="#1e3a8a" text-anchor="middle">|| શ્રી ખોડિયાર કૃપા ||</text>
  <text x="300" y="95" font-family="'Noto Sans Gujarati', sans-serif" font-size="22" font-weight="900" fill="#0f172a" text-anchor="middle">શ્રી કૃષ્ણા એમ્બ્રોઇડરી (SHREE KRISHNA EMBROIDERY)</text>
  <text x="300" y="118" font-family="sans-serif" font-size="11" fill="#475569" text-anchor="middle">Plot 45, Embroidery Park, Varachha, Surat | Mo. 98250 12345</text>
  <line x1="45" y1="130" x2="555" y2="130" stroke="#93c5fd" stroke-width="2"/>
  <rect x="200" y="140" width="200" height="28" rx="6" fill="#2563eb"/>
  <text x="300" y="159" font-family="'Noto Sans Gujarati', sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle">ડિલિવરી ચલણ (DELIVERY SLIP)</text>
  <rect x="45" y="185" width="510" height="65" rx="6" fill="#eff6ff" stroke="#bfdbfe"/>
  <text x="60" y="210" font-family="sans-serif" font-size="12" font-weight="bold" fill="#1e3a8a">Challan No: <tspan fill="#2563eb" font-weight="900">JW-405</tspan></text>
  <text x="60" y="235" font-family="sans-serif" font-size="12" font-weight="bold" fill="#1e3a8a">To: <tspan fill="#0f172a">Radhe Creation (સુરત)</tspan></text>
  <text x="360" y="210" font-family="sans-serif" font-size="12" font-weight="bold" fill="#1e3a8a">Date: 24/10/2026</text>
  <text x="360" y="235" font-family="sans-serif" font-size="12" font-weight="bold" fill="#1e3a8a">Inward Lot: RC-1048</text>
  <rect x="45" y="265" width="510" height="30" fill="#1e293b" rx="4"/>
  <text x="65" y="285" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff">PARTICULARS</text>
  <text x="320" y="285" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff">RATE</text>
  <text x="460" y="285" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff">QUANTITY</text>
  <rect x="45" y="295" width="510" height="150" fill="#f8fafc" stroke="#cbd5e1" stroke-width="0.5"/>
  <text x="65" y="325" font-family="sans-serif" font-size="12" font-weight="bold" fill="#047857">1. Fresh Embroidered (D-1024)</text>
  <text x="320" y="325" font-family="sans-serif" font-size="12" fill="#047857">₹42.00</text>
  <text x="460" y="325" font-family="sans-serif" font-size="13" font-weight="900" fill="#047857">400 PCS</text>
  <line x1="50" y1="340" x2="550" y2="340" stroke="#e2e8f0"/>
  <text x="65" y="360" font-family="sans-serif" font-size="12" font-weight="bold" fill="#0284c7">2. Returned Raw Fabric (કાચો પરત)</text>
  <text x="320" y="360" font-family="sans-serif" font-size="12" fill="#64748b">₹0.00</text>
  <text x="460" y="360" font-family="sans-serif" font-size="13" font-weight="900" fill="#0284c7">50 PCS</text>
  <line x1="50" y1="375" x2="550" y2="375" stroke="#e2e8f0"/>
  <text x="65" y="395" font-family="sans-serif" font-size="12" font-weight="bold" fill="#e11d48">3. Kasar / Shortage (કાસર)</text>
  <text x="320" y="395" font-family="sans-serif" font-size="12" fill="#64748b">-</text>
  <text x="460" y="395" font-family="sans-serif" font-size="13" font-weight="bold" fill="#e11d48">20 PCS</text>
  <line x1="50" y1="410" x2="550" y2="410" stroke="#e2e8f0"/>
  <text x="65" y="430" font-family="sans-serif" font-size="12" font-weight="bold" fill="#d97706">4. Fent / Cut Piece (ફેંટ)</text>
  <text x="320" y="430" font-family="sans-serif" font-size="12" fill="#64748b">-</text>
  <text x="460" y="430" font-family="sans-serif" font-size="13" font-weight="bold" fill="#d97706">10 PCS</text>
  <rect x="45" y="455" width="510" height="40" fill="#dbeafe" stroke="#93c5fd"/>
  <text x="60" y="480" font-family="sans-serif" font-size="12" font-weight="bold" fill="#1e3a8a">TOTAL OUTWARD: 480 PCS</text>
  <text x="330" y="480" font-family="sans-serif" font-size="13" font-weight="900" fill="#1d4ed8">NET BILLABLE: ₹16,800.00</text>
</svg>"""

SVG_DAHAO_LCD = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
  <rect width="600" height="400" fill="#0f172a" rx="16"/>
  <rect x="15" y="15" width="570" height="370" fill="#1e293b" rx="10" stroke="#334155" stroke-width="3"/>
  <rect x="35" y="35" width="530" height="50" fill="#0284c7" rx="6"/>
  <text x="50" y="67" font-family="monospace" font-size="20" font-weight="bold" fill="#ffffff">DAHAO BECS-328 EMBROIDERY CONTROLLER</text>
  <rect x="35" y="100" width="250" height="110" fill="#020617" rx="6" stroke="#0ea5e9" stroke-width="2"/>
  <text x="50" y="130" font-family="sans-serif" font-size="12" font-weight="bold" fill="#38bdf8">CURRENT STITCH COUNTER</text>
  <text x="50" y="185" font-family="monospace" font-size="40" font-weight="900" fill="#22c55e">14,645,000</text>
  <rect x="315" y="100" width="250" height="110" fill="#020617" rx="6" stroke="#334155" stroke-width="1.5"/>
  <text x="330" y="130" font-family="sans-serif" font-size="12" font-weight="bold" fill="#94a3b8">SHIFT START COUNTER</text>
  <text x="330" y="185" font-family="monospace" font-size="40" font-weight="900" fill="#f8fafc">14,200,000</text>
  <rect x="35" y="230" width="530" height="135" fill="#020617" rx="6" stroke="#22c55e" stroke-width="2"/>
  <text x="55" y="265" font-family="sans-serif" font-size="14" font-weight="bold" fill="#4ade80">12-HOUR SHIFT PRODUCTION: +445,000 STITCHES</text>
  <text x="55" y="295" font-family="sans-serif" font-size="12" fill="#94a3b8">Target: 400,000 | Efficiency: 111.25% (Target Exceeded!)</text>
  <text x="55" y="325" font-family="sans-serif" font-size="13" font-weight="bold" fill="#fbbf24">Karigar Bonus Earned: ₹67.50 (+45,000 st @ ₹15/10k)</text>
  <text x="55" y="348" font-family="sans-serif" font-size="11" fill="#64748b">Machine: M-01 | Operator: Ramesh Karigar | RPM Avg: 680</text>
</svg>"""


def ensure_demo_images():
    """Generates 4 crisp, authentic Gujarati/English SVGs for demo presets."""
    backend_upload_dir = Path(__file__).parent / "uploads"
    backend_upload_dir.mkdir(parents=True, exist_ok=True)

    frontend_public_upload_dir = Path(__file__).parent.parent / "frontend" / "public" / "uploads"
    frontend_public_upload_dir.mkdir(parents=True, exist_ok=True)

    images = {
        "preset_radhe_inward.jpg": SVG_RADHE_INWARD,
        "preset_maruti_outward.jpg": SVG_MARUTI_OUTWARD,
        "outward_jw_405.jpg": SVG_OUTWARD_JW_405,
        "preset_dahao_lcd.jpg": SVG_DAHAO_LCD,
    }

    for filename, content in images.items():
        b_path = backend_upload_dir / filename
        b_path.write_text(content, encoding="utf-8")
        f_path = frontend_public_upload_dir / filename
        f_path.write_text(content, encoding="utf-8")

    print("[Seed Engine] 4 crisp SVG slip & LCD previews successfully generated in /uploads")


def seed_database():
    """Seeds realistic Gujarat multi-tenant embroidery job-work test data (v3.0)."""
    init_db()
    ensure_demo_images()

    with Session(engine) as session:
        print("[Seed Engine] Clearing existing records for clean multi-tenant v3.0 seeding...")
        for obj in session.exec(select(LotDelivery)).all():
            session.delete(obj)
        for obj in session.exec(select(Challan)).all():
            session.delete(obj)
        for obj in session.exec(select(MachineShift)).all():
            session.delete(obj)
        for obj in session.exec(select(RateQuote)).all():
            session.delete(obj)
        for obj in session.exec(select(KarigarAdvance)).all():
            session.delete(obj)
        for obj in session.exec(select(Party)).all():
            session.delete(obj)
        for obj in session.exec(select(User)).all():
            session.delete(obj)
        for obj in session.exec(select(Factory)).all():
            session.delete(obj)
        session.commit()

        print("[Seed Engine] Seeding Factory Tenant #1 (EMB-1001: Shree Krishna Embroidery, Surat)...")

        # -------------------------------------------------------------
        # TENANT 1: SHREE KRISHNA EMBROIDERY (SURAT) - EMB-1001
        # -------------------------------------------------------------
        now = datetime.now(timezone.utc)
        factory_1 = Factory(
            factory_code="EMB-1001",
            factory_name="Shree Krishna Embroidery",
            owner_name="Prince",
            phone="9825012345",
            city="Surat",
            address="Plot 45, Embroidery Park, Varachha Road, Surat - 395006",
            gstin="24AAACS1234E1Z5",
            bank_name="HDFC Bank (Varachha Branch)",
            bank_account_no="50200089234120",
            bank_ifsc="HDFC0001234",
            upi_id="shreekrishna.embroidery@okaxis",
            default_machine_heads=20,
            subscription_plan=SubscriptionPlan.PRO_MONTHLY_1500,
            subscription_status=SubscriptionStatus.ACTIVE,
            trial_ends_at=now + timedelta(days=30),
            created_at=now
        )
        session.add(factory_1)
        session.commit()
        session.refresh(factory_1)

        user_1 = User(
            user_code="USR-1001",
            factory_id=factory_1.id,
            login_id="9825012345",
            password_hash=hash_password("123456"),
            full_name="Prince Seth",
            role=UserRole.OWNER,
            created_at=now
        )
        session.add(user_1)
        session.commit()

        # Tenant 1 Parties
        party_radhe = Party(
            factory_id=factory_1.id,
            name="Radhe Creation (સુરત)",
            phone="+91 98250 12345",
            city="Surat"
        )
        party_maruti = Party(
            factory_id=factory_1.id,
            name="Maruti Embroidery (અમદાવાદ)",
            phone="+91 98980 67890",
            city="Ahmedabad"
        )
        party_shivam = Party(
            factory_id=factory_1.id,
            name="Shivam Textiles (જેતપુર)",
            phone="+91 97123 45678",
            city="Jetpur"
        )
        party_khodiyar = Party(
            factory_id=factory_1.id,
            name="Khodiyar Fashion (સુરત)",
            phone="+91 94260 54321",
            city="Surat"
        )
        session.add_all([party_radhe, party_maruti, party_shivam, party_khodiyar])
        session.commit()
        session.refresh(party_radhe)
        session.refresh(party_maruti)
        session.refresh(party_shivam)
        session.refresh(party_khodiyar)

        # Tenant 1 Inward Challans
        inward_radhe = Challan(
            factory_id=factory_1.id,
            challan_type=ChallanType.INWARD,
            party_id=party_radhe.id,
            challan_number="RC-1048",
            challan_date=date(2026, 10, 24),
            design_number="D-1024",
            factory_punch_number="SK-45",
            agreed_rate=42.0,
            stitches_per_piece=28000,
            fabric_type="Fox Georgette",
            total_quantity=1200.0,
            unit=UnitType.PCS,
            photo_url="/uploads/preset_radhe_inward.jpg",
            notes="ગળા-દામન વર્ક, ૧૨૦૦ નંગ કટ પીસ, પંચિંગ SK-45, ભાવ ₹૪૨/પીસ"
        )
        inward_maruti = Challan(
            factory_id=factory_1.id,
            challan_type=ChallanType.INWARD,
            party_id=party_maruti.id,
            challan_number="ME-101",
            challan_date=date(2026, 10, 23),
            design_number="D-402",
            factory_punch_number="MR-12",
            agreed_rate=35.0,
            stitches_per_piece=22000,
            fabric_type="Pure Silk",
            total_quantity=800.0,
            unit=UnitType.PCS,
            photo_url="/uploads/preset_maruti_outward.jpg",
            notes="૮૦૦ પીસ સિલ્ક કુર્તી ફ્રન્ટ વર્ક, પંચિંગ MR-12, ભાવ ₹૩૫/પીસ"
        )
        inward_shivam = Challan(
            factory_id=factory_1.id,
            challan_type=ChallanType.INWARD,
            party_id=party_shivam.id,
            challan_number="ST-5501",
            challan_date=date(2026, 10, 22),
            design_number="D-8820",
            factory_punch_number="SH-09",
            agreed_rate=18.5,
            stitches_per_piece=14000,
            fabric_type="Rayon 14kg",
            total_quantity=3500.0,
            unit=UnitType.MTR,
            notes="૩૫૦૦ મીટર આખા તાકા, મલ્ટી કોર્ડિંગ વર્ક"
        )
        inward_khodiyar = Challan(
            factory_id=factory_1.id,
            challan_type=ChallanType.INWARD,
            party_id=party_khodiyar.id,
            challan_number="KF-309",
            challan_date=date(2026, 10, 21),
            design_number="D-701",
            factory_punch_number="KF-77",
            agreed_rate=55.0,
            stitches_per_piece=34000,
            fabric_type="Organza Tissue",
            total_quantity=600.0,
            unit=UnitType.PCS,
            notes="૬૦૦ પીસ ઓર્ગેન્ઝા દુપટ્ટા બોર્ડર, ભાવ ₹૫૫/પીસ"
        )
        session.add_all([inward_radhe, inward_maruti, inward_shivam, inward_khodiyar])
        session.commit()
        session.refresh(inward_radhe)
        session.refresh(inward_maruti)
        session.refresh(inward_shivam)
        session.refresh(inward_khodiyar)

        # Tenant 1 Outwards & Deliveries
        outward_radhe_1 = Challan(
            factory_id=factory_1.id,
            challan_type=ChallanType.OUTWARD,
            party_id=party_radhe.id,
            challan_number="JW-405",
            challan_date=date(2026, 10, 24),
            design_number="D-1024",
            factory_punch_number="SK-45",
            agreed_rate=42.0,
            stitches_per_piece=28000,
            fabric_type="Fox Georgette",
            total_quantity=400.0,
            unit=UnitType.PCS,
            photo_url="/uploads/outward_jw_405.jpg",
            notes="જાવક: ૪૦૦ પીસ ફ્રેશ, ૫૦ પીસ કાચો પરત, ૨૦ પીસ કાસર, ૧૦ પીસ ફેંટ"
        )
        session.add(outward_radhe_1)
        session.commit()
        session.refresh(outward_radhe_1)

        delivery_radhe_1 = LotDelivery(
            factory_id=factory_1.id,
            inward_challan_id=inward_radhe.id,
            outward_challan_id=outward_radhe_1.id,
            fresh_quantity=400.0,
            returned_raw_quantity=50.0,
            kasar_quantity=20.0,
            fent_quantity=10.0,
            dispatch_date=date(2026, 10, 24)
        )

        outward_maruti_1 = Challan(
            factory_id=factory_1.id,
            challan_type=ChallanType.OUTWARD,
            party_id=party_maruti.id,
            challan_number="JW-401",
            challan_date=date(2026, 10, 23),
            design_number="D-402",
            factory_punch_number="MR-12",
            agreed_rate=35.0,
            stitches_per_piece=22000,
            fabric_type="Pure Silk",
            total_quantity=200.0,
            unit=UnitType.PCS,
            notes="૨૦૦ પીસ ફ્રેશ જાવક અને ૧૦ પીસ કાસર"
        )
        session.add(outward_maruti_1)
        session.commit()
        session.refresh(outward_maruti_1)

        delivery_maruti_1 = LotDelivery(
            factory_id=factory_1.id,
            inward_challan_id=inward_maruti.id,
            outward_challan_id=outward_maruti_1.id,
            fresh_quantity=200.0,
            returned_raw_quantity=0.0,
            kasar_quantity=10.0,
            fent_quantity=0.0,
            dispatch_date=date(2026, 10, 23)
        )

        outward_shivam_1 = Challan(
            factory_id=factory_1.id,
            challan_type=ChallanType.OUTWARD,
            party_id=party_shivam.id,
            challan_number="JW-398",
            challan_date=date(2026, 10, 23),
            design_number="D-8820",
            factory_punch_number="SH-09",
            agreed_rate=18.5,
            stitches_per_piece=14000,
            fabric_type="Rayon 14kg",
            total_quantity=1500.0,
            unit=UnitType.MTR,
            notes="૧૫૦૦ મીટર ફ્રેશ ડિલિવરી"
        )
        session.add(outward_shivam_1)
        session.commit()
        session.refresh(outward_shivam_1)

        delivery_shivam_1 = LotDelivery(
            factory_id=factory_1.id,
            inward_challan_id=inward_shivam.id,
            outward_challan_id=outward_shivam_1.id,
            fresh_quantity=1500.0,
            returned_raw_quantity=0.0,
            kasar_quantity=50.0,
            fent_quantity=30.0,
            dispatch_date=date(2026, 10, 23)
        )

        session.add_all([delivery_radhe_1, delivery_maruti_1, delivery_shivam_1])
        session.commit()

        # Tenant 1 Machine Shifts
        shift_1 = MachineShift(
            factory_id=factory_1.id,
            machine_number="M-01",
            shift_type=ShiftType.DAY,
            shift_date=date(2026, 10, 24),
            operator_name="Ramesh Karigar",
            start_stitch_counter=14200000,
            end_stitch_counter=14645000,
            total_stitches=445000,
            target_stitches=400000,
            efficiency_pct=111.25,
            bonus_earned_inr=67.50,
            is_low_efficiency_alert=False,
            rpm_average=680,
            downtime_minutes=25,
            photo_url="/uploads/preset_dahao_lcd.jpg",
            notes="૪.૪૫ લાખ સ્ટીચ - ટાર્ગેટ કરતા વધારે ઉત્પાદન, કારીગર બોનસ ₹૬૭.૫૦"
        )
        shift_2 = MachineShift(
            factory_id=factory_1.id,
            machine_number="M-02",
            shift_type=ShiftType.DAY,
            shift_date=date(2026, 10, 24),
            operator_name="Maheshbhai",
            start_stitch_counter=8900000,
            end_stitch_counter=9315000,
            total_stitches=415000,
            target_stitches=400000,
            efficiency_pct=103.75,
            bonus_earned_inr=22.50,
            is_low_efficiency_alert=False,
            rpm_average=650,
            downtime_minutes=35,
            notes="૪.૧૫ લાખ સ્ટીચ - સામાન્ય શિફ્ટ"
        )
        shift_3 = MachineShift(
            factory_id=factory_1.id,
            machine_number="M-01",
            shift_type=ShiftType.NIGHT,
            shift_date=date(2026, 10, 23),
            operator_name="Udinbhai",
            start_stitch_counter=13920000,
            end_stitch_counter=14200000,
            total_stitches=280000,
            target_stitches=400000,
            efficiency_pct=70.0,
            bonus_earned_inr=0.0,
            is_low_efficiency_alert=True,
            rpm_average=520,
            downtime_minutes=140,
            notes="રાત્રે ૨ કલાક લાઇટ ગઈ અને દોરો તૂટવાની તકલીફ હતી (Downtime alert)"
        )
        shift_4 = MachineShift(
            factory_id=factory_1.id,
            machine_number="M-03",
            shift_type=ShiftType.DAY,
            shift_date=date(2026, 10, 24),
            operator_name="Bhaveshbhai",
            start_stitch_counter=5100000,
            end_stitch_counter=5530000,
            total_stitches=430000,
            target_stitches=400000,
            efficiency_pct=107.5,
            bonus_earned_inr=45.0,
            is_low_efficiency_alert=False,
            rpm_average=660,
            downtime_minutes=20,
            notes="૪.૩૦ લાખ સ્ટીચ - સારો રન"
        )
        session.add_all([shift_1, shift_2, shift_3, shift_4])
        session.commit()

        # Tenant 1 Quotes
        quote_1 = RateQuote(
            factory_id=factory_1.id,
            party_id=party_radhe.id,
            design_number="D-1024",
            stitch_count=28000,
            machine_heads=20,
            material_type=MaterialType.JARI_THREAD,
            cost_per_piece=16.73,
            quoted_rate=20.91,
            profit_margin_pct=25.0
        )
        quote_2 = RateQuote(
            factory_id=factory_1.id,
            party_id=party_maruti.id,
            design_number="D-402",
            stitch_count=22000,
            machine_heads=20,
            material_type=MaterialType.THREAD_ONLY,
            cost_per_piece=13.80,
            quoted_rate=17.25,
            profit_margin_pct=25.0
        )
        session.add_all([quote_1, quote_2])

        # Tenant 1 Advances
        adv_1 = KarigarAdvance(
            factory_id=factory_1.id,
            karigar_name="Ramesh Karigar",
            amount=2000.0,
            advance_date=date(2026, 10, 18),
            notes="રવિવાર રોકડ ઉપાડ (Sunday Cash)"
        )
        adv_2 = KarigarAdvance(
            factory_id=factory_1.id,
            karigar_name="Ramesh Karigar",
            amount=2500.0,
            advance_date=date(2026, 10, 22),
            notes="ઘર ખર્ચ ઉપાડ (Household expense)"
        )
        adv_3 = KarigarAdvance(
            factory_id=factory_1.id,
            karigar_name="Maheshbhai",
            amount=3000.0,
            advance_date=date(2026, 10, 20),
            notes="તહેવાર ઉપાડ (Festival Advance)"
        )
        adv_4 = KarigarAdvance(
            factory_id=factory_1.id,
            karigar_name="Udinbhai",
            amount=3500.0,
            advance_date=date(2026, 10, 15),
            notes="દવા ખર્ચ (Medical expense)"
        )
        adv_5 = KarigarAdvance(
            factory_id=factory_1.id,
            karigar_name="Udinbhai",
            amount=2000.0,
            advance_date=date(2026, 10, 24),
            notes="રોકડ ઉપાડ (Cash advance)"
        )
        adv_6 = KarigarAdvance(
            factory_id=factory_1.id,
            karigar_name="Bhaveshbhai",
            amount=2000.0,
            advance_date=date(2026, 10, 21),
            notes="રોકડ ઉપાડ (Cash advance)"
        )
        session.add_all([adv_1, adv_2, adv_3, adv_4, adv_5, adv_6])
        session.commit()

        # -------------------------------------------------------------
        # TENANT 2: PATEL TWIST & EMBROIDERY WORKS (AHMEDABAD) - EMB-1002
        # -------------------------------------------------------------
        print("[Seed Engine] Seeding Factory Tenant #2 (EMB-1002: Patel Twist & Embroidery Works, Ahmedabad)...")

        factory_2 = Factory(
            factory_code="EMB-1002",
            factory_name="Patel Twist & Embroidery Works",
            owner_name="Rameshbhai Patel",
            phone="9898011111",
            city="Ahmedabad",
            address="Plot 12-14, Odhav GIDC Industrial Estate, Ahmedabad - 382415",
            gstin="24BBBPW9999F1Z2",
            bank_name="Kotak Mahindra Bank (Odhav GIDC)",
            bank_account_no="881122334455",
            bank_ifsc="KKBK0000888",
            upi_id="patelembroidery@kotak",
            default_machine_heads=22,
            subscription_plan=SubscriptionPlan.PRO_YEARLY_15000,
            subscription_status=SubscriptionStatus.ACTIVE,
            trial_ends_at=now + timedelta(days=365),
            created_at=now
        )
        session.add(factory_2)
        session.commit()
        session.refresh(factory_2)

        user_2 = User(
            user_code="USR-1002",
            factory_id=factory_2.id,
            login_id="9898011111",
            password_hash=hash_password("123456"),
            full_name="Rameshbhai Patel",
            role=UserRole.OWNER,
            created_at=now
        )
        session.add(user_2)
        session.commit()

        # Tenant 2 Parties (Ahmedabad-only)
        party_bansi = Party(
            factory_id=factory_2.id,
            name="Bansi Ethnic (Ahmedabad)",
            phone="+91 98790 33445",
            city="Ahmedabad"
        )
        party_karnavati = Party(
            factory_id=factory_2.id,
            name="Karnavati Kurtis (Narol)",
            phone="+91 99090 77889",
            city="Ahmedabad"
        )
        session.add_all([party_bansi, party_karnavati])
        session.commit()
        session.refresh(party_bansi)
        session.refresh(party_karnavati)

        # Tenant 2 Inward Challans
        inward_bansi = Challan(
            factory_id=factory_2.id,
            challan_type=ChallanType.INWARD,
            party_id=party_bansi.id,
            challan_number="BE-301",
            challan_date=date(2026, 10, 24),
            design_number="D-901",
            factory_punch_number="BP-901",
            agreed_rate=38.0,
            stitches_per_piece=24000,
            fabric_type="Fox Georgette",
            total_quantity=950.0,
            unit=UnitType.PCS,
            notes="બંસી એથનિક કુરતી વર્ક, ૯૫૦ નંગ કટ પીસ"
        )
        inward_karnavati = Challan(
            factory_id=factory_2.id,
            challan_type=ChallanType.INWARD,
            party_id=party_karnavati.id,
            challan_number="KK-502",
            challan_date=date(2026, 10, 23),
            design_number="D-905",
            factory_punch_number="KK-14",
            agreed_rate=34.0,
            stitches_per_piece=19000,
            fabric_type="Rayon 14kg",
            total_quantity=600.0,
            unit=UnitType.PCS,
            notes="કર્ણાવતી નારોલ રાયોન લોટ, ૬૦૦ પીસ"
        )
        session.add_all([inward_bansi, inward_karnavati])
        session.commit()
        session.refresh(inward_bansi)
        session.refresh(inward_karnavati)

        # Tenant 2 Outward & Delivery
        outward_bansi = Challan(
            factory_id=factory_2.id,
            challan_type=ChallanType.OUTWARD,
            party_id=party_bansi.id,
            challan_number="BE-910",
            challan_date=date(2026, 10, 25),
            design_number="D-901",
            factory_punch_number="BP-901",
            agreed_rate=38.0,
            stitches_per_piece=24000,
            fabric_type="Fox Georgette",
            total_quantity=450.0,
            unit=UnitType.PCS,
            notes="૪૫૦ પીસ ફ્રેશ + ૧૦ પીસ કાસર + ૫ પીસ ફેંટ"
        )
        session.add(outward_bansi)
        session.commit()
        session.refresh(outward_bansi)

        delivery_bansi = LotDelivery(
            factory_id=factory_2.id,
            inward_challan_id=inward_bansi.id,
            outward_challan_id=outward_bansi.id,
            fresh_quantity=450.0,
            returned_raw_quantity=0.0,
            kasar_quantity=10.0,
            fent_quantity=5.0,
            dispatch_date=date(2026, 10, 25)
        )
        session.add(delivery_bansi)
        session.commit()

        # Tenant 2 Machine Shift
        shift_t2 = MachineShift(
            factory_id=factory_2.id,
            machine_number="P-01",
            shift_type=ShiftType.DAY,
            shift_date=date(2026, 10, 25),
            operator_name="Kishorbhai",
            start_stitch_counter=4200000,
            end_stitch_counter=4610000,
            total_stitches=410000,
            target_stitches=400000,
            efficiency_pct=102.5,
            bonus_earned_inr=15.0,
            is_low_efficiency_alert=False,
            rpm_average=660,
            downtime_minutes=25,
            notes="૪.૧૦ લાખ સ્ટીચ - અમદાવાદ પ્લાન્ટ"
        )
        session.add(shift_t2)

        # Tenant 2 Quote
        quote_t2 = RateQuote(
            factory_id=factory_2.id,
            party_id=party_bansi.id,
            design_number="D-901",
            stitch_count=24000,
            machine_heads=22,
            material_type=MaterialType.JARI_THREAD,
            cost_per_piece=14.50,
            quoted_rate=18.13,
            profit_margin_pct=25.0
        )
        session.add(quote_t2)

        # Tenant 2 Advance
        adv_t2 = KarigarAdvance(
            factory_id=factory_2.id,
            karigar_name="Kishorbhai",
            amount=1500.0,
            advance_date=date(2026, 10, 22),
            notes="રોકડ ઉપાડ (Cash advance)"
        )
        session.add(adv_t2)
        session.commit()

        print("[Seed Engine] Seeding complete! 2 Multi-Tenant Factories (EMB-1001 & EMB-1002) with 100% data isolation created successfully.")


if __name__ == "__main__":
    seed_database()
