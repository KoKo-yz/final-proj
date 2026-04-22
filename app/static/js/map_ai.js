/**
 * Streamlit Clone - AI Autonomous Station Placement Map
 */

let map;
let heatmapLayer;
let realStationsLayer;
let aiStationsLayer;
let isLoading = false;

const JORDAN_CENTER = [31.0, 36.5];
const JORDAN_ZOOM = 7;
const JORDAN_BOUNDS = [[29.2, 34.9], [33.4, 39.3]];
const MAX_HEATMAP_POINTS = 12000;

function initMap() {
    map = L.map('map', {
        center: JORDAN_CENTER,
        zoom: JORDAN_ZOOM,
        zoomControl: false,
        preferCanvas: true
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    map.fitBounds(JORDAN_BOUNDS, { padding: [20, 20] });

    // Dark basemap
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OSM &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    realStationsLayer = L.layerGroup();
    aiStationsLayer = L.layerGroup();
    map.addLayer(realStationsLayer);
    map.addLayer(aiStationsLayer);
}



function formatNumber(n) {
    if (n === null || n === undefined) return '0';
    return Number(n).toLocaleString();
}

async function loadData() {
    if(isLoading) return;
    isLoading = true;
    document.getElementById('map-loading-overlay').style.display = 'flex';

    try {
        const radiusKm = parseFloat(document.getElementById('coverage-radius').value) || 15.0;
        const radiusMeters = radiusKm * 1000;
        const aiCount = parseInt(document.getElementById('ai-count-slider').value) || 15;
        const fireType = document.getElementById('fire-category-filter').value;
        const showReal = document.getElementById('show-real-stations').checked;
        const showAi = document.getElementById('show-ai-stations').checked;

        // 1. Update Stats Headers
        document.getElementById('stat-ai-stations').textContent = aiCount;
        document.getElementById('stat-coverage-radius').textContent = radiusKm.toFixed(1) + ' km';

        // 2. Load Heatmap
        if(heatmapLayer) {
            map.removeLayer(heatmapLayer);
            heatmapLayer = null;
        }

        const heatParams = { limit: MAX_HEATMAP_POINTS };
        if (fireType) heatParams.fire_type = fireType;
        
        let overviewP = fetchAPI('/statistics/overview');
        let heatmapP = fetchAPI('/incidents/heatmap', heatParams);
        let stationsP = fetchAPI('/stations');
        
        let kmeansParams = { n_clusters: aiCount };
        if (fireType) kmeansParams.fire_type = fireType;
        let kmeansP = fetchAPI('/kmeans/hotspots', kmeansParams);

        const [overview, heatmapData, stationsData, kmeansData] = await Promise.all([
            overviewP, heatmapP, stationsP, kmeansP
        ].map(p => p.catch(e => { console.error('Fetch error:', e); return null; })));

        // Update Total
        if(fireType && heatmapData && heatmapData.total_available !== undefined) {
             // If filtered, show exactly how many incidents of this type exist in the DB
             document.getElementById('stat-active-reports').textContent = formatNumber(heatmapData.total_available);
        } else if (overview && overview.total_incidents) {
            document.getElementById('stat-active-reports').textContent = formatNumber(overview.total_incidents);
        } else if (heatmapData && heatmapData.returned) {
             document.getElementById('stat-active-reports').textContent = formatNumber(heatmapData.returned) + "+";
        }

        // Draw Heatmap (matches Foliun HeatMap radius 9, blur 13)
        if(heatmapData && heatmapData.points) {
            const heatData = heatmapData.points.map(p => [p.latitude, p.longitude, 1.0]);
            heatmapLayer = L.heatLayer(heatData, {
                radius: 12, blur: 15, maxZoom: 10
            });
            map.addLayer(heatmapLayer);
        }

        // Draw Real Stations
        realStationsLayer.clearLayers();
        if(showReal && stationsData && stationsData.stations) {
            document.getElementById('stat-real-stations').textContent = stationsData.stations.length;
            stationsData.stations.forEach(st => {
                const icon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div style='background-color:#2a82cb; width:24px; height:24px; border-radius:50%; border:2px solid white; display:flex; justify-content:center; align-items:center; box-shadow:0 0 4px rgba(0,0,0,0.5);'><i class='bi bi-house-door-fill' style='color:white; font-size:12px;'></i></div>`,
                    iconSize:[24,24], iconAnchor:[12,12]
                });
                const marker = L.marker([st.latitude, st.longitude], {icon});
                marker.bindPopup(`<strong>🏢 ${st.name || 'Official CD Station'}</strong><br>Existing Official CD Station`);
                realStationsLayer.addLayer(marker);

                // We only do coverage rings for AI stations in the streamlit code? 
                // Ah, wait, Streamlit code didn't actually add circles for Real Stations! 
                // Wait, looking at the repo code: it ONLY added folium.Circle to ai_grp.
            });
        } else {
            document.getElementById('stat-real-stations').textContent = showReal ? '0' : '-';
        }

        // Draw AI Stations
        aiStationsLayer.clearLayers();
        if(showAi && kmeansData && kmeansData.hotspots) {
            kmeansData.hotspots.forEach((hs, idx) => {
                const icon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div style='background-color:#d72b3f; width:24px; height:24px; border-radius:50%; border:2px solid white; display:flex; justify-content:center; align-items:center; box-shadow:0 0 6px rgba(215,43,63,0.8);'><i class='bi bi-lightning-fill' style='color:white; font-size:14px;'></i></div>`,
                    iconSize:[24,24], iconAnchor:[12,12]
                });
                const marker = L.marker([hs.center_latitude, hs.center_longitude], {icon});
                marker.bindPopup(`<strong>⚡ AI Station Alpha-${idx+1}</strong><br>Jurisdiction: ${radiusKm}km`);
                aiStationsLayer.addLayer(marker);

                const circle = L.circle([hs.center_latitude, hs.center_longitude], {
                    radius: radiusMeters,
                    color: '#00FF88', fillColor: '#00FF88', fillOpacity: 0.08, weight: 1, opacity: 1.0
                });
                aiStationsLayer.addLayer(circle);
            });
        }

    } catch(e) {
        console.error("Map Data Error:", e);
    } finally {
        isLoading = false;
        document.getElementById('map-loading-overlay').style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // If embedded mode, strip navigation natively in JS for bulletproof results
    if (window.location.search.includes('embed=1')) {
        document.querySelector('nav')?.style.setProperty('display', 'none', 'important');
        document.querySelector('footer')?.style.setProperty('display', 'none', 'important');
        document.querySelector('.main-content')?.style.setProperty('padding-top', '0', 'important');
        document.getElementById('map-wrapper-card')?.style.setProperty('height', 'calc(100vh - 100px)', 'important');
    }

    initMap();
    loadData();

    document.getElementById('apply-ai-filters')?.addEventListener('click', loadData);
    
    document.getElementById('show-real-stations')?.addEventListener('change', loadData);
    document.getElementById('show-ai-stations')?.addEventListener('change', loadData);
});
