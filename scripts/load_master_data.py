"""
Master Data Loader for Jordan Fire Intelligence System
Loads fire incidents, climate data, and civil defense stations

Usage:
    python scripts/load_master_data.py --data-dir "path/to/data/folder"
"""

import argparse
import pandas as pd
import numpy as np
from datetime import datetime
from pathlib import Path
import sys
import json

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import init_db, get_db_session
from app.models.incident import FireIncident


def load_fire_incidents(csv_path: str, db) -> dict:
    """
    Load fire incidents from jordan_fires_master.csv
    
    Data schema:
        Year, lon, lat, Incident_ID, Type, Subtype, Region
    
    Mapping to FireIncident model:
        Year -> year
        lon -> longitude
        lat -> latitude
        Incident_ID -> incident_id (stored in area_name)
        Type + Subtype -> fire_type (Forest/Grassland)
        Region -> governorate (North/Irbid, Central/Amman, South/Ma'an)
    """
    print(f"\n{'='*60}")
    print("📂 Loading Fire Incidents")
    print(f"{'='*60}")
    
    if not Path(csv_path).exists():
        print(f"❌ File not found: {csv_path}")
        return {"loaded": 0, "errors": 1}
    
    print(f"📂 Reading: {csv_path}")
    
    # Read CSV
    df = pd.read_csv(csv_path, encoding='utf-8')
    print(f"✓ Read {len(df):,} records with {len(df.columns)} columns")
    print(f"📋 Columns: {list(df.columns)}")
    
    # Data quality check
    null_lon = df['lon'].isnull().sum()
    null_lat = df['lat'].isnull().sum()
    print(f"🔍 Data quality: {null_lon} null lon, {null_lat} null lat")
    
    # Map Region to governorate
    # Region format: "North (Irbid)", "Central (Amman)", "South (Ma'an)"
    region_mapping = {
        'North (Irbid)': 'Irbid',
        'Central (Amman)': 'Amman',
        "South (Ma'an)": "Ma'an",
    }
    
    # Map Subtype to fire_type (Forest vs Grassland)
    # Subtype values:
    #   حقول-وأعشاب (Fields and Grass) -> Grassland
    #   غابات-وأشجار (Forests and Trees) -> Forest
    #   اعشاب (Grass) -> Grassland
    #   اشجار-حرجيه (Forest Trees) -> Forest
    #   اشجار-مثمره (Fruit Trees) -> Forest
    subtype_to_fire_type = {
        'حقول-وأعشاب': 'Grassland',
        'غابات-وأشجار': 'Forest',
        'اعشاب': 'Grassland',
        'اشجار-حرجيه': 'Forest',
        'اشجار-مثمره': 'Forest',
    }
    
    # Map Type to English
    type_mapping = {
        'حريق': 'Fire',
        'حريق-اعشاب-اشجار': 'Fire-Grass-Trees',
    }
    
    # Create mapped columns
    df['mapped_governorate'] = df['Region'].map(region_mapping)
    df['mapped_fire_type'] = df['Subtype'].map(subtype_to_fire_type)
    df['mapped_subtype'] = df['Subtype']
    df['mapped_type'] = df['Type'].map(type_mapping).fillna(df['Type'])
    
    # Count mappings
    unmapped_gov = df['mapped_governorate'].isnull().sum()
    unmapped_type = df['mapped_fire_type'].isnull().sum()
    
    print(f"\n📊 Mapping summary:")
    print(f"   Governorates: {df['mapped_governorate'].value_counts().to_dict()}")
    print(f"   Fire types: {df['mapped_fire_type'].value_counts().to_dict()}")
    print(f"   Years: {df['Year'].value_counts().sort_index().to_dict()}")
    
    if unmapped_gov > 0:
        print(f"⚠️  {unmapped_gov} rows with unmapped governorate")
        print(f"   Unique unmapped: {df[df['mapped_governorate'].isnull()]['Region'].unique()}")
    
    if unmapped_type > 0:
        print(f"⚠️  {unmapped_type} rows with unmapped fire type")
        print(f"   Unique unmapped: {df[df['mapped_fire_type'].isnull()]['Subtype'].unique()}")
    
    # Load into database
    print(f"\n💾 Loading into database...")
    
    loaded = 0
    skipped = 0
    errors = []
    
    for idx, row in df.iterrows():
        try:
            # Skip rows without valid coordinates
            if pd.isna(row['lon']) or pd.isna(row['lat']):
                skipped += 1
                continue
            
            # Validate coordinate range (Jordan bounds)
            lon = float(row['lon'])
            lat = float(row['lat'])
            
            if not (34.5 <= lon <= 39.5 and 29.0 <= lat <= 33.5):
                skipped += 1
                continue
            
            governorate = str(row['mapped_governorate']) if pd.notna(row.get('mapped_governorate')) else str(row.get('Region', ''))
            fire_type = str(row['mapped_fire_type']) if pd.notna(row.get('mapped_fire_type')) else None
            
            incident = FireIncident(
                x_cord=None,  # We have WGS84 directly, no JTM
                y_cord=None,
                latitude=lat,
                longitude=lon,
                fire_type=fire_type,
                year=int(row['Year']) if pd.notna(row['Year']) else None,
                month=1,  # No monthly data available
                date=datetime(int(row['Year']), 1, 1) if pd.notna(row['Year']) else None,
                governorate=governorate,
                district=str(row.get('Region', '')),  # Store full region in district
                area_name=f"Incident #{int(row['Incident_ID'])}" if pd.notna(row['Incident_ID']) else None,
                cause=None,
                severity=None,
                area_affected=None,
            )
            
            db.add(incident)
            loaded += 1
            
            if loaded % 50000 == 0:
                db.commit()
                print(f"  ✓ Loaded {loaded:,} records...")
                
        except Exception as e:
            errors.append(str(e))
            if len(errors) <= 5:
                print(f"  ⚠️  Error on row {idx}: {e}")
    
    db.commit()
    
    result = {
        "loaded": loaded,
        "skipped": skipped,
        "errors": len(errors),
        "governorates": df['mapped_governorate'].value_counts().to_dict(),
        "fire_types": df['mapped_fire_type'].value_counts().to_dict(),
        "years": df['Year'].value_counts().sort_index().to_dict(),
    }
    
    print(f"\n✅ Fire incidents loaded:")
    print(f"   Total: {loaded:,}")
    print(f"   Skipped: {skipped}")
    print(f"   Errors: {len(errors)}")
    
    return result


def load_climate_data(csv_path: str, db) -> dict:
    """
    Load climate data from jordan_climate_2018_2025.csv
    
    Schema:
        Region, Year, Max Temp (C), Rainfall (mm), Max Wind (km/h)
    
    We'll store this in a separate climate_data table.
    For now, we'll create it dynamically.
    """
    print(f"\n{'='*60}")
    print("🌡️  Loading Climate Data")
    print(f"{'='*60}")
    
    if not Path(csv_path).exists():
        print(f"⚠️  File not found: {csv_path} (skipping)")
        return {"loaded": 0}
    
    print(f"📂 Reading: {csv_path}")
    df = pd.read_csv(csv_path, encoding='utf-8')
    print(f"✓ Read {len(df):,} records")
    print(f"📋 Columns: {list(df.columns)}")
    
    # Create climate_data table
    from sqlalchemy import Column, Integer, Float, String, Table, MetaData
    from app.database import engine
    
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
    
    metadata.create_all(engine)
    print("✓ Created climate_data table")
    
    # Load data
    region_mapping = {
        'Central (Amman)': 'Amman',
        'North (Irbid)': 'Irbid',
        "South (Ma'an)": "Ma'an",
    }
    
    conn = engine.connect()
    loaded = 0
    
    for _, row in df.iterrows():
        region = region_mapping.get(str(row['Region']), str(row['Region']))
        conn.execute(
            climate_table.insert(),
            {
                'region': region,
                'year': int(row['Year']),
                'max_temp_c': float(row['Max Temp (C)']),
                'rainfall_mm': float(row['Rainfall (mm)']),
                'max_wind_kmh': float(row['Max Wind (km/h)']),
            }
        )
        loaded += 1
    
    conn.commit()
    conn.close()
    
    print(f"\n✅ Climate data loaded:")
    print(f"   Total: {loaded:,} records")
    print(f"   Regions: {df['Region'].unique()}")
    print(f"   Years: {sorted(df['Year'].unique())}")
    
    return {"loaded": loaded}


def load_stations_data(csv_path: str, db) -> dict:
    """
    Load civil defense stations from jordan_civil_defense_stations.csv
    
    Schema:
        name, lat, lon
    
    We'll create a stations table.
    """
    print(f"\n{'='*60}")
    print("🚒 Loading Civil Defense Stations")
    print(f"{'='*60}")
    
    if not Path(csv_path).exists():
        print(f"⚠️  File not found: {csv_path} (skipping)")
        return {"loaded": 0}
    
    print(f"📂 Reading: {csv_path}")
    df = pd.read_csv(csv_path, encoding='utf-8')
    print(f"✓ Read {len(df):,} records")
    print(f"📋 Columns: {list(df.columns)}")
    
    # Create stations table
    from sqlalchemy import Column, Integer, Float, String, Table, MetaData
    from app.database import engine
    
    metadata = MetaData()
    
    stations_table = Table(
        'civil_defense_stations',
        metadata,
        Column('id', Integer, primary_key=True, autoincrement=True),
        Column('name', String(200)),
        Column('latitude', Float),
        Column('longitude', Float),
    )
    
    metadata.create_all(engine)
    print("✓ Created civil_defense_stations table")
    
    # Load data
    conn = engine.connect()
    loaded = 0
    
    for _, row in df.iterrows():
        conn.execute(
            stations_table.insert(),
            {
                'name': str(row['name']),
                'latitude': float(row['lat']),
                'longitude': float(row['lon']),
            }
        )
        loaded += 1
    
    conn.commit()
    conn.close()
    
    print(f"\n✅ Civil defense stations loaded:")
    print(f"   Total: {loaded:,} stations")
    
    return {"loaded": loaded}


def print_summary(fire_stats, climate_stats, station_stats):
    """Print comprehensive loading summary"""
    print(f"\n{'='*60}")
    print("📊 LOADING SUMMARY")
    print(f"{'='*60}")
    print(f"\n🔥 Fire Incidents:")
    print(f"   ✓ {fire_stats['loaded']:,} records loaded")
    print(f"   ⚠️  {fire_stats['skipped']} records skipped (invalid coordinates)")
    print(f"   ❌ {fire_stats['errors']} errors")
    
    print(f"\n🌡️  Climate Data:")
    print(f"   ✓ {climate_stats['loaded']:,} records loaded")
    
    print(f"\n🚒 Civil Defense Stations:")
    print(f"   ✓ {station_stats['loaded']:,} stations loaded")
    
    print(f"\n{'='*60}")


def main():
    parser = argparse.ArgumentParser(description='Load all master data for Jordan Fire Intelligence')
    parser.add_argument('--data-dir', '-d', required=True, 
                       help='Path to data directory containing CSV files')
    parser.add_argument('--fires-only', action='store_true',
                       help='Only load fire incidents')
    parser.add_argument('--reset', action='store_true',
                       help='Reset database before loading')
    
    args = parser.parse_args()
    
    data_dir = Path(args.data_dir)
    
    if not data_dir.exists():
        print(f"❌ Data directory not found: {data_dir}")
        sys.exit(1)
    
    # Initialize database
    if args.reset:
        print("🗑️  Resetting database...")
        db_file = Path(__file__).parent.parent / 'data' / 'fire_incidents.db'
        if db_file.exists():
            db_file.unlink()
            print(f"✓ Deleted: {db_file}")
    
    init_db()
    
    db = get_db_session()
    
    try:
        # Load fire incidents
        fires_file = data_dir / 'jordan_fires_master.csv'
        fire_stats = load_fire_incidents(str(fires_file), db)
        
        if not args.fires_only:
            # Load climate data
            climate_file = data_dir / 'jordan_climate_2018_2025.csv'
            climate_stats = load_climate_data(str(climate_file), db)
            
            # Load stations data
            stations_file = data_dir / 'jordan_civil_defense_stations.csv'
            station_stats = load_stations_data(str(stations_file), db)
        else:
            climate_stats = {"loaded": 0}
            station_stats = {"loaded": 0}
        
        print_summary(fire_stats, climate_stats, station_stats)
        
    finally:
        db.close()


if __name__ == "__main__":
    main()
