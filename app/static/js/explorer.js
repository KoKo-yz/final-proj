/**
 * Interactive Fire Incident Explorer — v3
 * Supports: year + region + subtype filters, stats strip, sampling notice,
 * per-subtype color coding, rich popups.
 */

let explorerMap = null;
let explorerMarkersLayer = null;
let explorerInitialized = false;

const EXPLORER_CENTER = [31.5, 36.5];
const EXPLORER_ZOOM = 7;
const MAX_EXPLORER_POINTS = 1200;

// ── Color map: Arabic subtype → hex color ────────────────────────────────────
// Also used for fire_type (Forest / Grassland) as fallback
const SUBTYPE_COLORS = {
    // Arabic subtypes (from subtype_arabic field)
    'حقول-وأعشاب': '#10b981',   // green  – Fields & Grass
    'اعشاب':       '#06b6d4',   // cyan   – Grass/Herbaceous
    'غابات-وأشجار': '#f59e0b',  // amber  – Forests & Trees
    'اشجار-حرجيه': '#ef4444',   // red    – Forest Trees
    'اشجار-مثمره': '#8b5cf6',   // purple – Fruit Trees
    // fire_type fallbacks
    'Forest':     '#f59e0b',
    'Grassland':  '#10b981',
};
const FIRE_COLOR_DEFAULT = '#3b82f6';

// ── Human-readable labels (Arabic → English) ─────────────────────────────────
const SUBTYPE_LABELS = {
    'حقول-وأعشاب': 'Fields & Grass',
    'اعشاب':       'Grass / Herbaceous',
    'غابات-وأشجار': 'Forests & Trees',
    'اشجار-حرجيه': 'Forest Trees',
    'اشجار-مثمره': 'Fruit Trees',
    'Forest':     'Forest Fire',
    'Grassland':  'Grassland Fire',
};

// ============================================================
// INIT MAP
// ============================================================

function initExplorerMap() {
    if (explorerMap) return;

    explorerMap = L.map('explorer-map', {
        center: EXPLORER_CENTER,
        zoom: EXPLORER_ZOOM,
        zoomControl: true,
        preferCanvas: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OSM &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(explorerMap);

    explorerMarkersLayer = L.layerGroup().addTo(explorerMap);
    explorerInitialized = true;
}

// ============================================================
// POPULATE DROPDOWNS
// ============================================================

async function populateExplorerFilters() {
    // Years 2018–2025
    const yearSel = document.getElementById('explorer-year');
    if (yearSel && yearSel.options.length <= 1) {
        for (let y = 2025; y >= 2018; y--) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            yearSel.appendChild(opt);
        }
    }

    // Regions from API
    try {
        const resp = await fetch('/api/statistics/governorates');
        const data = await resp.json();
        const regionSel = document.getElementById('explorer-region');
        if (regionSel && data.governorates && regionSel.options.length <= 1) {
            data.governorates.forEach(g => {
                if (!g.name) return;
                const opt = document.createElement('option');
                opt.value = g.name;
                opt.textContent = g.name;
                regionSel.appendChild(opt);
            });
        }
    } catch(e) {
        console.warn('Explorer: could not load regions', e);
    }
}

// ============================================================
// LOAD + RENDER INCIDENTS
// ============================================================

async function loadExplorerIncidents() {
    if (!explorerInitialized) initExplorerMap();

    const year      = document.getElementById('explorer-year')?.value  || '';
    const region    = document.getElementById('explorer-region')?.value || '';
    const subtype   = document.getElementById('explorer-subtype')?.value || '';
    const loading   = document.getElementById('explorer-loading');
    const countEl           = document.getElementById('explorer-count');
    const forestCountEl     = document.getElementById('explorer-forest-count');
    const grasslandCountEl  = document.getElementById('explorer-grassland-count');
    const displayedCountEl  = document.getElementById('explorer-displayed-count');
    const noticeEl          = document.getElementById('explorer-sample-notice');
    const sampleTextEl      = document.getElementById('explorer-sample-text');

    if (loading) loading.style.display = 'flex';

    try {
        let params = '';
        if (year)    params += `year=${year}&`;
        if (region)  params += `governorate=${encodeURIComponent(region)}&`;
        // Note: heatmap endpoint doesn't filter by subtype – we filter client-side
        // for subtype since the API returns all points with fire_type info.
        // We fetch the full limit to ensure we have enough after subtype filtering.

        const resp = await fetch(`/api/incidents/heatmap?${params}limit=5000`);
        const json = await resp.json();

        let points = json.points || [];
        const totalRaw = json.total_available || points.length;

        // Client-side subtype filter
        // The API returns fire_type (Forest/Grassland). We also get subtype_arabic
        // via the incidents endpoint, but for performance we colour by fire_type here.
        // If a subtype filter is chosen, map to fire_type:
        const FOREST_SUBTYPES  = ['غابات-وأشجار', 'اشجار-حرجيه', 'اشجار-مثمره'];
        const GRASS_SUBTYPES   = ['حقول-وأعشاب', 'اعشاب'];
        if (subtype) {
            const targetType = FOREST_SUBTYPES.includes(subtype) ? 'Forest' : 'Grassland';
            points = points.filter(p => p.fire_type === targetType);
        }

        const totalFiltered = points.length;

        // Count by type
        let forestCount    = points.filter(p => p.fire_type === 'Forest').length;
        let grasslandCount = points.filter(p => p.fire_type === 'Grassland').length;

        // Sample for rendering
        const isSampled     = totalFiltered > MAX_EXPLORER_POINTS;
        const displayPoints = isSampled ? sampleArray(points, MAX_EXPLORER_POINTS) : points;

        // Update stat cards
        if (countEl)          countEl.textContent          = totalFiltered.toLocaleString();
        if (forestCountEl)    forestCountEl.textContent    = forestCount.toLocaleString();
        if (grasslandCountEl) grasslandCountEl.textContent = grasslandCount.toLocaleString();
        if (displayedCountEl) displayedCountEl.textContent = displayPoints.length.toLocaleString();

        // Sample notice
        if (noticeEl) {
            if (isSampled) {
                noticeEl.classList.remove('d-none');
                if (sampleTextEl) sampleTextEl.textContent =
                    `Displaying ${MAX_EXPLORER_POINTS.toLocaleString()} of ${totalFiltered.toLocaleString()} matched incidents — zoom in for detail.`;
            } else {
                noticeEl.classList.add('d-none');
            }
        }

        // Clear map
        explorerMarkersLayer.clearLayers();

        // Determine active subtype color (if filtering by subtype, use its specific color)
        const subtypeColor = subtype ? (SUBTYPE_COLORS[subtype] || FIRE_COLOR_DEFAULT) : null;

        // Plot markers
        displayPoints.forEach(pt => {
            if (!pt.latitude || !pt.longitude) return;

            // Use subtype color if filtering, otherwise use fire_type color
            const color = subtypeColor || SUBTYPE_COLORS[pt.fire_type] || FIRE_COLOR_DEFAULT;
            const typeLabel = SUBTYPE_LABELS[pt.fire_type] || pt.fire_type || 'Unknown';

            const circle = L.circleMarker([pt.latitude, pt.longitude], {
                radius: 5,
                fillColor: color,
                color: 'rgba(255,255,255,0.5)',
                weight: 0.6,
                opacity: 0.95,
                fillOpacity: 0.85
            });

            circle.bindPopup(`
                <div style="font-family:'Inter',sans-serif; min-width:180px; padding:4px 0;">
                    <div style="font-size:1em; font-weight:700; margin-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.15); padding-bottom:6px;">
                        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};margin-right:6px;"></span>
                        ${typeLabel}
                    </div>
                    <div style="color:#94a3b8; font-size:.82em; line-height:1.8;">
                        <div>📅 <strong style="color:#e2e8f0;">Year:</strong> ${pt.year || '—'}</div>
                        <div>📍 <strong style="color:#e2e8f0;">Lat:</strong> ${parseFloat(pt.latitude).toFixed(5)}</div>
                        <div>📍 <strong style="color:#e2e8f0;">Lon:</strong> ${parseFloat(pt.longitude).toFixed(5)}</div>
                        ${pt.fire_type ? `<div>🔥 <strong style="color:#e2e8f0;">Category:</strong> ${pt.fire_type}</div>` : ''}
                    </div>
                </div>
            `, { maxWidth: 220 });

            explorerMarkersLayer.addLayer(circle);
        });

        // Auto-fit map to markers if we have points
        if (displayPoints.length > 0 && (year || region || subtype)) {
            try {
                const validPoints = displayPoints.filter(p => p.latitude && p.longitude);
                if (validPoints.length > 0) {
                    const lats = validPoints.map(p => p.latitude);
                    const lons = validPoints.map(p => p.longitude);
                    explorerMap.fitBounds([
                        [Math.min(...lats), Math.min(...lons)],
                        [Math.max(...lats), Math.max(...lons)]
                    ], { padding: [40, 40], maxZoom: 12 });
                }
            } catch(e) { /* ignore fitBounds errors */ }
        }

    } catch(err) {
        console.error('Explorer load error:', err);
        if (countEl) countEl.textContent = 'Error';
    } finally {
        if (loading) loading.style.display = 'none';
    }
}

// ============================================================
// HELPERS
// ============================================================

function sampleArray(arr, n) {
    if (arr.length <= n) return arr;
    const result = [];
    const step = arr.length / n;
    for (let i = 0; i < n; i++) {
        result.push(arr[Math.floor(i * step)]);
    }
    return result;
}

// ============================================================
// LAZY INIT — activate when tab is clicked
// ============================================================

document.addEventListener('DOMContentLoaded', function () {
    const explorerTab = document.querySelector('[data-bs-target="#content-explorer"]');
    if (explorerTab) {
        explorerTab.addEventListener('shown.bs.tab', function () {
            if (!explorerInitialized) {
                initExplorerMap();
                populateExplorerFilters();
                loadExplorerIncidents();
            }
        });
    }

    document.getElementById('explorer-apply')?.addEventListener('click', loadExplorerIncidents);
});
