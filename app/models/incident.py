"""
Fire Incident database model
Stores all fire incident records with coordinates and metadata
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Index
from app.database import Base
from datetime import datetime


class FireIncident(Base):
    """Fire incident record model"""
    __tablename__ = "fire_incidents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Location data
    x_cord = Column(Float, nullable=True, comment="Projected X coordinate (Jordan TM)")
    y_cord = Column(Float, nullable=True, comment="Projected Y coordinate (Jordan TM)")
    latitude = Column(Float, nullable=True, comment="Latitude (WGS84)")
    longitude = Column(Float, nullable=True, comment="Longitude (WGS84)")

    # Fire details
    fire_type = Column(String(50), nullable=True, comment="Forest or Grassland/Fields")
    subtype_arabic = Column(String(100), nullable=True, comment="Original Arabic subtype from raw CSV")
    year = Column(Integer, nullable=True, index=True)
    month = Column(Integer, nullable=True, index=True)
    date = Column(DateTime, nullable=True, index=True)

    # Location metadata
    governorate = Column(String(100), nullable=True, index=True,
                        comment="Administrative region (e.g., Ajloun, Jerash, Irbid)")
    district = Column(String(100), nullable=True)
    area_name = Column(String(200), nullable=True)

    # Additional fields (flexible for various data sources)
    cause = Column(String(100), nullable=True)
    severity = Column(String(20), nullable=True, comment="Low/Medium/High")
    area_affected = Column(Float, nullable=True, comment="Area affected in dunums")

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Indexes for performance
    __table_args__ = (
        Index('idx_year_type', 'year', 'fire_type'),
        Index('idx_gov_year', 'governorate', 'year'),
        Index('idx_lat_lng', 'latitude', 'longitude'),
    )

    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            "id": self.id,
            "x_cord": self.x_cord,
            "y_cord": self.y_cord,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "fire_type": self.fire_type,
            "subtype_arabic": self.subtype_arabic,
            "year": self.year,
            "month": self.month,
            "date": self.date.isoformat() if self.date else None,
            "governorate": self.governorate,
            "district": self.district,
            "area_name": self.area_name,
            "cause": self.cause,
            "severity": self.severity,
            "area_affected": self.area_affected
        }
