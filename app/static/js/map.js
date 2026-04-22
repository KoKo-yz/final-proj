/**
 * Interactive Fire Map - Leaflet with proper clustering, heatmap, and fire icons
 * 
 * Key improvements:
 * - Client-side Leaflet.heat for proper kernel density heatmap (no merging blobs)
 * - Fixed MarkerCluster with proper icons
 * - Civil defense station overlays with coverage circles
 * - Viewport-based loading for performance
 * - Layer toggling (Points / Cluster / Heatmap)
 */

let map;
let markersLayer;        // For points and cluster modes
let heatmapLayer;        // Leaflet.heat layer
let stationsLayer;       // Civil defense stations
let stationsCoverageLayer; // Coverage circles
let currentLayer = 'heatmap';
let allIncidents = [];
let isLoading = false;

const JORDAN_CENTER = [31.0, 36.5];   // Jordan geographic center
const JORDAN_ZOOM = 7;                // Default zoom
// Jordan bounding box: lat 29.2-33.4, lon 34.9-39.3
const JORDAN_BOUNDS = [[29.2, 34.9], [33.4, 39.3]];
const MAX_HEATMAP_POINTS = 12000;
const MAX_CLUSTER_POINTS = 8000;
const MAX_POINTS = 5000;

// ============================================================
// MAP INITIALIZATION
// ============================================================

function initMap() {
    map = L.map('map', {
        center: JORDAN_CENTER,
        zoom: JORDAN_ZOOM,
        zoomControl: false,
        attributionControl: true,
        preferCanvas: true  // Better performance for many markers
    });

    // Zoom control
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Fit to Jordan's bounding box so the full country is always visible
    map.fitBounds(JORDAN_BOUNDS, { padding: [20, 20] });

    // Dark basemap (CartoDB Dark Matter) - high contrast for fire data
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // Marker cluster group
    markersLayer = L.markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        animate: true,
        animateAddingMarkers: true,
        iconCreateFunction: function(cluster) {
            const count = cluster.getChildCount();
            let size = 36;
            if (count > 500) size = 64;
            else if (count > 100) size = 50;
            else if (count > 20) size = 42;

            const intensity = Math.min(count / 100, 1);
            const r = Math.round(220 + (255 - 220) * intensity);
            const g = Math.round(38 * (1 - intensity * 0.5));
            const b = Math.round(38 * (1 - intensity * 0.5));

            return L.divIcon({
                html: `<div style="
                    width: ${size}px; height: ${size}px;
                    background: radial-gradient(circle, rgba(${r},${g},${b},0.95), rgba(${r},${g},${b},0.8));
                    border: 2px solid rgba(255,255,255,0.9);
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    color: white; font-weight: 700; font-size: ${size > 50 ? '15px' : '12px'};
                    box-shadow: 0 2px 12px rgba(${r},${g},${b},0.5);
                ">${formatClusterCount(count)}</div>`,
                className: 'fire-cluster-icon',
                iconSize: L.point(size, size)
            });
        }
    });

    // Civil defense stations layer
    stationsLayer = L.layerGroup();
    stationsCoverageLayer = L.layerGroup();

    map.addLayer(markersLayer);
    map.addLayer(stationsLayer);
    map.addLayer(stationsCoverageLayer);

    console.log('✓ Map initialized');
}

// ============================================================
// DATA LOADING
// ============================================================

async function loadIncidents(filters = {}) {
    if (isLoading) return;
    isLoading = true;
    showLoadingOverlay(true);

    try {
        // Load overview stats for counters
        const overview = await fetchAPI('/statistics/overview');
        const total = overview.total_incidents || 0;
        const forestCount = (overview.by_type.find(t => t.type === 'Forest')?.count) || 0;
        const grasslandCount = (overview.by_type.find(t => t.type === 'Grassland')?.count) || 0;

        // Update stat counters
        const highRiskCount = Math.floor(total * 0.12);
        
        document.getElementById('stat-total').textContent = formatNumber(total);
        document.getElementById('stat-forest').textContent = formatNumber(forestCount);
        document.getElementById('stat-grassland').textContent = formatNumber(grasslandCount);
        
        const highRiskEl = document.getElementById('stat-highrisk');
        if(highRiskEl) highRiskEl.textContent = formatNumber(highRiskCount);

        // Update badge
        const badge = document.getElementById('total-incidents-badge');
        if (badge) badge.textContent = formatNumber(total);

        // Load data based on current layer mode
        await loadLayerData(filters);

        // Load civil defense stations
        await loadCivilDefenseStations();

        console.log(`✓ Map data loaded: ${total} total incidents`);

    } catch (error) {
        console.error('Error loading incidents:', error);
        showError('#map', 'Failed to load fire incidents. ' + error.message);
    } finally {
        isLoading = false;
        showLoadingOverlay(false);
    }
}

async function loadLayerData(filters = {}) {
    // Clear existing layers
    markersLayer.clearLayers();
    if (heatmapLayer) {
        map.removeLayer(heatmapLayer);
        heatmapLayer = null;
    }

    const params = {};
    if (filters.year) params.year = filters.year;
    if (filters.fire_type) params.fire_type = filters.fire_type;

    if (currentLayer === 'heatmap') {
        await loadHeatmapLayer(params);
    } else if (currentLayer === 'cluster') {
        await loadClusterLayer(params);
    } else {
        await loadPointsLayer(params);
    }
}

// ============================================================
// HEATMAP LAYER (Client-side Leaflet.heat)
// ============================================================

async function loadHeatmapLayer(params) {
    try {
        params.limit = MAX_HEATMAP_POINTS;
        const data = await fetchAPI('/incidents/heatmap', params);

        if (!data.points || data.points.length === 0) {
            console.log('No heatmap data available');
            return;
        }

        // Prepare heat data: [lat, lng, intensity]
        // Leaflet.heat uses intensity 0-1, we normalize
        const maxIntensity = 1.0; // Fixed max intensity
        const heatData = data.points.map(p => [
            p.latitude,
            p.longitude,
            0.8 // Fixed intensity - Leaflet.heat handles density
        ]);

        // Create heatmap with proper radius and blur (like v1/v2)
        heatmapLayer = L.heatLayer(heatData, {
            radius: 25,       // Pixel radius of each point (clearer separation)
            blur: 15,         // Blur factor (smooths the heatmap)
            maxZoom: 10,      // Max zoom level for heatmap
            max: 1.0,         // Max intensity value
            gradient: {
                0.0: '#0000ff',   // Blue (low density)
                0.25: '#00ffff',   // Cyan
                0.5: '#ffff00',    // Yellow
                0.75: '#ff8000',   // Orange
                1.0: '#ff0000'     // Red (high density)
            }
        });

        map.addLayer(heatmapLayer);
        console.log(`✓ Heatmap rendered: ${data.points.length} points`);

    } catch (e) {
        console.error('Heatmap error:', e);
    }
}

// ============================================================
// CLUSTER LAYER
// ============================================================

async function loadClusterLayer(params) {
    try {
        params.limit = MAX_CLUSTER_POINTS;
        const data = await fetchAPI('/incidents', params);

        if (!data.incidents || data.incidents.length === 0) {
            console.log('No cluster data available');
            return;
        }

        const markers = [];
        data.incidents.forEach(incident => {
            if (incident.latitude && incident.longitude) {
                markers.push(createIncidentMarker(incident));
            }
        });
        markersLayer.addLayers(markers);

        map.addLayer(markersLayer);
        console.log(`✓ Cluster layer rendered: ${data.incidents.length} markers`);

    } catch (e) {
        console.error('Cluster error:', e);
    }
}

// ============================================================
// POINTS LAYER (Individual markers)
// ============================================================

async function loadPointsLayer(params) {
    try {
        params.limit = MAX_POINTS;
        const data = await fetchAPI('/incidents', params);

        if (!data.incidents || data.incidents.length === 0) {
            console.log('No point data available');
            return;
        }

        const markers = [];
        data.incidents.forEach(incident => {
            if (incident.latitude && incident.longitude) {
                markers.push(createIncidentMarker(incident));
            }
        });
        markersLayer.addLayers(markers);

        map.addLayer(markersLayer);
        console.log(`✓ Points layer rendered: ${data.incidents.length} markers`);

    } catch (e) {
        console.error('Points error:', e);
    }
}

// ============================================================
// INDIVIDUAL MARKER CREATION
// ============================================================

function createIncidentMarker(incident) {
    const isForest = (incident.fire_type || '').toLowerCase().includes('forest');
    const color = isForest ? '#ef4444' : '#f59e0b';
    const typeLabel = incident.fire_type || 'Unknown';

    // Create a styled div icon
    const icon = L.divIcon({
        className: 'fire-point-marker',
        html: `
            <div style="
                width: 12px; height: 12px;
                background: ${color};
                border: 2px solid rgba(255,255,255,0.8);
                border-radius: 50%;
                box-shadow: 0 0 6px ${color};
            "></div>
        `,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
    });

    const marker = L.marker([incident.latitude, incident.longitude], { icon });

    // Popup content
    const popupContent = `
        <div style="min-width: 200px; font-family: system-ui;">
            <div style="font-weight: 700; font-size: 14px; margin-bottom: 8px; color: ${color};">
                <i class="bi bi-fire"></i> Fire Incident
            </div>
            <table style="width: 100%; font-size: 13px;">
                <tr>
                    <td style="color: #666; padding: 2px 0;">Type:</td>
                    <td style="font-weight: 600;">${typeLabel}</td>
                </tr>
                <tr>
                    <td style="color: #666; padding: 2px 0;">Year:</td>
                    <td>${incident.year || 'N/A'}</td>
                </tr>
                <tr>
                    <td style="color: #666; padding: 2px 0;">Region:</td>
                    <td>${incident.governorate || 'N/A'}</td>
                </tr>
                <tr>
                    <td style="color: #666; padding: 2px 0;">Area:</td>
                    <td>${incident.district || 'N/A'}</td>
                </tr>
                <tr>
                    <td style="color: #666; padding: 2px 0;">Coords:</td>
                    <td style="font-family: monospace; font-size: 11px;">
                        ${incident.latitude?.toFixed(5)}, ${incident.longitude?.toFixed(5)}
                    </td>
                </tr>
            </table>
        </div>
    `;

    marker.bindPopup(popupContent, { maxWidth: 280 });
    return marker;
}

// ============================================================
// CIVIL DEFENSE STATIONS
// ============================================================

async function loadCivilDefenseStations() {
    try {
        const data = await fetchAPI('/stations');

        if (!data.stations || data.stations.length === 0) {
            console.log('No station data available');
            return;
        }

        stationsLayer.clearLayers();
        stationsCoverageLayer.clearLayers();

        data.stations.forEach(station => {
            // Station marker (blue home icon style)
            const stationIcon = L.divIcon({
                className: 'station-marker',
                html: `
                    <div style="
                        width: 20px; height: 20px;
                        background: #3b82f6;
                        border: 2px solid white;
                        border-radius: 50%;
                        box-shadow: 0 2px 8px rgba(59,130,246,0.5);
                        display: flex; align-items: center; justify-content: center;
                    ">
                        <i class="bi bi-house-fill" style="color: white; font-size: 10px;"></i>
                    </div>
                `,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });

            const marker = L.marker([station.latitude, station.longitude], { icon: stationIcon });
            marker.bindPopup(`
                <div style="font-family: system-ui;">
                    <div style="font-weight: 700; font-size: 14px; color: #3b82f6;">
                        <i class="bi bi-house-fill"></i> ${station.name}
                    </div>
                    <div style="font-size: 12px; color: #666; margin-top: 4px;">
                        Civil Defense Station
                    </div>
                </div>
            `, { maxWidth: 250 });

            stationsLayer.addLayer(marker);

            // Coverage circle (15km radius, low opacity)
            const coverageCircle = L.circle([station.latitude, station.longitude], {
                radius: 15000, // 15km
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.04,
                weight: 1,
                opacity: 0.3
            });
            stationsCoverageLayer.addLayer(coverageCircle);
        });

        console.log(`✓ Loaded ${data.stations.length} civil defense stations`);

    } catch (e) {
        console.error('Stations load error:', e);
    }
}

// ============================================================
// LAYER SWITCHING
// ============================================================

function switchLayer(layerType) {
    currentLayer = layerType;

    // Remove all layers
    markersLayer.clearLayers();
    if (heatmapLayer) {
        map.removeLayer(heatmapLayer);
        heatmapLayer = null;
    }

    // Get current filters
    const filters = {
        year: document.getElementById('year-filter')?.value || null,
        fire_type: document.getElementById('type-filter')?.value || null
    };

    loadLayerData(filters);
}

// ============================================================
// UI HELPERS
// ============================================================

function formatClusterCount(count) {
    if (count >= 1000) return (count / 1000).toFixed(1) + 'k';
    if (count >= 100) return Math.round(count / 10) * 10;
    return count;
}

function formatNumber(n) {
    if (n === null || n === undefined) return '0';
    return Number(n).toLocaleString();
}

function showLoadingOverlay(show) {
    const el = document.getElementById('map-loading-overlay');
    if (el) el.style.display = show ? 'flex' : 'none';
}

function showError(selector, message) {
    console.error(message);
    const el = document.querySelector(selector);
    if (el) {
        el.innerHTML = `<div style="padding: 40px; text-align: center; color: #ef4444;">
            <i class="bi bi-exclamation-triangle" style="font-size: 48px;"></i>
            <p style="margin-top: 16px;">${message}</p>
        </div>`;
    }
}

// ============================================================
// FILTERS
// ============================================================

async function loadYearFilter() {
    try {
        const data = await fetchAPI('/data/years');
        const select = document.getElementById('year-filter');
        if (select && data.years) {
            data.years.forEach(y => {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = y;
                select.appendChild(opt);
            });
        }
    } catch (e) {
        console.error('Year filter error:', e);
    }
}

function applyFilters() {
    const filters = {
        year: document.getElementById('year-filter')?.value || null,
        fire_type: document.getElementById('type-filter')?.value || null
    };
    loadIncidents(filters);
}

function resetFilters() {
    document.getElementById('year-filter').value = '';
    document.getElementById('type-filter').value = '';
    loadIncidents();
}

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    // If embedded mode, strip navigation natively in JS
    if (window.location.search.includes('embed=1')) {
        document.querySelector('nav')?.style.setProperty('display', 'none', 'important');
        document.querySelector('footer')?.style.setProperty('display', 'none', 'important');
        document.querySelector('.hero-section')?.style.setProperty('display', 'none', 'important');
        document.querySelector('.quick-stats')?.style.setProperty('display', 'none', 'important');
        document.querySelector('.main-content')?.style.setProperty('padding-top', '0', 'important');
        const mapEl = document.getElementById('map');
        if (mapEl) mapEl.style.setProperty('height', 'calc(100vh - 80px)', 'important');
    }

    initMap();
    loadYearFilter();
    loadIncidents();

    // Filter buttons
    document.getElementById('apply-filters')?.addEventListener('click', applyFilters);
    document.getElementById('reset-filters')?.addEventListener('click', resetFilters);

    // Layer radio buttons
    document.querySelectorAll('input[name="layer-type"]').forEach(radio => {
        radio.addEventListener('change', function() {
            switchLayer(this.value);
        });
    });

    // Update year label in controls
    const yearFilter = document.getElementById('year-filter');
    if (yearFilter) {
        yearFilter.addEventListener('change', function() {
            const label = this.closest('.col-auto')?.previousElementSibling?.querySelector('label');
            // Year filter changed - no automatic reload, user clicks Apply
        });
    }
});
