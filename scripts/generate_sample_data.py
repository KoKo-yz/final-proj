"""
Sample Data Generator - Generate realistic fire incident data for testing
Creates 1000+ sample records with Jordan-specific locations and dates

Usage:
    python scripts/generate_sample_data.py
    python scripts/generate_sample_data.py --count 5000
"""

import sys
from pathlib import Path
import random
from datetime import datetime, timedelta

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import init_db, get_db_session
from app.models.incident import FireIncident
from app.utils.coord_converter import jtm_to_wgs84

# Jordan governorates with realistic fire frequencies
GOVERNORATES = {
    'Ajloun': {'weight': 25, 'center': (238000, 260000)},
    'Jerash': {'weight': 20, 'center': (241000, 263000)},
    'Irbid': {'weight': 30, 'center': (234000, 280000)},
    'Balqa': {'weight': 15, 'center': (230000, 250000)},
    'Amman': {'weight': 18, 'center': (236000, 243000)},
    'Zarqa': {'weight': 12, 'center': (245000, 250000)},
    'Madaba': {'weight': 8, 'center': (230000, 230000)},
    'Karak': {'weight': 10, 'center': (240000, 200000)},
    'Tafilah': {'weight': 5, 'center': (245000, 185000)},
    'Ma\'an': {'weight': 6, 'center': (285000, 135000)},
    'Aqaba': {'weight': 3, 'center': (305000, 85000)},
    'Mafraq': {'weight': 10, 'center': (270000, 280000)}
}

# Areas within governorates
AREAS = {
    'Ajloun': ['Ajloun Forest', 'Kufranja', 'Sakhrah', 'Ras Munif', 'Ajloun City'],
    'Jerash': ['Jerash City', 'Suf', 'Sakib', 'Burmah'],
    'Irbid': ['Irbid City', 'Bani Obaid', 'Al-Ramtha', 'Al-Taybeh', 'Koura'],
    'Balqa': ['Salt', 'Al-Baqaa', 'Mahes', 'Wadi Shueib'],
    'Amman': ['Wadi Al-Sir', 'Tla Al-Ali', 'Qasaba', 'Marka', 'Jubeiha'],
    'Zarqa': ['Zarqa City', 'Russeifa', 'Azraq', 'Hashemia'],
    'Madaba': ['Madaba City', 'Dhiban', 'Ma\'in', 'Hesban'],
    'Karak': ['Karak City', 'Mouta', 'Agricultural Zone'],
    'Tafilah': ['Tafilah City', 'Basira', 'Qadesiah'],
    'Ma\'an': ['Ma\'an City', 'Shoubak', 'Wadi Musa'],
    'Aqaba': ['Aqaba City', 'Wadi Araba', 'Quayqabah'],
    'Mafraq': ['Mafraq City', 'Ruwaished', 'Sabha']
}

FIRE_TYPES = ['Forest', 'Grassland']
CAUSES = ['Natural', 'Human activity', 'Arson', 'Accidental', 'Lightning', 'Unknown']


def generate_coordinates(governorate: str) -> tuple:
    """Generate realistic JTM coordinates for a governorate"""
    center = GOVERNORATES[governorate]['center']
    # Add random offset (roughly 10-20km radius)
    x = center[0] + random.uniform(-15000, 15000)
    y = center[1] + random.uniform(-15000, 15000)
    return x, y


def generate_date(start_year: int = 2018, end_year: int = 2025) -> datetime:
    """Generate random date with seasonal bias toward summer months"""
    year = random.randint(start_year, end_year)
    
    # Higher probability for summer months (Jun-Oct)
    month_weights = [2, 2, 4, 8, 15, 25, 30, 28, 18, 10, 4, 2]
    month = random.choices(range(1, 13), weights=month_weights, k=1)[0]
    
    day = random.randint(1, 28)
    return datetime(year, month, day)


def generate_incident() -> FireIncident:
    """Generate a single realistic fire incident"""
    # Select governorate based on weights
    governorate = random.choices(
        list(GOVERNORATES.keys()),
        weights=[g['weight'] for g in GOVERNORATES.values()],
        k=1
    )[0]
    
    # Generate coordinates
    x_cord, y_cord = generate_coordinates(governorate)
    lon, lat = jtm_to_wgs84(x_cord, y_cord)
    
    # Generate date
    date = generate_date()
    
    # Fire type (60% grassland, 40% forest - realistic ratio)
    fire_type = random.choices(FIRE_TYPES, weights=[40, 60], k=1)[0]
    
    # Select random area
    area = random.choice(AREAS.get(governorate, ['Unknown']))
    
    return FireIncident(
        x_cord=round(x_cord, 2),
        y_cord=round(y_cord, 2),
        latitude=round(lat, 6) if lat else None,
        longitude=round(lon, 6) if lon else None,
        fire_type=fire_type,
        year=date.year,
        month=date.month,
        date=date,
        governorate=governorate,
        area_name=area,
        cause=random.choice(CAUSES),
        severity=random.choices(
            ['Low', 'Medium', 'High'],
            weights=[40, 40, 20],
            k=1
        )[0],
        area_affected=round(random.uniform(0.5, 500), 2)
    )


def generate_data(count: int = 1000):
    """Generate and save sample fire incident data"""
    print(f"🎲 Generating {count:,} sample fire incidents...")
    
    # Initialize database
    init_db()
    
    db = get_db_session()
    try:
        for i in range(count):
            incident = generate_incident()
            db.add(incident)
            
            if (i + 1) % 1000 == 0:
                db.commit()
                print(f"  Generated {(i + 1):,} incidents...")
        
        db.commit()
        print(f"\n✅ Successfully generated {count:,} sample incidents!")
        print(f"📊 Database: data/fire_incidents.db")
        print(f"\n🗺️  Governorates covered: {len(GOVERNORATES)}")
        print(f"📅 Date range: 2018-2025")
        
        # Print summary
        forest_count = db.query(FireIncident).filter(
            FireIncident.fire_type == 'Forest'
        ).count()
        
        grassland_count = db.query(FireIncident).filter(
            FireIncident.fire_type == 'Grassland'
        ).count()
        
        print(f"\n📈 Summary:")
        print(f"   Forest fires: {forest_count:,}")
        print(f"   Grassland fires: {grassland_count:,}")
        
    finally:
        db.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Generate sample fire incident data')
    parser.add_argument('--count', '-c', type=int, default=1000, 
                       help='Number of incidents to generate (default: 1000)')
    
    args = parser.parse_args()
    
    generate_data(args.count)
