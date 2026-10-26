import os
import re
from pathlib import Path
from typing import Generator, Dict, Any
from urllib.parse import urlparse
from dotenv import load_dotenv
from sqlmodel import SQLModel, create_engine, Session

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

DB_ACTIVE_MODE = "LOCAL_SQLITE_FALLBACK"
DB_STATUS_DETAILS: Dict[str, Any] = {
    "mode": "LOCAL_SQLITE_FALLBACK",
    "connected": False,
    "host": "local_sqlite",
    "reason": "Not initialized",
}


def normalize_database_url(url: str) -> str:
    """Normalizes Postgres connection strings to postgresql+psycopg:// driver dialect."""
    if not url:
        return ""
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql://") and "+psycopg" not in url:
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


def mask_database_url(url: str) -> str:
    """Returns a safe, masked version of the database host without passwords."""
    try:
        parsed = urlparse(url)
        return parsed.hostname or "unknown"
    except Exception:
        return "masked"


def create_sqlite_fallback(reason: str = "Fallback to SQLite"):
    global DB_ACTIVE_MODE, DB_STATUS_DETAILS
    db_path = Path(__file__).parent / "embroidery_os.db"
    sqlite_url = f"sqlite:///{db_path}"
    fallback_engine = create_engine(
        sqlite_url,
        echo=False,
        connect_args={"check_same_thread": False}
    )
    DB_ACTIVE_MODE = "LOCAL_SQLITE_FALLBACK"
    DB_STATUS_DETAILS = {
        "mode": "LOCAL_SQLITE_FALLBACK",
        "connected": True,
        "host": "local:embroidery_os.db",
        "reason": reason
    }
    return fallback_engine


def get_database_engine():
    global DB_ACTIVE_MODE, DB_STATUS_DETAILS

    # Check for placeholder or empty URL
    if not DATABASE_URL or any(p in DATABASE_URL for p in ["user:password", "ep-sample-pooler", "ep-host", "ep-example"]):
        return create_sqlite_fallback("DATABASE_URL is empty or contains placeholder text")

    norm_url = normalize_database_url(DATABASE_URL)
    host_masked = mask_database_url(norm_url)

    try:
        neon_engine = create_engine(
            norm_url,
            echo=False,
            pool_size=10,
            max_overflow=20,
            pool_recycle=300,
            pool_pre_ping=True,
            connect_args={"sslmode": "require"} if "sslmode" not in norm_url else {}
        )
        # Test connection immediately
        with neon_engine.connect() as conn:
            pass

        DB_ACTIVE_MODE = "NEON_POSTGRESQL"
        DB_STATUS_DETAILS = {
            "mode": "NEON_POSTGRESQL",
            "connected": True,
            "host": host_masked,
            "reason": "Successfully connected to Neon Serverless PostgreSQL"
        }
        print(f"[Database] Successfully connected to Neon Serverless PostgreSQL ({host_masked})")
        return neon_engine
    except Exception as e:
        print(f"[Database Warning] Failed to connect to Neon PostgreSQL ({e}). Falling back to SQLite.")
        return create_sqlite_fallback(f"Neon connection failed: {str(e)}")


engine = get_database_engine()
DB_ENGINE_TYPE = DB_ACTIVE_MODE


def get_db_status() -> Dict[str, Any]:
    """Returns database connection status for system diagnostics."""
    return DB_STATUS_DETAILS.copy()


def init_db():
    """Initializes database tables from SQLModel definitions."""
    uploads_dir = Path(__file__).parent / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    SQLModel.metadata.create_all(engine)
    print(f"[ChallanAI Engine] Database tables created/verified using {DB_ACTIVE_MODE}.")


def get_session() -> Generator[Session, None, None]:
    """Dependency that yields database session."""
    with Session(engine) as session:
        yield session
