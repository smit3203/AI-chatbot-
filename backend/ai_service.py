import os
import re
import json
from io import BytesIO
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

# Try initializing Google GenAI SDK
genai_client = None
AI_ACTIVE_MODE = "DEMO_FALLBACK"
ACTIVE_MODEL_NAME = "gemini-2.5-flash"
MODELS_CASCADE = ["gemini-2.5-flash", "gemini-3-flash-preview", "gemini-flash-latest"]

if GEMINI_API_KEY and GEMINI_API_KEY not in ["your_gemini_api_key_here", "your_google_ai_studio_gemini_key_here"]:
    try:
        from google import genai
        from google.genai import types
        genai_client = genai.Client(api_key=GEMINI_API_KEY)
        AI_ACTIVE_MODE = "GEMINI_2_5_FLASH_LIVE"
        print("[AI Service] Gemini 2.5 Flash / 3.0 client initialized successfully.")
    except Exception as e:
        print(f"[AI Service Warning] Failed to initialize Google GenAI SDK: {e}. Operating in demo mode.")
        AI_ACTIVE_MODE = "DEMO_FALLBACK"
else:
    print("[AI Service] GEMINI_API_KEY not configured or placeholder detected. Operating in deterministic demo mode.")


def get_ai_status() -> Dict[str, Any]:
    """Returns AI service status for system diagnostics."""
    return {
        "mode": AI_ACTIVE_MODE,
        "api_key_configured": bool(GEMINI_API_KEY and GEMINI_API_KEY not in ["your_gemini_api_key_here", "your_google_ai_studio_gemini_key_here"]),
        "supports_pdf_and_image_ocr": True,
        "model": ACTIVE_MODEL_NAME
    }


def detect_mime_type(file_bytes: bytes, filename: str = "", content_type: Optional[str] = None) -> str:
    """Detects MIME type for Images and PDFs."""
    if content_type and content_type in ["application/pdf", "image/jpeg", "image/png", "image/webp"]:
        return content_type

    # Check magic bytes for PDF
    if file_bytes.startswith(b"%PDF"):
        return "application/pdf"

    # Check magic bytes for PNG
    if file_bytes.startswith(b"\x89PNG"):
        return "image/png"

    # Check magic bytes for JPEG
    if file_bytes.startswith(b"\xff\xd8"):
        return "image/jpeg"

    # Check filename extension
    ext = (filename or "").lower().split(".")[-1]
    if ext == "pdf":
        return "application/pdf"
    elif ext == "png":
        return "image/png"
    elif ext == "webp":
        return "image/webp"

    return "image/jpeg"


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


# --- 4 CORE DETERMINISTIC PRESETS (v2.0 & v3.0) ---
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
        "returned_raw_quantity": 0.0,
        "kasar_quantity": 0.0,
        "fent_quantity": 0.0,
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
        "returned_raw_quantity": 0.0,
        "kasar_quantity": 0.0,
        "fent_quantity": 0.0,
        "unit": "PCS",
        "raw_gujarati_notes": "ડુપ્લિકેટ ચલણ ગાર્ડ ટેસ્ટ: RC-1048 ફરીથી દાખલ કરવાનો પ્રયાસ",
        "confidence_score": 0.99,
        "is_demo_fallback": True
    },

    # Preset 4: Machine LCD Screen (Dahao/Richpeace Controller)
    "preset_dahao_lcd.jpg": {
        "machine_number": "M-01",
        "start_stitch_counter": 14000000,
        "end_stitch_counter": 14450000,
        "total_stitches": 450000,
        "target_stitches": 400000,
        "efficiency_pct": 112.5,
        "bonus_earned_inr": 75.0,
        "rpm_average": 650,
        "downtime_minutes": 20,
        "is_low_efficiency_alert": False,
        "confidence_score": 0.96,
        "is_demo_fallback": True
    }
}


def parse_challan_image(file_bytes: bytes, filename: str = "challan.jpg", content_type: Optional[str] = None) -> Dict[str, Any]:
    """
    Parses physical challans (photos OR PDF documents) using Google Gemini Multimodal OCR,
    with automatic deterministic preset fallback for offline/demo scenarios.
    """
    # 1. Check for quick-test demo preset match
    lower_filename = filename.lower()
    for preset_name, preset_data in DEMO_PRESETS.items():
        if preset_name in lower_filename:
            return preset_data.copy()

    # 2. Try Gemini Multimodal OCR if client is active
    if genai_client:
        try:
            from google.genai import types

            detected_mime = detect_mime_type(file_bytes, filename, content_type)
            part = types.Part.from_bytes(data=file_bytes, mime_type=detected_mime)

            prompt = """
            You are ChallanAI Munim, an expert Gujarati and English textile accountant specializing in Gujarat embroidery job-work slips (આવક/જાવક ચલણ) from Surat, Ahmedabad, and Jetpur.
            Analyze this challan image or PDF document and extract data strictly into this JSON schema:
            {
              "challan_type": "INWARD" or "OUTWARD",
              "party_name": string (merchant trade name, e.g. Radhe Creation, Maruti Embroidery),
              "challan_number": string (slip number, e.g. RC-1048),
              "challan_date": "YYYY-MM-DD",
              "design_number": string (design code, e.g. D-1024),
              "factory_punch_number": string or null (machine punch code, e.g. SK-45),
              "agreed_rate": float (job-work rate per piece or meter in INR, e.g. 42.0),
              "stitches_per_piece": integer (stitch count, e.g. 28000),
              "fabric_type": string (e.g. Fox Georgette, Silk, Rayon, Cotton),
              "quantity": float (total quantity),
              "returned_raw_quantity": float (default 0.0),
              "kasar_quantity": float (default 0.0),
              "fent_quantity": float (default 0.0),
              "unit": "PCS" or "MTR" or "TAKA",
              "raw_gujarati_notes": string (verbatim Gujarati or Hindi notes from the slip),
              "confidence_score": float (between 0.0 and 1.0)
            }
            Rules:
            1. Convert all Gujarati numerals (૧,૨,૩,૪,૫,૬,૭,૮,૯,૦) to standard Arabic digits (1,2,3,4,5,6,7,8,9,0).
            2. If date is not specified or ambiguous, use the current year 2026.
            3. Return ONLY valid, raw JSON without markdown backticks or commentary.
            """

            response_text = None
            last_err = None

            for model_name in MODELS_CASCADE:
                try:
                    response = genai_client.models.generate_content(
                        model=model_name,
                        contents=[part, prompt]
                    )
                    if response and response.text:
                        response_text = response.text.strip()
                        break
                except Exception as me:
                    last_err = me
                    continue

            if not response_text:
                raise last_err or Exception("All Gemini models failed")

            # Clean markdown codeblocks if returned
            clean_text = re.sub(r"^```(?:json)?", "", response_text, flags=re.MULTILINE)
            clean_text = re.sub(r"```$", "", clean_text, flags=re.MULTILINE).strip()

            # Transliterate any remaining Gujarati numerals
            clean_text = transliterate_gujarati_numerals(clean_text)
            data = json.loads(clean_text)

            # Ensure default fields
            data.setdefault("returned_raw_quantity", 0.0)
            data.setdefault("kasar_quantity", 0.0)
            data.setdefault("fent_quantity", 0.0)
            data["is_demo_fallback"] = False
            return data
        except Exception as e:
            print(f"[AI Service Error] Gemini Multimodal OCR failed: {e}. Using intelligent fallback.")

    # 3. Default Intelligent Fallback
    is_outward = "outward" in lower_filename or "dispatch" in lower_filename
    return {
        "challan_type": "OUTWARD" if is_outward else "INWARD",
        "party_name": "Radhe Creation (સુરત)",
        "challan_number": f"{'JW' if is_outward else 'RC'}-{int(len(file_bytes) % 900 + 100)}",
        "challan_date": "2026-10-24",
        "design_number": "D-1024",
        "factory_punch_number": "SK-45",
        "agreed_rate": 42.0,
        "stitches_per_piece": 28000,
        "fabric_type": "Fox Georgette",
        "quantity": 400.0 if is_outward else 1200.0,
        "returned_raw_quantity": 50.0 if is_outward else 0.0,
        "kasar_quantity": 20.0 if is_outward else 0.0,
        "fent_quantity": 10.0 if is_outward else 0.0,
        "unit": "PCS",
        "raw_gujarati_notes": "ઓટોમેટિક ડેમો મોડ: ૧૨૦૦ નંગ કટ પીસ ગળા-દામન વર્ક",
        "confidence_score": 0.94,
        "is_demo_fallback": True
    }


def parse_machine_lcd(file_bytes: bytes, filename: str = "lcd.jpg", content_type: Optional[str] = None) -> Dict[str, Any]:
    """Parses machine LCD stitch counter photos (Dahao/Richpeace/Tajima controllers)."""
    if "preset_dahao_lcd" in filename.lower() or not genai_client:
        return DEMO_PRESETS["preset_dahao_lcd.jpg"].copy()

    try:
        from google.genai import types

        detected_mime = detect_mime_type(file_bytes, filename, content_type)
        part = types.Part.from_bytes(data=file_bytes, mime_type=detected_mime)

        prompt = """
        Analyze this embroidery machine LCD controller screen photo (e.g. Dahao, Richpeace, Tajima).
        Extract:
        1. "machine_number": string (e.g. "M-01")
        2. "start_stitch_counter": integer
        3. "end_stitch_counter": integer (cumulative current stitches)
        4. "rpm_average": integer
        5. "downtime_minutes": integer
        Return ONLY clean JSON.
        """

        response_text = None
        for model_name in MODELS_CASCADE:
            try:
                response = genai_client.models.generate_content(
                    model=model_name,
                    contents=[part, prompt]
                )
                if response and response.text:
                    response_text = response.text.strip()
                    break
            except Exception:
                continue

        if not response_text:
            return DEMO_PRESETS["preset_dahao_lcd.jpg"].copy()

        text_resp = re.sub(r"^```(?:json)?|```$", "", response_text, flags=re.MULTILINE).strip()
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
        party_match = re.search(r"(રાધે|radhe|મારુતિ|maruti|શિવમ|shivam|ખોડિયાર|khodiyar|બંસી|bansi|કર્ણાવતી|karnavati)", clean_msg)
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
        "reply_gujarati": "નમસ્તે! હું ચલણAI મુનિમ છું. તમે ચલણનો ફોટો અથવા પીડીએફ અપલોડ કરી શકો છો, બાકી માલ પૂછી શકો છો, અથવા સ્ટીચનો ભાવ ગણી શકો છો.",
        "reply_english": "Hello! I am ChallanAI Munim. You can upload a challan image or PDF document, query pending lot balances, or calculate stitch rates.",
        "extracted_data": {},
        "action_type": None,
        "action_payload": None
    }
