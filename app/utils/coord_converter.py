"""
Coordinate conversion utilities
Converts Jordan Transverse Mercator (JTM) coordinates to WGS84 (lat/lon)
Uses pyproj library for accurate coordinate transformation
"""

from pyproj import Transformer

# Jordan Transverse Mercator (JTM) / EPSG:29383
# This is the official coordinate system for Jordan
JTM_CRS = "EPSG:29383"

# WGS84 - standard GPS coordinates (lat/lon)
WGS84_CRS = "EPSG:4326"

# Create transformer (reusable, thread-safe)
_transformer = Transformer.from_crs(JTM_CRS, WGS84_CRS, always_xy=True)


def jtm_to_wgs84(x_cord: float, y_cord: float) -> tuple:
    """
    Convert Jordan TM coordinates to WGS84 (latitude, longitude)
    
    Args:
        x_cord: Easting coordinate in Jordan TM (meters)
        y_cord: Northing coordinate in Jordan TM (meters)
    
    Returns:
        tuple: (longitude, latitude) in WGS84 decimal degrees
        
    Example:
        >>> jtm_to_wgs84(245000, 285000)
        (35.89123, 32.34567)
    """
    if x_cord is None or y_cord is None:
        return None, None
    
    try:
        longitude, latitude = _transformer.transform(x_cord, y_cord)
        return round(longitude, 6), round(latitude, 6)
    except Exception as e:
        print(f"⚠️ Coordinate conversion error: {e}")
        return None, None


def convert_batch(incidents: list) -> list:
    """
    Convert batch of incidents from JTM to WGS84
    
    Args:
        incidents: List of dicts with 'x_cord' and 'y_cord' keys
    
    Returns:
        List of dicts with added 'latitude' and 'longitude' keys
    """
    x_coords = [inc.get('x_cord') for inc in incidents if inc.get('x_cord')]
    y_coords = [inc.get('y_cord') for inc in incidents if inc.get('y_cord')]
    
    if not x_coords or not y_coords:
        return incidents
    
    try:
        # Batch conversion (much faster than individual calls)
        lons, lats = _transformer.transform(x_coords, y_coords)
        
        # Add back to incidents
        idx = 0
        for inc in incidents:
            if inc.get('x_cord') and inc.get('y_cord'):
                inc['longitude'] = round(lons[idx], 6)
                inc['latitude'] = round(lats[idx], 6)
                idx += 1
        
        return incidents
    except Exception as e:
        print(f"⚠️ Batch conversion error: {e}")
        return incidents


# Jordan TM parameters (for reference)
# Datum: WGS84
# Projection: Transverse Mercator
# Central Meridian: 37.0°E
# Latitude of Origin: 0°
# Scale Factor: 0.9997
# False Easting: 250,000 m
# False Northing: 0 m
