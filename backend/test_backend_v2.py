import sys
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_v2_system():
    print("\n--- 1. Testing Health Endpoint ---")
    resp = client.get("/api/health")
    assert resp.status_code == 200, f"Health check failed: {resp.text}"
    health_data = resp.json()
    print("Health Status:", health_data)
    assert health_data["version"] == "2.0.0"

    print("\n--- 2. Testing Dashboard Summary (v2.0 KPIs) ---")
    resp = client.get("/api/dashboard/summary")
    assert resp.status_code == 200, f"Dashboard summary failed: {resp.text}"
    dashboard = resp.json()
    print("Dashboard KPIs:", dashboard)
    assert dashboard["total_pending_pcs"] > 0
    assert dashboard["active_lots_count"] > 0
    assert "estimated_pending_billing_inr" in dashboard
    assert "low_shift_alerts_count" in dashboard

    print("\n--- 3. Testing Pending Lots Reconciliation (v2.0) ---")
    resp = client.get("/api/lots/pending")
    assert resp.status_code == 200, f"Pending lots failed: {resp.text}"
    pending_lots = resp.json()
    print(f"Retrieved {len(pending_lots)} pending lots.")
    first_lot = pending_lots[0]
    print(f"Lot {first_lot['challan_number']}: Total Inward={first_lot['total_inward']}, Fresh={first_lot['total_fresh_delivered']}, Raw Ret={first_lot['total_returned_raw']}, Kasar={first_lot['total_kasar']}, Fent={first_lot['total_fent']}, Pending={first_lot['pending_balance']}, Billable=₹{first_lot['billable_amount_inr']}")
    assert "factory_punch_number" in first_lot
    assert "agreed_rate" in first_lot

    print("\n--- 4. Testing Duplicate Challan Guard (409 Conflict) ---")
    # Attempt to re-create RC-1048 for Radhe Creation
    dup_payload = {
        "challan_type": "INWARD",
        "party_id": first_lot["party_id"],
        "challan_number": first_lot["challan_number"], # "RC-1048"
        "design_number": "D-1024",
        "total_quantity": 500.0,
        "unit": "PCS"
    }
    resp = client.post("/api/challans", json=dup_payload)
    print("Duplicate guard response code:", resp.status_code)
    assert resp.status_code == 409, f"Expected 409 Conflict, got {resp.status_code}: {resp.text}"
    print("Duplicate Guard caught duplicate successfully:", resp.json()["detail"])

    print("\n--- 5. Testing Tranche Dispatch with Returned Raw & Kasar ---")
    lot_id = first_lot["inward_challan_id"]
    dispatch_payload = {
        "outward_challan_number": "JW-TEST-99",
        "fresh_quantity": 100.0,
        "returned_raw_quantity": 20.0,
        "kasar_quantity": 10.0,
        "fent_quantity": 5.0,
        "notes": "ટેસ્ટ જાવક લોટ"
    }
    resp = client.post(f"/api/lots/{lot_id}/dispatch", json=dispatch_payload)
    assert resp.status_code == 200, f"Dispatch failed: {resp.text}"
    dispatch_resp = resp.json()
    print("Dispatch recorded:", dispatch_resp["message"])
    print("New lot balance:", dispatch_resp["data"]["pending_balance"])
    print("WhatsApp message generated:", dispatch_resp["data"]["whatsapp_message"])

    print("\n--- 6. Testing Party Ledger & WhatsApp Udhari Link ---")
    party_id = first_lot["party_id"]
    resp = client.get(f"/api/ledger/{party_id}")
    assert resp.status_code == 200, f"Party ledger failed: {resp.text}"
    ledger = resp.json()
    print(f"Party: {ledger['party_name']}")
    print(f"Summary: Fresh={ledger['summary']['total_billable_fresh_qty']}, Raw Ret={ledger['summary']['total_returned_raw_qty']}, Kasar={ledger['summary']['total_kasar_qty']}, Billable ₹={ledger['summary']['total_billable_amount_inr']}")
    print(f"WhatsApp Udhari URL: {ledger['whatsapp_udhari_url'][:90]}...")
    assert "https://wa.me/" in ledger["whatsapp_udhari_url"]
    assert ledger["summary"]["total_billable_amount_inr"] > 0

    print("\n--- 7. Testing Stitch-to-Profit Calculator ---")
    quote_payload = {
        "stitch_count": 28000,
        "machine_heads": 20,
        "rpm": 650,
        "efficiency_pct": 80.0,
        "shift_cost": 2200.0,
        "material_type": "JARI_THREAD",
        "material_cost_per_piece": 8.50,
        "target_profit_margin_pct": 25.0
    }
    resp = client.post("/api/calculator/quote", json=quote_payload)
    assert resp.status_code == 200, f"Quote failed: {resp.text}"
    quote = resp.json()
    print(f"Break-Even Rate: ₹{quote['break_even_rate']}, Recommended Quote: ₹{quote['recommended_quote_rate']}")
    assert quote["recommended_quote_rate"] > quote["break_even_rate"]

    print("\n--- 8. Testing Machine Shift Log (Bonus & Low Alert) ---")
    shift_payload = {
        "machine_number": "M-03",
        "shift_type": "DAY",
        "operator_name": "Kanti Karigar",
        "start_stitch_counter": 1000000,
        "end_stitch_counter": 1450000, # 450,000 stitches (+50,000 excess!)
        "target_stitches": 400000,
        "rpm_average": 660,
        "downtime_minutes": 20
    }
    resp = client.post("/api/shifts/log", json=shift_payload)
    assert resp.status_code == 201, f"Shift log failed: {resp.text}"
    shift_data = resp.json()
    print(f"Shift Log: Total Stitches={shift_data['total_stitches']}, Efficiency={shift_data['efficiency_pct']}%, Bonus=₹{shift_data['bonus_earned_inr']}, Alert={shift_data['is_low_efficiency_alert']}")
    assert shift_data["bonus_earned_inr"] == 75.0 # (50,000 / 10,000) * 15.0 = 75.0
    assert shift_data["is_low_efficiency_alert"] is False

    print("\n--- 9. Testing AI Preset OCR (preset_radhe_inward.jpg) ---")
    with open("uploads/preset_radhe_inward.jpg", "wb") as f:
        f.write(b"dummy image bytes for preset test")
    
    with open("uploads/preset_radhe_inward.jpg", "rb") as f:
        resp = client.post(
            "/api/ai/parse-challan-image",
            files={"file": ("preset_radhe_inward.jpg", f, "image/jpeg")}
        )
    assert resp.status_code == 200, f"AI parse failed: {resp.text}"
    ocr_data = resp.json()["data"]
    print(f"AI OCR Parsed: Party={ocr_data['party_name']}, Challan={ocr_data['challan_number']}, Punch={ocr_data['factory_punch_number']}, Rate=₹{ocr_data['agreed_rate']}")
    assert ocr_data["factory_punch_number"] == "SK-45"
    assert ocr_data["agreed_rate"] == 42.0

    print("\n--- 10. Testing Gujarati Natural Language Intent Parser ---")
    resp = client.post("/api/ai/process-message", json={"message": "રાધે ક્રિએશનનો બાકી માલ કેટલો છે?"})
    assert resp.status_code == 200
    ai_msg = resp.json()
    print(f"Intent: {ai_msg['intent']}, Gujarati Reply: {ai_msg['reply_gujarati']}")
    assert ai_msg["intent"] == "PENDING_QUERY"

    print("\n=======================================================")
    print("ALL 10 TEST SUITES PASSED FLAWLESSLY FOR BACKEND v2.0!")
    print("=======================================================\n")

if __name__ == "__main__":
    test_v2_system()
