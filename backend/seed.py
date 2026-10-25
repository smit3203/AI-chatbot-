import os
from pathlib import Path
from datetime import date, datetime, timezone
from uuid import uuid4
from sqlmodel import Session, select
from database import engine, init_db
from models import (
    Party, Challan, ChallanType, UnitType, LotDelivery,
    MachineShift, ShiftType, RateQuote, MaterialType, KarigarAdvance
)

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
  <text x="55" y="235" font-family="sans-serif" font-size="12" font-weight="bold" fill="#1e293b">Job-Worker: <tspan fill="#047857">Shree Hari Embroidery</tspan></text>
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
    <text x="50" y="42" font-family="sans-serif" font-size="10" font-weight="bold" fill="#059669" text-anchor="middle">DISPATCH PASS</text>
    <text x="50" y="58" font-family="'Noto Sans Gujarati', sans-serif" font-size="11" font-weight="bold" fill="#059669" text-anchor="middle">મારુતિ - સુરત</text>
    <text x="50" y="72" font-family="sans-serif" font-size="9" font-weight="bold" fill="#059669" text-anchor="middle">APPROVED</text>
  </g>
  <line x1="60" y1="720" x2="200" y2="720" stroke="#64748b" stroke-width="1"/>
  <text x="130" y="738" font-family="'Noto Sans Gujarati', sans-serif" font-size="11" fill="#475569" text-anchor="middle">ડિસ્પેચ માસ્ટર સહી</text>
  <line x1="400" y1="720" x2="540" y2="720" stroke="#64748b" stroke-width="1"/>
  <text x="470" y="738" font-family="'Noto Sans Gujarati', sans-serif" font-size="11" fill="#475569" text-anchor="middle">ટેમ્પો ડ્રાઈવર સહી</text>
</svg>"""

SVG_OUTWARD_JW_405 = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="100%" height="100%">
  <rect width="600" height="800" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  <rect x="20" y="20" width="560" height="760" fill="none" stroke="#4f46e5" stroke-width="2"/>
  <text x="300" y="55" font-family="'Noto Sans Gujarati', sans-serif" font-size="14" font-weight="bold" fill="#4338ca" text-anchor="middle">|| શ્રી હરિ એમ્બ્રોઇડરી જોબ-વર્ક ||</text>
  <text x="300" y="90" font-family="'Noto Sans Gujarati', sans-serif" font-size="24" font-weight="900" fill="#0f172a" text-anchor="middle">જાવક ડિલિવરી ચલણ (DISPATCH SLIP)</text>
  <text x="300" y="112" font-family="sans-serif" font-size="11" fill="#475569" text-anchor="middle">Plot 42, GIDC Sachin, Surat | GSTIN: 24AAACS1234D1Z8</text>
  <line x1="40" y1="125" x2="560" y2="125" stroke="#e0e7ff" stroke-width="2"/>
  <rect x="40" y="145" width="520" height="70" rx="8" fill="#f8fafc" stroke="#e2e8f0"/>
  <text x="55" y="170" font-family="sans-serif" font-size="12" font-weight="bold" fill="#1e293b">Outward Slip No: <tspan fill="#4f46e5" font-weight="900">JW-405</tspan></text>
  <text x="55" y="200" font-family="sans-serif" font-size="12" font-weight="bold" fill="#1e293b">Party: <tspan fill="#0284c7">Radhe Creation (સુરત)</tspan></text>
  <text x="380" y="170" font-family="sans-serif" font-size="12" font-weight="bold" fill="#1e293b">Date: <tspan fill="#475569">24/10/2026</tspan></text>
  <text x="380" y="200" font-family="sans-serif" font-size="12" font-weight="bold" fill="#1e293b">Inward Lot: <tspan fill="#475569">RC-1048</tspan></text>
  <rect x="40" y="235" width="520" height="32" fill="#312e81" rx="4"/>
  <text x="60" y="256" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff">ITEM BREAKDOWN</text>
  <text x="240" y="256" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff">DESIGN / PUNCH</text>
  <text x="400" y="256" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff">RATE</text>
  <text x="500" y="256" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff">QUANTITY</text>
  <rect x="40" y="270" width="520" height="150" fill="#ffffff" stroke="#cbd5e1" stroke-width="0.5"/>
  <text x="60" y="295" font-family="sans-serif" font-size="12" font-weight="bold" fill="#047857">Fresh Delivered (તૈયાર)</text>
  <text x="240" y="295" font-family="sans-serif" font-size="12" fill="#1e293b">D-1024 / SK-45</text>
  <text x="400" y="295" font-family="sans-serif" font-size="12" font-weight="bold" fill="#047857">₹42.00 / Pc</text>
  <text x="500" y="295" font-family="sans-serif" font-size="13" font-weight="900" fill="#047857">400 PCS</text>
  <line x1="45" y1="310" x2="555" y2="310" stroke="#f1f5f9"/>
  <text x="60" y="332" font-family="sans-serif" font-size="12" font-weight="bold" fill="#0284c7">Returned Raw (કાચો પરત)</text>
  <text x="240" y="332" font-family="sans-serif" font-size="12" fill="#1e293b">Unembroidered Georgette</text>
  <text x="400" y="332" font-family="sans-serif" font-size="12" fill="#64748b">₹0.00 (Unbilled)</text>
  <text x="500" y="332" font-family="sans-serif" font-size="13" font-weight="900" fill="#0284c7">50 PCS</text>
  <line x1="45" y1="347" x2="555" y2="347" stroke="#f1f5f9"/>
  <text x="60" y="369" font-family="sans-serif" font-size="12" font-weight="bold" fill="#e11d48">Kasar Shortage (કાસર)</text>
  <text x="240" y="369" font-family="sans-serif" font-size="12" fill="#1e293b">Accepted party deduction</text>
  <text x="400" y="369" font-family="sans-serif" font-size="12" fill="#64748b">-</text>
  <text x="500" y="369" font-family="sans-serif" font-size="13" font-weight="bold" fill="#e11d48">20 PCS</text>
  <line x1="45" y1="384" x2="555" y2="384" stroke="#f1f5f9"/>
  <text x="60" y="406" font-family="sans-serif" font-size="12" font-weight="bold" fill="#d97706">Fent Remnants (ફેંટ)</text>
  <text x="240" y="406" font-family="sans-serif" font-size="12" fill="#1e293b">Cut fabric pieces</text>
  <text x="400" y="406" font-family="sans-serif" font-size="12" fill="#64748b">-</text>
  <text x="500" y="406" font-family="sans-serif" font-size="13" font-weight="bold" fill="#d97706">10 PCS</text>
  <rect x="40" y="435" width="520" height="40" fill="#eef2ff" stroke="#c7d2fe"/>
  <text x="60" y="460" font-family="sans-serif" font-size="12" font-weight="bold" fill="#312e81">TOTAL OUTWARD: 480 PCS</text>
  <text x="340" y="460" font-family="sans-serif" font-size="12" font-weight="bold" fill="#4338ca">NET BILLABLE: ₹16,800.00</text>
  <line x1="60" y1="720" x2="200" y2="720" stroke="#64748b" stroke-width="1"/>
  <text x="130" y="738" font-family="'Noto Sans Gujarati', sans-serif" font-size="11" fill="#475569" text-anchor="middle">માલ આપનાર (શ્રી હરિ)</text>
  <line x1="400" y1="720" x2="540" y2="720" stroke="#64748b" stroke-width="1"/>
  <text x="470" y="738" font-family="'Noto Sans Gujarati', sans-serif" font-size="11" fill="#475569" text-anchor="middle">માલ સ્વીકારનાર સહી</text>
</svg>"""

SVG_DAHAO_LCD = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="100%" height="100%">
  <!-- Machine Bezel -->
  <rect width="600" height="450" rx="16" fill="#1e293b" stroke="#334155" stroke-width="4"/>
  <text x="300" y="32" font-family="monospace" font-size="15" font-weight="bold" fill="#94a3b8" text-anchor="middle">DAHAO 328 COMPUTERIZED EMBROIDERY SYSTEM</text>
  <!-- LCD Screen Inner -->
  <rect x="25" y="45" width="550" height="380" rx="8" fill="#090d16" stroke="#0ea5e9" stroke-width="2"/>
  <!-- Status Bar -->
  <rect x="35" y="55" width="530" height="35" rx="4" fill="#0f172a"/>
  <circle cx="55" cy="72" r="6" fill="#10b981"/>
  <text x="70" y="76" font-family="monospace" font-size="13" font-weight="bold" fill="#38bdf8">MC: M-01</text>
  <text x="170" y="76" font-family="monospace" font-size="13" fill="#cbd5e1">HEADS: 20</text>
  <text x="270" y="76" font-family="monospace" font-size="13" fill="#fbbf24">SPEED: 680 RPM</text>
  <text x="430" y="76" font-family="monospace" font-size="13" font-weight="bold" fill="#a7f3d0">DAY SHIFT</text>
  <!-- Counters Box -->
  <rect x="35" y="105" width="530" height="135" rx="6" fill="#020617" stroke="#1e293b"/>
  <text x="50" y="130" font-family="monospace" font-size="12" fill="#94a3b8">START STITCH COUNTER:</text>
  <text x="50" y="160" font-family="monospace" font-size="26" font-weight="900" fill="#64748b">14,200,000</text>
  <text x="300" y="130" font-family="monospace" font-size="12" fill="#38bdf8">END STITCH COUNTER (LIVE):</text>
  <text x="300" y="160" font-family="monospace" font-size="28" font-weight="900" fill="#38bdf8">14,645,000</text>
  <line x1="50" y1="180" x2="550" y2="180" stroke="#1e293b"/>
  <text x="50" y="215" font-family="monospace" font-size="14" font-weight="bold" fill="#cbd5e1">SHIFT PRODUCTION:</text>
  <text x="230" y="222" font-family="monospace" font-size="34" font-weight="900" fill="#10b981">445,000</text>
  <text x="410" y="215" font-family="monospace" font-size="14" fill="#a7f3d0">STITCHES</text>
  <!-- Operator & Efficiency Bar -->
  <rect x="35" y="255" width="530" height="90" rx="6" fill="#0f172a" stroke="#1e293b"/>
  <text x="50" y="280" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff">OPERATOR: <tspan fill="#fbbf24">Ramesh Karigar</tspan></text>
  <text x="320" y="280" font-family="monospace" font-size="13" font-weight="bold" fill="#10b981">EFFICIENCY: 111.25%</text>
  <text x="50" y="315" font-family="monospace" font-size="12" fill="#94a3b8">SHIFT TARGET: 400,000</text>
  <rect x="220" y="302" width="160" height="18" rx="4" fill="#065f46"/>
  <text x="300" y="315" font-family="sans-serif" font-size="11" font-weight="bold" fill="#6ee7b7" text-anchor="middle">STITCH BONUS: +₹67.50</text>
  <text x="410" y="315" font-family="monospace" font-size="12" fill="#cbd5e1">DOWNTIME: 25 MIN</text>
  <!-- Buttons Row -->
  <rect x="35" y="360" width="115" height="45" rx="6" fill="#0369a1"/>
  <text x="92" y="387" font-family="monospace" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">F1: RESET</text>
  <rect x="170" y="360" width="115" height="45" rx="6" fill="#15803d"/>
  <text x="227" y="387" font-family="monospace" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">F2: SAVE</text>
  <rect x="305" y="360" width="115" height="45" rx="6" fill="#b45309"/>
  <text x="362" y="387" font-family="monospace" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">F3: SPEED</text>
  <rect x="440" y="360" width="125" height="45" rx="6" fill="#334155"/>
  <text x="502" y="387" font-family="monospace" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">ESC: MENU</text>
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
        # Save in backend/uploads
        b_path = backend_upload_dir / filename
        b_path.write_text(content, encoding="utf-8")
        # Save in frontend/public/uploads so Next.js static images load directly
        f_path = frontend_public_upload_dir / filename
        f_path.write_text(content, encoding="utf-8")

    print("[Seed Engine] 4 crisp SVG slip & LCD previews successfully generated in /uploads")


def seed_database():
    """Seeds realistic Gujarat embroidery job-work test data."""
    init_db()
    ensure_demo_images()

    with Session(engine) as session:
        # Check if already seeded
        existing_parties = session.exec(select(Party)).first()
        if existing_parties:
            print("[Seed Info] Database already contains records. Clearing and reseeding fresh data...")
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
            session.commit()

        print("[Seed Engine] Seeding Gujarat EmbroideryOS v2.0 master dataset...")

        # 1. PARTIES
        party_radhe = Party(
            name="Radhe Creation (સુરત)",
            phone="+91 98250 12345",
            city="Surat"
        )
        party_maruti = Party(
            name="Maruti Embroidery (અમદાવાદ)",
            phone="+91 98980 67890",
            city="Ahmedabad"
        )
        party_shivam = Party(
            name="Shivam Textiles (જેતપુર)",
            phone="+91 97123 45678",
            city="Jetpur"
        )
        party_khodiyar = Party(
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

        # 2. INWARD CHALLANS (LOTS)
        inward_radhe = Challan(
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

        # Maruti Inward challan number is ME-101 (keeping ME-802 strictly for outward preset!)
        inward_maruti = Challan(
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

        # 3. OUTWARD CHALLANS & TRANCHE LOT DELIVERIES
        # Batch 1 for Radhe: 400 Fresh + 50 Returned Raw + 20 Kasar + 10 Fent
        outward_radhe_1 = Challan(
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
            inward_challan_id=inward_radhe.id,
            outward_challan_id=outward_radhe_1.id,
            fresh_quantity=400.0,
            returned_raw_quantity=50.0,
            kasar_quantity=20.0,
            fent_quantity=10.0,
            dispatch_date=date(2026, 10, 24)
        )

        # Batch 1 for Maruti: 200 Fresh + 10 Kasar (leaving 590 pending so ME-802 outward with 480 passes cleanly)
        outward_maruti_1 = Challan(
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
            inward_challan_id=inward_maruti.id,
            outward_challan_id=outward_maruti_1.id,
            fresh_quantity=200.0,
            returned_raw_quantity=0.0,
            kasar_quantity=10.0,
            fent_quantity=0.0,
            dispatch_date=date(2026, 10, 23)
        )

        # Batch 1 for Shivam: 1500 Fresh Mtr + 50 Kasar + 30 Fent
        outward_shivam_1 = Challan(
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

        # 4. MACHINE SHIFTS (DAHAO 328 COUNTERS)
        shift_1 = MachineShift(
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

        # 5. RATE QUOTES
        quote_1 = RateQuote(
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

        # 6. KARIGAR ADVANCES (ઉપાડ)
        adv_1 = KarigarAdvance(
            karigar_name="Ramesh Karigar",
            amount=2000.0,
            advance_date=date(2026, 10, 18),
            notes="રવિવાર રોકડ ઉપાડ (Sunday Cash)"
        )
        adv_2 = KarigarAdvance(
            karigar_name="Ramesh Karigar",
            amount=2500.0,
            advance_date=date(2026, 10, 22),
            notes="ઘર ખર્ચ ઉપાડ (Household expense)"
        )
        adv_3 = KarigarAdvance(
            karigar_name="Maheshbhai",
            amount=3000.0,
            advance_date=date(2026, 10, 20),
            notes="તહેવાર ઉપાડ (Festival Advance)"
        )
        adv_4 = KarigarAdvance(
            karigar_name="Udinbhai",
            amount=3500.0,
            advance_date=date(2026, 10, 15),
            notes="દવા ખર્ચ (Medical expense)"
        )
        adv_5 = KarigarAdvance(
            karigar_name="Udinbhai",
            amount=2000.0,
            advance_date=date(2026, 10, 24),
            notes="રોકડ ઉપાડ (Cash advance)"
        )
        adv_6 = KarigarAdvance(
            karigar_name="Bhaveshbhai",
            amount=2000.0,
            advance_date=date(2026, 10, 21),
            notes="રોકડ ઉપાડ (Cash advance)"
        )
        session.add_all([adv_1, adv_2, adv_3, adv_4, adv_5, adv_6])
        session.commit()

        print("[Seed Engine] Seeding complete! 4 Parties, 4 Inward Lots, 3 Outward Dispatches, 4 Machine Shifts, 6 Karigar Advances created.")

if __name__ == "__main__":
    seed_database()
