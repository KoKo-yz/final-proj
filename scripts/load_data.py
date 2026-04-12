"""
Data loading script
Loads fire incident data from CSV/Excel files into the SQLite database
Handles coordinate conversion and data cleaning

Usage:
    python scripts/load_data.py --file path/to/data.csv
    python scripts/load_data.py --file path/to/data.xlsx --sheet Sheet1
"""

import argparse
import pandas as pd
import numpy as np
from datetime import datetime
from pathlib import Path
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import init_db, get_db_session
from app.models.incident import FireIncident
from app.utils.coord_converter import jtm_to_wgs84


def clean_and_load(df: pd.DataFrame, db) -> int:
    """
    Clean data and load into database
    
    Args:
        df: Raw dataframe from CSV/Excel
        db: Database session
    
    Returns:
        Number of records loaded
    """
    print(f"📊 Raw data: {len(df)} records, {len(df.columns)} columns")
    print(f"📋 Columns: {list(df.columns)}")
    
    # Standardize column names (handle various possible names)
    column_mapping = {
        # Coordinates
        'x_cord': 'x_cord', 'x_coord': 'x_cord', 'easting': 'x_cord', 'x': 'x_cord',
        'y_cord': 'y_cord', 'y_coord': 'y_cord', 'northing': 'y_cord', 'y': 'y_cord',
        'lon': 'longitude', 'longitude': 'longitude', 'Longitude': 'longitude', 'lng': 'longitude',
        'lat': 'latitude', 'latitude': 'latitude', 'Latitude': 'latitude',
        
        # Fire details
        'fire_type': 'fire_type', 'type': 'fire_type', 'Type': 'fire_type', 'firetype': 'fire_type',
        'year': 'year', 'Year': 'year',
        'month': 'month', 'Month': 'month',
        'date': 'date', 'Date': 'date', 'incident_date': 'date',
        
        # Location
        'governorate': 'governorate', 'Governorate': 'governorate',
        'region': 'governorate', 'Region': 'governorate',
        'district': 'district', 'District': 'district',
        'area_name': 'area_name', 'area': 'area_name', 'Area': 'area_name',
        
        # Additional
        'cause': 'cause', 'Cause': 'cause',
        'severity': 'severity', 'Severity': 'severity',
        'area_affected': 'area_affected', 'Area_Affected': 'area_affected',
        'Subtype': 'subtype', 'subtype': 'subtype',
        'Incident_ID': 'incident_id', 'incident_id': 'incident_id',
    }
    
    # Rename columns
    df = df.rename(columns={k: v for k, v in column_mapping.items() if k in df.columns})
    
    # Handle Arabic fire type values
    if 'fire_type' in df.columns:
        df['fire_type'] = df['fire_type'].astype(str).str.strip()
        # Arabic to English mapping
        arabic_mapping = {
            'حريق': 'Fire',
            'غابات': 'Forest',
            'غابة': 'Forest',
            'حقول-وأعشاب': 'Grassland',
            'حقول': 'Grassland',
            'أعشاب': 'Grassland',
            'اشجار': 'Trees',
            'أشجار': 'Trees',
            'غابات-وأشجار': 'Forest',
            'غابات وأشجار': 'Forest',
        }
        df['fire_type'] = df['fire_type'].replace(arabic_mapping)
        
        # Also check Subtype for more specific classification
        if 'subtype' in df.columns:
            df['subtype'] = df['subtype'].astype(str).str.strip()
            df['subtype'] = df['subtype'].replace(arabic_mapping)
            # Use subtype as primary fire_type if it's more specific
            mask = df['subtype'].isin(['Forest', 'Grassland', 'Trees'])
            df.loc[mask, 'fire_type'] = df.loc[mask, 'subtype']
    
    # Extract governorate from Region column (e.g., "North (Irbid)" -> "Irbid")
    if 'governorate' not in df.columns and 'Region' in df.columns:
        df['governorate'] = df['Region'].str.extract(r'\(([^)]+)\)')
        df['governorate'] = df['governorate'].fillna(df['Region'].str.strip())
    
    # Use Incident_ID as area_name reference
    if 'area_name' not in df.columns and 'incident_id' in df.columns:
        df['area_name'] = 'Incident #' + df['incident_id'].astype(str)
    
    # If no subtype but we have Type, use it
    if 'subtype' not in df.columns and 'Type' in df.columns:
        pass  # Already handled in fire_type column mapping
    
    # If latitude/longitude already exist (WGS84), no conversion needed
    if 'latitude' in df.columns and 'longitude' in df.columns:
        print("✓ Coordinates already in WGS84 (lat/lon) - no conversion needed")
    elif 'x_cord' in df.columns and 'y_cord' in df.columns:
        print("🔄 Converting coordinates from Jordan TM to WGS84...")
        converted = 0
        for idx, row in df.iterrows():
            if pd.notna(row.get('x_cord')) and pd.notna(row.get('y_cord')):
                lon, lat = jtm_to_wgs84(float(row['x_cord']), float(row['y_cord']))
                df.at[idx, 'longitude'] = lon
                df.at[idx, 'latitude'] = lat
                converted += 1
        print(f"✓ Converted {converted} coordinate pairs")
    
    # Parse dates
    if 'date' in df.columns:
        df['date'] = pd.to_datetime(df['date'], errors='coerce')
        df['year'] = df['year'].fillna(df['date'].dt.year)
        df['month'] = df['month'].fillna(df['date'].dt.month)
    
    # If no month column, create one (default to 1)
    if 'month' not in df.columns:
        df['month'] = 1
    
    # If no date column, create a synthetic one from year/month
    if 'date' not in df.columns:
        df['date'] = pd.to_datetime(df['year'].astype(str) + '-' + df['month'].astype(str) + '-01', errors='coerce')
    
    # Load into database
    print("💾 Loading into database...")
    
    count = 0
    for _, row in df.iterrows():
        incident = FireIncident(
            x_cord=row.get('x_cord'),
            y_cord=row.get('y_cord'),
            latitude=float(row['latitude']) if pd.notna(row.get('latitude')) else None,
            longitude=float(row['longitude']) if pd.notna(row.get('longitude')) else None,
            fire_type=str(row.get('fire_type', '')) if pd.notna(row.get('fire_type')) else None,
            year=int(row['year']) if pd.notna(row.get('year')) else None,
            month=int(row['month']) if pd.notna(row.get('month')) else 1,
            date=row.get('date') if pd.notna(row.get('date')) else None,
            governorate=str(row.get('governorate', '')) if pd.notna(row.get('governorate')) else None,
            district=str(row.get('district', '')) if pd.notna(row.get('district')) else None,
            area_name=str(row.get('area_name', '')) if pd.notna(row.get('area_name')) else None,
            cause=str(row.get('cause', '')) if pd.notna(row.get('cause')) else None,
            severity=str(row.get('severity', '')) if pd.notna(row.get('severity')) else None,
            area_affected=float(row['area_affected']) if pd.notna(row.get('area_affected')) else None
        )
        
        db.add(incident)
        count += 1
        
        if count % 10000 == 0:
            db.commit()
            print(f"  Loaded {count:,} records...")
    
    db.commit()
    print(f"✅ Successfully loaded {count:,} records into database")
    
    return count


def load_data(file_path: str, sheet_name: str = None) -> int:
    """
    Main data loading function
    
    Args:
        file_path: Path to CSV or Excel file
        sheet_name: Sheet name (for Excel files)
    
    Returns:
        Number of records loaded
    """
    path = Path(file_path)
    
    if not path.exists():
        print(f"❌ File not found: {file_path}")
        return 0
    
    # Initialize database
    init_db()
    
    # Read file
    print(f"📂 Loading: {file_path}")
    
    if path.suffix.lower() == '.csv':
        # Try different encodings
        for encoding in ['utf-8', 'latin-1', 'cp1256']:
            try:
                df = pd.read_csv(path, encoding=encoding)
                print(f"✓ Read CSV with {encoding} encoding")
                break
            except UnicodeDecodeError:
                continue
    elif path.suffix.lower() in ['.xlsx', '.xls']:
        df = pd.read_excel(path, sheet_name=sheet_name)
    else:
        print(f"❌ Unsupported file format: {path.suffix}")
        return 0
    
    print(f"✓ Read {len(df):,} records")
    
    # Load into database
    db = get_db_session()
    try:
        count = clean_and_load(df, db)
    finally:
        db.close()
    
    return count


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Load fire incident data into database')
    parser.add_argument('--file', '-f', required=True, help='Path to data file (CSV or Excel)')
    parser.add_argument('--sheet', '-s', help='Sheet name (for Excel files)')
    
    args = parser.parse_args()
    
    count = load_data(args.file, args.sheet)
    
    if count > 0:
        print(f"\n🎉 Data loading complete!")
        print(f"   Records loaded: {count:,}")
        print(f"   Database: data/fire_incidents.db")
    else:
        print("\n❌ Data loading failed")
        sys.exit(1)
