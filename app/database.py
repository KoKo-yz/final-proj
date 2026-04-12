"""
Database setup and management for Forest Fire Prediction System
Uses SQLAlchemy with SQLite (local) or PostgreSQL (production on Render)
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from pathlib import Path
import os
from app.config import DATABASE_URL

# ── Auto-create the data/ directory so SQLite can write the file ──────────────
if DATABASE_URL.startswith("sqlite"):
    # Extract the file path from  sqlite:///some/path/file.db
    db_path = DATABASE_URL.replace("sqlite:///", "")
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)

# ── Render gives a  postgres://  URL; SQLAlchemy 2.x needs  postgresql:// ─────
_url = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Choose connection args based on DB type
_connect_args = {"check_same_thread": False} if _url.startswith("sqlite") else {}

# Create engine with connection pooling
engine = create_engine(
    _url,
    connect_args=_connect_args,
    pool_pre_ping=True,
    pool_recycle=300
)


# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db():
    """Get database session with automatic cleanup (FastAPI dependency)"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database - create tables if they don't exist"""
    import app.models.incident  # Import models to register them
    Base.metadata.create_all(bind=engine)
    
    # Create additional tables for climate data and civil defense stations
    from sqlalchemy import Column, Integer, Float, String, Table, MetaData
    metadata = MetaData()
    
    climate_table = Table(
        'climate_data',
        metadata,
        Column('id', Integer, primary_key=True, autoincrement=True),
        Column('region', String(100)),
        Column('year', Integer),
        Column('max_temp_c', Float),
        Column('rainfall_mm', Float),
        Column('max_wind_kmh', Float),
    )
    
    stations_table = Table(
        'civil_defense_stations',
        metadata,
        Column('id', Integer, primary_key=True, autoincrement=True),
        Column('name', String(200)),
        Column('latitude', Float),
        Column('longitude', Float),
    )
    
    metadata.create_all(bind=engine)
    print("[OK] All tables created successfully (including climate and stations)")


def get_db_session():
    """Get a direct database session (for scripts and non-async code)"""
    return SessionLocal()
