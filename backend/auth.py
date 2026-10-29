import os
import hmac
import hashlib
import json
import base64
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from uuid import UUID

from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET_KEY") or os.getenv("SECRET_KEY") or "challan_ai_v3_multi_tenant_b2b_saas_sec_8e57f2098b67d512a86c04f91de0347a"
TOKEN_EXPIRE_DAYS = 30


def hash_password(password: str) -> str:
    """Hashes a password using PBKDF2-HMAC-SHA256 with a random salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"{salt}:{key.hex()}"


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Verifies a plain password against its salt:hash representation."""
    if not password_hash:
        return False
    if ":" not in password_hash:
        # Fallback for plain demo comparison only in development environments
        is_dev = os.getenv("ENVIRONMENT", "development").lower() == "development"
        return is_dev and hmac.compare_digest(plain_password, password_hash)
    try:
        salt, key_hex = password_hash.split(":", 1)
        calc_key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), 100000)
        return hmac.compare_digest(calc_key.hex(), key_hex)
    except Exception:
        return False


def _b64_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64_decode(s: str) -> bytes:
    padding = 4 - (len(s) % 4)
    if padding and padding != 4:
        s += "=" * padding
    return base64.urlsafe_b64decode(s)


def create_access_token(user_id: UUID, factory_id: UUID, role: str, expires_delta: Optional[timedelta] = None) -> str:
    """Generates a signed, stateless token (HMAC-SHA256)."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRE_DAYS)

    payload = {
        "user_id": str(user_id),
        "factory_id": str(factory_id),
        "role": str(role),
        "exp": int(expire.timestamp())
    }

    payload_json = json.dumps(payload, separators=(",", ":"))
    payload_b64 = _b64_encode(payload_json.encode("utf-8"))

    sig = hmac.new(SECRET_KEY.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).digest()
    sig_b64 = _b64_encode(sig)

    return f"v3.{payload_b64}.{sig_b64}"


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates a signed token."""
    if not token or not token.startswith("v3."):
        return None
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        _, payload_b64, sig_b64 = parts

        expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).digest()
        actual_sig = _b64_decode(sig_b64)

        if not hmac.compare_digest(expected_sig, actual_sig):
            return None

        payload_bytes = _b64_decode(payload_b64)
        payload = json.loads(payload_bytes.decode("utf-8"))

        # Check expiration
        exp = payload.get("exp")
        if exp and datetime.now(timezone.utc).timestamp() > exp:
            return None

        return payload
    except Exception:
        return None
