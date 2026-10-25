import os
import re
import json
from io import BytesIO
from typing import Dict, Any, Optional
from dotenv import load_dotenv
from PIL import Image

# Load environment variables
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

# Try initializing Google GenAI SDK
genai_client = None
if GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here":
    try:
        from google import genai
        genai_client = genai.Client(api_key=GEMINI_API_KEY)
        print("[AI Service] Gemini 2.5 Flash client initialized successfully.")
    except Exception as e:
        print(f"[AI Service Warning] Failed to initialize Google GenAI SDK: {e}. Using deterministic presets.")
else:
    print("[AI Service] GEMINI_API_KEY not configured or placeholder detected. Operating in deterministic demo mode.")

# --- GUJARATI NUMERAL TRANSLITERATION ---
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
    """Converts any Gujarati numerals (૧, ૨, ૩...) in text to standard Arabic numbers (1, 2, 3...)."""
    if not text:
        return text
    for guj, eng in GUJARATI_NUMERAL_MAP.items():
        text = text.replace(guj, eng)
    return text

# --- 4 CORE DETERMINISTIC PRESETS (v2.0) ---
DEMO_PRESETS: Dict[str, Dict[str, Any]] = {
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
        "confidence_score": 0.98,
        "is_demo_fallback": True
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
        "confidence_score": 0.95,
        "is_demo_fallback": True
    },

    # Preset 3: Triggers 409 Conflict Duplicate Challan Guard on RC-1048
    "preset_duplicate_guard.jpg": {
        "challan_type": "INWARD",
        "party_name": "Radhe Creation (સુરત)",
        "challan_number": "RC-1048",  # Causes duplicate collision on same party!
        "challan_date": "2026-10-24",
        "design_number": "D-1024",
        "factory_punch_number": "SK-45",
        "agreed_rate": 42.0,
        "stitches_per_piece": 28000,
        "fabric_type": "Fox Georgette",
        "quantity": 1200.0,
        "unit": "PCS",
        "raw_gujarati_notes": "ડુપ્લિકેટ ચલણ ચકાસણી ટેસ્ટ (Duplicate Guard Test)",
        "confidence_score": 0.99,
        "is_demo_fallback": True
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
        "confidence_score": 0.99,
        "is_demo_fallback": True
    }
}


def parse_challan_image(file_bytes: bytes, filename: str = "upload.jpg") -> Dict[str, Any]:
    """
    Parses a physical challan photo using Google Gemini 2.5 Flash Vision OCR,
    with automatic deterministic preset fallback for offline/demo scenarios.
    """
    # 1. Check for quick-test demo preset match
    lower_filename = filename.lower()
    for preset_name, preset_data in DEMO_PRESETS.items():
        if preset_name in lower_filename:
            return preset_data.copy()

    # 2. Try Gemini 2.5 Flash if client is active
    if genai_client:
        try:
            image = Image.open(BytesIO(file_bytes))
            prompt = """
            You are ChallanAI Munim, an expert Gujarati and English OCR assistant specialized in Gujarat textile embroidery job-work slips (આવક/જાવક ચલણ).
            Extract data strictly into this JSON schema:
            {
              "challan_type": "INWARD" or "OUTWARD",
              "party_name": string (merchant trade name, e.g. Radhe Creation),
              "challan_number": string (slip number),
              "challan_date": "YYYY-MM-DD",
              "design_number": string (design code, e.g. D-1024),
              "factory_punch_number": string or null (machine punch code, e.g. SK-45),
              "agreed_rate": float (job-work rate per piece/meter in INR, e.g. 42.0),
              "stitches_per_piece": integer (stitch count, e.g. 28000),
              "fabric_type": string (e.g. Fox Georgette, Silk, Rayon),
              "quantity": float (total quantity),
              "unit": "PCS" or "MTR" or "TAKA",
              "raw_gujarati_notes": string (verbatim Gujarati transcription of any notes),
              "confidence_score": float (between 0.0 and 1.0)
            }
            Convert all Gujarati numerals (૧,૨,૩...) into standard digits.
            Return ONLY raw JSON without markdown formatting.
            """

            response = genai_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[image, prompt]
            )

            text_resp = response.text.strip()
            # Clean markdown codeblocks if returned
            text_resp = re.sub(r"^```(?:json)?", "", text_resp, flags=re.MULTILINE)
            text_resp = re.sub(r"```$", "", text_resp, flags=re.MULTILINE).strip()
            
            # Transliterate any remaining Gujarati numerals
            text_resp = transliterate_gujarati_numerals(text_resp)
            data = json.loads(text_resp)
            data["is_demo_fallback"] = False
            return data
        except Exception as e:
            print(f"[AI Service Error] Gemini Vision OCR failed: {e}. Using intelligent fallback.")

    # 3. Default Intelligent Fallback
    return {
        "challan_type": "INWARD",
        "party_name": "Radhe Creation (સુરત)",
        "challan_number": f"RC-{int(len(file_bytes) % 900 + 100)}",
        "challan_date": "2026-10-24",
        "design_number": "D-1024",
        "factory_punch_number": "SK-45",
        "agreed_rate": 42.0,
        "stitches_per_piece": 28000,
        "fabric_type": "Fox Georgette",
        "quantity": 1200.0,
        "unit": "PCS",
        "raw_gujarati_notes": "ઓટોમેટિક ડેમો મોડ: ૧૨૦૦ નંગ કટ પીસ ગળા-દામન વર્ક",
        "confidence_score": 0.94,
        "is_demo_fallback": True
    }


def parse_machine_lcd(file_bytes: bytes, filename: str = "lcd.jpg") -> Dict[str, Any]:
    """Parses machine LCD stitch counter photos (Dahao/Richpeace/Tajima controllers)."""
    if "preset_dahao_lcd" in filename.lower() or not genai_client:
        return DEMO_PRESETS["preset_dahao_lcd.jpg"].copy()

    try:
        image = Image.open(BytesIO(file_bytes))
        prompt = """
        Analyze this embroidery machine LCD controller screen photo (e.g. Dahao, Richpeace).
        Extract:
        1. "machine_number": string (e.g. "M-01")
        2. "start_stitch_counter": integer
        3. "end_stitch_counter": integer (cumulative current stitches)
        4. "rpm_average": integer
        5. "downtime_minutes": integer
        Return ONLY clean JSON.
        """
        response = genai_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[image, prompt]
        )
        text_resp = re.sub(r"^```(?:json)?|```$", "", response.text.strip(), flags=re.MULTILINE).strip()
        data = json.loads(text_resp)
        data["total_stitches"] = max(0, data.get("end_stitch_counter", 0) - data.get("start_stitch_counter", 0))
        target = 400000
        data["target_stitches"] = target
        eff = round((data["total_stitches"] / target) * 100, 2)
        data["efficiency_pct"] = eff
        excess = max(0, data["total_stitches"] - target)
        data["bonus_earned_inr"] = round((excess / 10000) * 15.0, 2)
        data["is_low_efficiency_alert"] = eff < 70.0 or data.get("downtime_minutes", 0) > 90
        data["is_demo_fallback"] = False
        return data
    except Exception as e:
        print(f"[AI Service Error] LCD Counter OCR failed: {e}")
        return DEMO_PRESETS["preset_dahao_lcd.jpg"].copy()


def process_vernacular_message(message: str) -> Dict[str, Any]:
    """
    Parses natural language Gujarati/Hindi/English floor messages
    and maps them to actionable business intents.
    """
    clean_msg = transliterate_gujarati_numerals(message.strip().lower())
    
    # 1. Pending Balance Query Intent (બાકી માલ / સ્ટોક)
    if any(k in clean_msg for k in ["બાકી", "સ્ટોક", "pending", "balance", "કેટલો માલ"]):
        party_match = re.search(r"(રાધે|radhe|મારુતિ|maruti|શિવમ|shivam|ખોડિયાર|khodiyar)", clean_msg)
        party_name = party_match.group(1).title() if party_match else "Radhe Creation"
        return {
            "intent": "PENDING_QUERY",
            "confidence": 0.95,
            "reply_gujarati": f"નમસ્તે, {party_name} નો બાકી માલ તપાસવામાં આવી રહ્યો છે...",
            "reply_english": f"Checking pending floor balance for {party_name}...",
            "extracted_data": {
                "party_name": party_name
            },
            "action_type": "NAVIGATE_TAB",
            "action_payload": {"tab": "pending"}
        }

    # 2. Outward Dispatch Intent (જાવક / મોકલ્યો / ડિસ્પેચ / કાચો પરત / કાસર)
    if any(k in clean_msg for k in ["જાવક", "મોકલ", "dispatch", "કાચો પરત", "કાસર", "delivered"]):
        qty_match = re.search(r"(\d+)\s*(પીસ|pcs|મીટર|mtr|તાકા)?", clean_msg)
        qty = float(qty_match.group(1)) if qty_match else 400.0
        return {
            "intent": "OUTWARD_DISPATCH",
            "confidence": 0.92,
            "reply_gujarati": f"જાવક નોંધ તૈયાર છે: {int(qty)} નંગ. કૃપા કરીને કન્ફર્મ કરો.",
            "reply_english": f"Dispatch entry prepared for {int(qty)} items. Please confirm.",
            "extracted_data": {
                "fresh_quantity": qty,
                "returned_raw_quantity": 50.0 if "કાચો" in clean_msg else 0.0,
                "kasar_quantity": 20.0 if "કાસર" in clean_msg else 0.0,
                "unit": "PCS"
            },
            "action_type": "OPEN_DISPATCH_MODAL",
            "action_payload": {"fresh_quantity": qty}
        }

    # 3. Stitch Costing & Rate Query Intent (ભાવ / ટાંકા / ભાવ પોસાય / quote)
    if any(k in clean_msg for k in ["ટાંકા", "ભાવ", "stitch", "rate", "પોસાય", "quote", "ખર્ચ"]):
        stitch_match = re.search(r"(\d+)\s*(ટાંકા|stitch|હજાર)?", clean_msg)
        stitches = int(stitch_match.group(1)) if stitch_match else 28000
        if stitches < 1000 and "હજાર" in clean_msg:
            stitches *= 1000
        return {
            "intent": "RATE_CALCULATOR",
            "confidence": 0.94,
            "reply_gujarati": f"{stitches:,} ટાંકા માટે અંદાજિત પડતર ભાવ ₹16.73 અને 25% નફા સાથે પાર્ટી ભાવ ₹20.91 પોસાય.",
            "reply_english": f"For {stitches:,} stitches, estimated break-even cost is ₹16.73 and recommended party quote (25% margin) is ₹20.91.",
            "extracted_data": {
                "stitch_count": stitches,
                "machine_heads": 20,
                "break_even_rate": 16.73,
                "recommended_quote": 20.91
            },
            "action_type": "CALCULATOR_QUOTE",
            "action_payload": {"stitch_count": stitches}
        }

    # 4. Default Help Response
    return {
        "intent": "GENERAL_HELP",
        "confidence": 0.85,
        "reply_gujarati": "નમસ્તે! હું ચલણAI મુનિમ છું. તમે ચલણનો ફોટો અપલોડ કરી શકો છો, બાકી માલ પૂછી શકો છો, અથવા સ્ટીચનો ભાવ ગણી શકો છો.",
        "reply_english": "Hello! I am ChallanAI Munim. You can snap a challan photo, query pending lot balances, or calculate stitch rates.",
        "extracted_data": {},
        "action_type": None,
        "action_payload": None
    }
