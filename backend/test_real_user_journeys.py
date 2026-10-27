"""
ChallanAI (EmbroideryOS) v3.1 - End-to-End Real User Simulation Test Suite
========================================================================
Comprehensive multi-tenant SaaS and 3-Role RBAC verification test suite.

Simulates 5 genuine real-world Gujarat embroidery factory personas:
- Persona 1: New SaaS Factory Owner Registration & Isolation (EMB-1003 Jetpur)
- Persona 2: Floor Supervisor (MASTER Role) OCR, Challan & Overdelivery Guard
- Persona 3: Machine Operator (KARIGAR Role) LCD Stitch Counter & Bonus Engine
- Persona 4: Factory Owner (OWNER Role) Costing, Party Ledger, WhatsApp & Tally
- Persona 5: Cross-Tenant Security & Zero-Leakage Data Isolation Attempt
"""

import sys
import io
import os
import re
from datetime import date
from typing import Dict, Any

from fastapi.testclient import TestClient
from sqlmodel import Session, select

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from main import app
from database import engine
from models import Factory, User, UserRole, Party, Challan, ChallanType
from seed import seed_database

client = TestClient(app)

# ANSI Color formatting for terminal output
GREEN = "\033[92m"
BLUE = "\033[94m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"


def print_step(title: str):
    print(f"\n{BOLD}{CYAN}----------------------------------------------------------------------{RESET}")
    print(f"{BOLD}{CYAN}>>> {title}{RESET}")
    print(f"{BOLD}{CYAN}----------------------------------------------------------------------{RESET}")


def print_success(message: str):
    print(f"  {GREEN}[PASS]{RESET} {message}")


def run_persona_1_new_factory_owner_registration() -> Dict[str, Any]:
    print_step("PERSONA 1: New SaaS Factory Owner Registration & Isolation (EMB-1003 Jetpur)")
    
    # 1. Register new factory owner (Hareshbhai from Jetpur)
    reg_payload = {
        "factory_name": "Khodiyar Multi-Head Works (Jetpur)",
        "owner_name": "Hareshbhai",
        "phone": "9876543210",
        "password": "Password@123",
        "city": "Jetpur",
        "address": "Plot 88, Jetpur GIDC Industrial Area, Rajkot Highway",
        "gstin": "24ABCDE1234F1Z9",
        "bank_name": "State Bank of India (Jetpur Branch)",
        "bank_account_no": "30192847561",
        "bank_ifsc": "SBIN0001234",
        "upi_id": "khodiyar.jetpur@oksbi",
        "seed_starter_lot": False,
        "seed_sample_data": False
    }

    res = client.post("/api/auth/register", json=reg_payload)
    assert res.status_code in [200, 201], f"Expected 200/201, got {res.status_code}: {res.text}"
    reg_data = res.json()

    token_1003 = reg_data["token"]
    factory_code = reg_data["factory"]["factory_code"]
    factory_id = reg_data["factory"]["id"]
    user_role = reg_data["user"]["role"]

    assert factory_code.startswith("EMB-"), f"Unexpected factory code: {factory_code}"
    assert user_role == "OWNER", f"Expected OWNER role, got {user_role}"
    print_success(f"Registered new tenant: {reg_data['factory']['factory_name']} ({factory_code}) with role {user_role}")

    # 2. Verify 100% tenant isolation (Zero lots initially)
    headers_1003 = {"Authorization": f"Bearer {token_1003}"}
    
    dash_res = client.get("/api/dashboard/summary", headers=headers_1003)
    assert dash_res.status_code == 200, f"Dashboard summary failed: {dash_res.text}"
    dash_data = dash_res.json()
    assert dash_data["active_lots_count"] == 0, f"Expected 0 active lots, got {dash_data['active_lots_count']}"
    assert dash_data["total_pending_pcs"] == 0.0, f"Expected 0.0 pending pcs, got {dash_data['total_pending_pcs']}"
    print_success(f"Tenant isolation verified: active_lots={dash_data['active_lots_count']}, pending_pcs={dash_data['total_pending_pcs']} (0% leak from EMB-1001)")

    lots_res = client.get("/api/lots/pending", headers=headers_1003)
    assert lots_res.status_code == 200, f"Pending lots failed: {lots_res.text}"
    assert len(lots_res.json()) == 0, f"Expected 0 pending lots, got {len(lots_res.json())}"
    print_success("Pending lots list strictly isolated (empty for new factory)")

    # 3. Create MASTER and KARIGAR staff accounts under EMB-1003
    staff_master_res = client.post("/api/auth/staff", headers=headers_1003, json={
        "full_name": "Vinubhai Master (Floor Head)",
        "login_id": "vinubhai",
        "password": "Password@123",
        "role": "MASTER"
    })
    assert staff_master_res.status_code == 201, f"Failed to create Master staff: {staff_master_res.text}"
    master_user = staff_master_res.json()
    assert master_user["role"] == "MASTER"
    print_success(f"Owner created Master staff account: {master_user['full_name']} ({master_user['user_code']})")

    staff_karigar_res = client.post("/api/auth/staff", headers=headers_1003, json={
        "full_name": "Kanti Karigar (Lead Operator)",
        "login_id": "kantibhai",
        "password": "Password@123",
        "role": "KARIGAR"
    })
    assert staff_karigar_res.status_code == 201, f"Failed to create Karigar staff: {staff_karigar_res.text}"
    karigar_user = staff_karigar_res.json()
    assert karigar_user["role"] == "KARIGAR"
    print_success(f"Owner created Karigar staff account: {karigar_user['full_name']} ({karigar_user['user_code']})")

    # 4. List staff and confirm all 3 roles exist under EMB-1003
    staff_list_res = client.get("/api/auth/staff", headers=headers_1003)
    assert staff_list_res.status_code == 200
    staff_list = staff_list_res.json()
    assert len(staff_list) == 3, f"Expected 3 staff accounts, got {len(staff_list)}"
    roles_present = set(u["role"] for u in staff_list)
    assert roles_present == {"OWNER", "MASTER", "KARIGAR"}, f"Roles missing: {roles_present}"
    print_success(f"Staff listing verified: 3 accounts under {factory_code} with roles: {roles_present}")

    return {
        "token_1003": token_1003,
        "factory_code": factory_code,
        "factory_id": factory_id,
        "headers_1003": headers_1003
    }


def run_persona_2_master_floor_supervisor(context_1003: Dict[str, Any]):
    print_step("PERSONA 2: Floor Supervisor (MASTER Role) Full Floor Workflow")

    # 1. Log in as MASTER
    login_res = client.post("/api/auth/login", json={
        "login_id": "master",
        "password": "123456"
    })
    assert login_res.status_code == 200, f"Master login failed: {login_res.text}"
    login_data = login_res.json()
    assert login_data["user"]["role"] == "MASTER", f"Expected MASTER role, got {login_data['user']['role']}"
    token_master = login_data["token"]
    headers_master = {"Authorization": f"Bearer {token_master}"}
    print_success(f"Logged in as MASTER: {login_data['user']['full_name']} ({login_data['factory']['factory_name']})")

    # 2. Inward Challan OCR endpoint test
    fake_img_bytes = b"RIFF....WEBPVP8 ... fake challan image bytes"
    ocr_res = client.post(
        "/api/ai/parse-challan-image",
        files={"file": ("preset_radhe_inward.jpg", fake_img_bytes, "image/jpeg")}
    )
    assert ocr_res.status_code == 200, f"AI OCR failed: {ocr_res.text}"
    ocr_json = ocr_res.json()
    assert ocr_json["success"] is True
    assert ocr_json["data"]["challan_number"] == "RC-1048"
    assert ocr_json["data"]["quantity"] == 1200.0
    print_success(f"AI OCR parsed preset slip successfully: {ocr_json['data']['party_name']}, Challan #{ocr_json['data']['challan_number']}, Qty: {ocr_json['data']['quantity']}")

    # 3. Create Inward Lot (1,200 PCS)
    inward_payload = {
        "party_name": "Balaji Fashion (સુરત)",
        "challan_number": "BF-2048",
        "challan_type": "INWARD",
        "challan_date": str(date.today()),
        "design_number": "D-1024",
        "factory_punch_number": "SK-45",
        "agreed_rate": 42.0,
        "stitches_per_piece": 28000,
        "fabric_type": "Fox Georgette",
        "total_quantity": 1200.0,
        "unit": "PCS",
        "notes": "૧૨૦૦ પીસ ગળા-દામન વર્ક ઇનવર્ડ"
    }

    create_res = client.post("/api/challans", headers=headers_master, json=inward_payload)
    assert create_res.status_code == 201, f"Failed to create Inward Challan: {create_res.text}"
    created_inward = create_res.json()
    inward_id = created_inward["id"]
    party_id = created_inward["party_id"]
    print_success(f"Created Inward Lot: Challan #{created_inward['challan_number']} ({created_inward['total_quantity']} PCS @ Rs. {created_inward['agreed_rate']})")

    # 4. Duplicate Challan Guard (409 Conflict)
    dup_res = client.post("/api/challans", headers=headers_master, json=inward_payload)
    assert dup_res.status_code == 409, f"Expected 409 Conflict for duplicate challan, got {dup_res.status_code}: {dup_res.text}"
    print_success("Duplicate Challan Guard successfully triggered (HTTP 409 Conflict blocked duplicate slip)")

    # 5. Partial Outward Dispatch (Fresh: 400, Returned Raw: 50, Kasar: 20, Fent: 10)
    dispatch_payload = {
        "outward_challan_number": "JW-901",
        "fresh_quantity": 400.0,
        "returned_raw_quantity": 50.0,
        "kasar_quantity": 20.0,
        "fent_quantity": 10.0,
        "dispatch_date": str(date.today()),
        "notes": "૪૦૦ પીસ ફ્રેશ, ૫૦ પીસ કાચો પરત (અનબિલ્ડ), ૨૦ પીસ કાસર, ૧૦ પીસ ફેંટ"
    }

    dispatch_res = client.post(f"/api/lots/{inward_id}/dispatch", headers=headers_master, json=dispatch_payload)
    assert dispatch_res.status_code == 200, f"Partial dispatch failed: {dispatch_res.text}"
    dispatch_data = dispatch_res.json()["data"]

    # Verify reconciliation math: 1200 - (400 + 50 + 20 + 10) = 720.0 pending balance
    assert dispatch_data["pending_balance"] == 720.0, f"Expected 720.0 pending balance, got {dispatch_data['pending_balance']}"
    # Verify commercial billing: ONLY 400 fresh pcs billed @ 42.0 = 16,800.0 (returned raw billed at 0)
    assert dispatch_data["billable_amount_inr"] == 16800.0, f"Expected 16,800.0 INR billable, got {dispatch_data['billable_amount_inr']}"
    print_success(f"Partial Outward Dispatch verified: Fresh=400, Raw=50, Kasar=20, Fent=10 | Balance: {dispatch_data['pending_balance']} PCS | Billable: Rs. {dispatch_data['billable_amount_inr']:,.2f}")

    # 6. Overdelivery Guard (400 Bad Request)
    # Attempting to dispatch 800 fresh against 720 remaining balance (800 + 480 = 1280 > 1200 * 1.02 = 1224)
    over_res = client.post(f"/api/lots/{inward_id}/dispatch", headers=headers_master, json={
        "outward_challan_number": "JW-902",
        "fresh_quantity": 800.0,
        "returned_raw_quantity": 0.0,
        "kasar_quantity": 0.0,
        "fent_quantity": 0.0
    })
    assert over_res.status_code == 400, f"Expected 400 Bad Request for overdelivery, got {over_res.status_code}: {over_res.text}"
    print_success("Overdelivery Guard successfully triggered (HTTP 400 Bad Request prevented delivery exceeding 102% tolerance)")


def run_persona_3_karigar_operator():
    print_step("PERSONA 3: Machine Operator (KARIGAR Role) Shift LCD & Bonus Workflow")

    # 1. Log in as KARIGAR
    login_res = client.post("/api/auth/login", json={
        "login_id": "karigar",
        "password": "123456"
    })
    assert login_res.status_code == 200, f"Karigar login failed: {login_res.text}"
    login_data = login_res.json()
    assert login_data["user"]["role"] == "KARIGAR", f"Expected KARIGAR role, got {login_data['user']['role']}"
    token_karigar = login_data["token"]
    headers_karigar = {"Authorization": f"Bearer {token_karigar}"}
    print_success(f"Logged in as KARIGAR: {login_data['user']['full_name']} (Role: {login_data['user']['role']})")

    # 2. High-Efficiency Shift Log
    high_shift_payload = {
        "machine_number": "M-01",
        "shift_type": "DAY",
        "operator_name": "Ramesh Karigar",
        "start_stitch_counter": 14200000,
        "end_stitch_counter": 14645000,
        "target_stitches": 400000,
        "downtime_minutes": 25,
        "notes": "સુપર પ્રોડક્શન શિફ્ટ - ૪.૪૫ લાખ સ્ટીચ"
    }

    high_res = client.post("/api/shifts/log", headers=headers_karigar, json=high_shift_payload)
    assert high_res.status_code == 201, f"Failed to log high shift: {high_res.text}"
    high_data = high_res.json()

    assert high_data["total_stitches"] == 445000, f"Expected 445,000 stitches, got {high_data['total_stitches']}"
    assert high_data["efficiency_pct"] == 111.25, f"Expected 111.25% efficiency, got {high_data['efficiency_pct']}"
    assert high_data["bonus_earned_inr"] == 67.50, f"Expected Rs. 67.50 bonus, got {high_data['bonus_earned_inr']}"
    assert high_data["is_low_efficiency_alert"] is False, "Expected False for low efficiency alert"
    print_success(f"High-Efficiency Shift verified: Stitches={high_data['total_stitches']} | Efficiency={high_data['efficiency_pct']}% | Bonus=+Rs. {high_data['bonus_earned_inr']} | Alert={high_data['is_low_efficiency_alert']}")

    # 3. Low-Efficiency Night Shift Alert
    low_shift_payload = {
        "machine_number": "M-01",
        "shift_type": "NIGHT",
        "operator_name": "Ramesh Karigar",
        "start_stitch_counter": 14645000,
        "end_stitch_counter": 14895000, # 250,000 stitches
        "target_stitches": 400000,
        "downtime_minutes": 110,
        "notes": "રાત્રે લાઇટ ગઈ અને દોરો તૂટવાની તકલીફ હતી"
    }

    low_res = client.post("/api/shifts/log", headers=headers_karigar, json=low_shift_payload)
    assert low_res.status_code == 201, f"Failed to log low shift: {low_res.text}"
    low_data = low_res.json()

    assert low_data["total_stitches"] == 250000, f"Expected 250,000 stitches, got {low_data['total_stitches']}"
    assert low_data["efficiency_pct"] == 62.5, f"Expected 62.5% efficiency, got {low_data['efficiency_pct']}"
    assert low_data["bonus_earned_inr"] == 0.0, f"Expected Rs. 0.0 bonus, got {low_data['bonus_earned_inr']}"
    assert low_data["is_low_efficiency_alert"] is True, "Expected True for low efficiency alert"
    print_success(f"Low-Efficiency Shift verified: Stitches={low_data['total_stitches']} | Efficiency={low_data['efficiency_pct']}% | Downtime={low_data['downtime_minutes']}m | Alert={low_data['is_low_efficiency_alert']}")


def run_persona_4_factory_owner():
    print_step("PERSONA 4: Factory Owner (OWNER Role) Costing, Ledger, WhatsApp & Tally")

    # 1. Log in as OWNER (EMB-1001)
    login_res = client.post("/api/auth/login", json={
        "login_id": "owner",
        "password": "123456"
    })
    assert login_res.status_code == 200, f"Owner login failed: {login_res.text}"
    login_data = login_res.json()
    assert login_data["user"]["role"] == "OWNER", f"Expected OWNER role, got {login_data['user']['role']}"
    token_owner = login_data["token"]
    headers_owner = {"Authorization": f"Bearer {token_owner}"}
    print_success(f"Logged in as OWNER: {login_data['user']['full_name']} ({login_data['factory']['factory_name']})")

    # 2. Stitch-to-Profit Costing Calculator
    quote_payload = {
        "stitch_count": 28000,
        "machine_heads": 20,
        "rpm": 650,
        "efficiency_pct": 80.0,
        "shift_cost": 2200.0,
        "material_cost_per_piece": 8.50,
        "target_profit_margin_pct": 25.0
    }

    quote_res = client.post("/api/calculator/quote", json=quote_payload)
    assert quote_res.status_code == 200, f"Quote calculator failed: {quote_res.text}"
    quote_data = quote_res.json()

    assert abs(quote_data["break_even_rate"] - 16.73) < 0.05, f"Expected ~16.73 break even, got {quote_data['break_even_rate']}"
    assert abs(quote_data["recommended_quote_rate"] - 20.91) < 0.05, f"Expected ~20.91 recommended quote, got {quote_data['recommended_quote_rate']}"
    print_success(f"Costing formula verified: Break-Even=Rs. {quote_data['break_even_rate']}/pc | Quote Quote=Rs. {quote_data['recommended_quote_rate']}/pc (25% margin)")

    # 3. Party Ledger & WhatsApp Udhari Link
    parties_res = client.get("/api/parties", headers=headers_owner)
    assert parties_res.status_code == 200
    parties = parties_res.json()
    radhe_party = next((p for p in parties if "Radhe" in p["name"]), parties[0])
    party_id = radhe_party["id"]

    ledger_res = client.get(f"/api/ledger/{party_id}", headers=headers_owner)
    assert ledger_res.status_code == 200, f"Ledger fetch failed: {ledger_res.text}"
    ledger_data = ledger_res.json()
    summary = ledger_data["summary"]

    assert summary["total_billable_fresh_qty"] == 400.0, f"Expected 400.0 fresh qty, got {summary['total_billable_fresh_qty']}"
    assert summary["total_returned_raw_qty"] == 50.0, f"Expected 50.0 returned raw qty, got {summary['total_returned_raw_qty']}"
    assert summary["total_billable_amount_inr"] == 16800.0, f"Expected 16,800.0 INR, got {summary['total_billable_amount_inr']}"

    # Verify WhatsApp Udhari link format
    wa_url = ledger_data["whatsapp_udhari_url"]
    assert wa_url.startswith("https://wa.me/91"), f"Invalid WhatsApp URL prefix: {wa_url}"
    base_part = wa_url.split("?text=")[0]
    assert " " not in base_part and "+" not in base_part, f"Unsanitized phone in WhatsApp URL: {base_part}"

    # Verify factory profile in ledger
    prof = ledger_data["factory_profile"]
    assert prof["gstin"] == "24AAACS1234E1Z5", f"Unexpected GSTIN: {prof['gstin']}"
    assert prof["bank_name"] == "HDFC Bank (Varachha Branch)", f"Unexpected Bank: {prof['bank_name']}"
    assert prof["upi_id"] == "shreekrishna.embroidery@okaxis", f"Unexpected UPI: {prof['upi_id']}"
    print_success(f"Party Ledger verified: Fresh={summary['total_billable_fresh_qty']}, Raw={summary['total_returned_raw_qty']}, Total=Rs. {summary['total_billable_amount_inr']:,.2f}")
    print_success(f"Sanitized WhatsApp Udhari Link: {base_part}")
    print_success(f"Dynamic Factory Branding in Ledger: GSTIN={prof['gstin']}, Bank={prof['bank_name']}, UPI={prof['upi_id']}")

    # 4. Tally Prime CSV Export
    tally_res = client.get(f"/api/ledger/{party_id}/export-tally", headers=headers_owner)
    assert tally_res.status_code == 200, f"Tally export failed: {tally_res.text}"
    assert "text/csv" in tally_res.headers.get("content-type", "")
    assert "Date,Voucher Type,Voucher No" in tally_res.text
    print_success(f"Tally Prime RFC 4180 CSV export generated ({len(tally_res.text)} bytes)")

    return {"emb_1001_party_id": party_id}


def run_persona_5_cross_tenant_isolation(emb_1001_party_id: str):
    print_step("PERSONA 5: Cross-Tenant Security & Zero-Leakage Data Isolation Attempt")

    # 1. Log in as EMB-1002 (Patel Twist & Embroidery Works, Ahmedabad)
    login_res = client.post("/api/auth/login", json={
        "login_id": "9898011111",
        "password": "123456"
    })
    assert login_res.status_code == 200, f"EMB-1002 login failed: {login_res.text}"
    login_data = login_res.json()
    assert login_data["factory"]["factory_code"] == "EMB-1002"
    token_1002 = login_data["token"]
    headers_1002 = {"Authorization": f"Bearer {token_1002}"}
    print_success(f"Logged in as Tenant #2: {login_data['factory']['factory_name']} ({login_data['factory']['factory_code']})")

    # 2. Malicious attempt by EMB-1002 to snoop EMB-1001's party ledger
    snoop_res = client.get(f"/api/ledger/{emb_1001_party_id}", headers=headers_1002)
    assert snoop_res.status_code == 404, f"Cross-tenant leak detected! Expected 404, got {snoop_res.status_code}"
    print_success("Cross-Tenant Snooping Blocked! HTTP 404 Not Found returned when EMB-1002 accessed EMB-1001 ledger")

    # 3. Clean Re-seed of database to leave demo environment pristine
    print_step("TEARDOWN: Re-seeding Pristine Database State for Live UI Floor Demos")
    seed_database()
    print_success("Database reset to pristine multi-tenant seed state.")


def main():
    print(f"\n{BOLD}{GREEN}======================================================================{RESET}")
    print(f"{BOLD}{GREEN} ChallanAI (EmbroideryOS) v3.1 - End-to-End Real User Simulation Suite{RESET}")
    print(f"{BOLD}{GREEN}======================================================================{RESET}")

    # Ensure baseline database state
    seed_database()

    # Execute all 5 real-world personas
    p1_context = run_persona_1_new_factory_owner_registration()
    run_persona_2_master_floor_supervisor(p1_context)
    run_persona_3_karigar_operator()
    p4_context = run_persona_4_factory_owner()
    run_persona_5_cross_tenant_isolation(p4_context["emb_1001_party_id"])

    print(f"\n{BOLD}{GREEN}======================================================================{RESET}")
    print(f"{BOLD}{GREEN} ALL 5 REAL USER PERSONAS EXECUTED & PASSED WITH 100% SUCCESS!{RESET}")
    print(f"{BOLD}{GREEN}======================================================================{RESET}\n")


if __name__ == "__main__":
    main()
