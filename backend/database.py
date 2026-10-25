import os
from pathlib import Path
from typing import Generator
from dotenv import load_dotenv
from sqlmodel import SQLModel, create_engine, Session

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

# Check if DATABASE_URL is valid Neon Postgres, otherwise use SQLite
def get_database_engine():
    # If DATABASE_URL is a placeholder, empty, or sqlite
    if not DATABASE_URL or "user:password" in DATABASE_URL or "ep-sample-pooler" in DATABASE_URL:
        db_path = Path(__file__).parent / "embroidery_os.db"
        sqlite_url = f"sqlite:///{db_path}"
        return create_engine(
            sqlite_url,
            echo=False,
            connect_args={"check_same_thread": False}
        ), "SQLITE"
    
    try:
        # Neon PostgreSQL connection
        engine = create_engine(
            DATABASE_URL,
            echo=False,
            pool_size=10,
            max_overflow=20,
            pool_recycle=300,
            pool_pre_ping=True
        )
        return engine, "NEON_POSTGRESQL"
    except Exception as e:
        print(f"[Database Warning] Failed to connect to PostgreSQL ({e}), falling back to SQLite.")
        db_path = Path(__file__).parent / "embroidery_os.db"
        sqlite_url = f"sqlite:///{db_path}"
        return create_engine(
            sqlite_url,
            echo=False,
            connect_args={"check_same_thread": False}
        ), "SQLITE_FALLBACK"

engine, DB_ENGINE_TYPE = get_database_engine()

def init_db():
    """Initializes database tables from SQLModel definitions."""
    # Ensure uploads directory exists
    uploads_dir = Path(__file__).parent / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    
    SQLModel.metadata.create_all(engine)
    print(f"[ChallanAI Engine] Database initialized successfully using {DB_ENGINE_TYPE}.")

def get_session() -> Generator[Session, None, None]:
    """Dependency that yields database session."""
    with Session(engine) as session:
        yield session
