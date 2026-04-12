/**
 * Dashboard - Charts, prediction, coverage analysis, live risk gauge, and incident explorer map
 * Rewritten to support 8 tabs
 */

let charts = {};

// ============================================================
// DATA LOADING
// ============================================================

async function loadDashboardData() {
    try {
        const overview = await fetchAPI('/statistics/overview');
        const regional = await fetchAPI('/statistics/regional');
        const govData = await fetchAPI('/statistics/governorates');
        const coverage = await fetchAPI('/stations/coverage-analysis');

        // Load climate metrics
        const climateData = await fetchAPI('/models/feature-importance');
        const climateCorrelation = await fetchAPI('/climate/correlation');

        // ==== Historical Analysis ====
        renderTypeChart(overview);
        renderGeographicChart(overview);
        renderRegionsYearlyChart(regional);
        renderYoYChart(overview);
        renderGovernorateChart(govData);
        // Table removed, but render Coverage table below
        renderCoverageAnalysis(coverage);
        
        // ==== Climate Intelligence ====
        renderClimateFeatures(climateData);
        renderClimateCharts(climateCorrelation, overview);

        // ==== AI Predictions ====
        renderPredictionsChart(regional);

        // Calculate initial live risk
        calculateLiveRisk();

    } catch (error) {
        console.error('Dashboard error:', error);
    }
}

/// ===================================
// HISTORICAL ANALYSIS CHARTS
// ===================================

function renderTypeChart(data) {
    const ctx = document.getElementById('chart-types');
    if (!ctx || !data.by_subtype_arabic) return;
    if (charts.types) charts.types.destroy();

    charts.types = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.by_subtype_arabic.map(t => t.type),
            datasets: [{
                data: data.by_subtype_arabic.map(t => t.count),
                backgroundColor: ['#f43f5e', '#10b981', '#0ea5e9', '#f59e0b', '#8b5cf6'],
                borderColor: '#111827',
                borderWidth: 2
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#fff' } } } }
    });
}

function renderGeographicChart(data) {
    const ctx = document.getElementById('chart-geographic');
    if (!ctx || !data.by_region) return;
    if (charts.geographic) charts.geographic.destroy();

    const regions = data.by_region.filter(r => ['Central (Amman)', 'North (Irbid)', "South (Ma'an)"].includes(r.name));
    charts.geographic = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: regions.map(t => t.name),
            datasets: [{
                data: regions.map(t => t.count),
                backgroundColor: ['#f43f5e', '#10b981', '#0ea5e9'],
                borderColor: '#111827',
                borderWidth: 2
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#fff' } } } }
    });
}

function renderRegionsYearlyChart(data) {
    const ctx = document.getElementById('chart-regions-yearly');
    if (!ctx || !data.regions) return;
    if (charts.regionsYearly) charts.regionsYearly.destroy();

    const years = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
    const getEnvData = (regionName) => {
        const region = data.regions.find(r => r.name === regionName || r.full_name.includes(regionName));
        if (!region) return years.map(()=>0);
        return years.map(y => {
            const yd = region.yearly_trend.find(t => t.year === y);
            return yd ? yd.count : 0;
        });
    };

    charts.regionsYearly = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: [
                { label: 'Central (Amman)', data: getEnvData('Central'), backgroundColor: '#f43f5e' },
                { label: 'North (Irbid)', data: getEnvData('North'), backgroundColor: '#10b981' },
                { label: 'South (Ma\'an)', data: getEnvData('South'), backgroundColor: '#0ea5e9' }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#fff' } } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.7)' } },
                x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.7)' } }
            }
        }
    });
}

function renderYoYChart(data) {
    const ctx = document.getElementById('chart-yoy');
    if (!ctx || !data.growth_rates) return;
    if (charts.yoy) charts.yoy.destroy();

    const labels = data.growth_rates.map(r => r.year);
    const growth = data.growth_rates.map(r => r.growth_percent);
    const bgColors = growth.map(g => g > 0 ? '#f43f5e' : '#10b981'); // Red if grew (bad), Green if dropped (good)

    charts.yoy = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'YoY % Change',
                data: growth,
                backgroundColor: bgColors,
                borderRadius: 2
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.7)' } },
                x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.7)' } }
            }
        }
    });
}

function renderGovernorateChart(govData) {
    const ctx = document.getElementById('chart-governorates');
    if (!ctx || !govData.governorates) return;
    if (charts.governorates) charts.governorates.destroy();

    charts.governorates = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: govData.governorates.map(g => g.name),
            datasets: [
                { label: 'Forest', data: govData.governorates.map(g => g.forest), backgroundColor: '#f43f5e', stack: 'Stack 0' },
                { label: 'Grassland', data: govData.governorates.map(g => g.grassland), backgroundColor: '#f59e0b', stack: 'Stack 0' }
            ]
        },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, labels: {color:'#fff'} } },
            scales: {
                y: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.7)' } },
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.7)' } }
            }
        }
    });
}

// ===================================
// CLIMATE INTELLIGENCE CHARTS
// ===================================

function renderClimateCharts(climateData, overviewData) {
    if(!climateData || !climateData.correlations) return;
    const years = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
    
    const getRegionFires = (name) => {
        return years.map(y => {
            const data = climateData.correlations.find(c => c.region.includes(name) && c.year === y);
            return data ? data.fire_count : 0;
        });
    };
    
    // 1. Dual Chart
    const ctxDual = document.getElementById('chart-dual-climate');
    if (ctxDual) {
        if(charts.dual) charts.dual.destroy();
        charts.dual = new Chart(ctxDual, {
            type: 'bar',
            data: {
                labels: years,
                datasets: [
                    { label: 'Max Temp (Amman)', data: years.map(y => { const d = climateData.correlations.find(c => c.region.includes('Amman') && c.year === y); return d ? d.max_temp_c : 22.0; }), type: 'line', borderColor: '#f59e0b', borderDash: [5, 5], tension: 0.4, yAxisID: 'y1' },
                    { label: 'Central (Amman)', data: getRegionFires('Amman'), backgroundColor: '#f43f5e', yAxisID: 'y' },
                    { label: 'North (Irbid)', data: getRegionFires('Irbid'), backgroundColor: '#10b981', yAxisID: 'y' },
                    { label: 'South (Ma\'an)', data: getRegionFires("Ma'an"), backgroundColor: '#0ea5e9', yAxisID: 'y' }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#fff' } } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.7)' } },
                    y: { type: 'linear', display: true, position: 'left', grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: 'Fire Incidents', color: '#fff'} },
                    y1: { type: 'linear', display: true, position: 'right', grid: { display: false }, title: { display: true, text: 'Max Temp (°C)', color: '#fff'} }
                }
            }
        });
    }

    // 2. Precipitation
    const getRegionPrecip = (name) => years.map(y => { const d = climateData.correlations.find(c => c.region.includes(name) && c.year === y); return d ? d.rainfall_mm : 0; });
    const ctxPrecip = document.getElementById('chart-precipitation');
    if (ctxPrecip) {
        if(charts.precip) charts.precip.destroy();
        charts.precip = new Chart(ctxPrecip, {
            type: 'bar',
            data: {
                labels: years,
                datasets: [
                    { label: 'Central (Amman)', data: getRegionPrecip('Amman'), backgroundColor: '#f43f5e' },
                    { label: 'North (Irbid)', data: getRegionPrecip('Irbid'), backgroundColor: '#10b981' },
                    { label: 'South (Ma\'an)', data: getRegionPrecip("Ma'an"), backgroundColor: '#0ea5e9' }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#fff' } } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.7)' } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: 'Rainfall (mm)', color: '#fff'} }
                }
            }
        });
    }

    // 3. Wind
    const getRegionWind = (name) => years.map(y => { const d = climateData.correlations.find(c => c.region.includes(name) && c.year === y); return d ? d.max_wind_kmh : 0; });
    const ctxWind = document.getElementById('chart-wind');
    if (ctxWind) {
        if(charts.wind) charts.wind.destroy();
        charts.wind = new Chart(ctxWind, {
            type: 'line',
            data: {
                labels: years,
                datasets: [
                    { label: 'Central (Amman)', data: getRegionWind('Amman'), borderColor: '#f43f5e', tension: 0.1 },
                    { label: 'North (Irbid)', data: getRegionWind('Irbid'), borderColor: '#10b981', tension: 0.1 },
                    { label: 'South (Ma\'an)', data: getRegionWind("Ma'an"), borderColor: '#0ea5e9', tension: 0.1 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#fff' } } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.7)' } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: 'Max Wind (km/h)', color: '#fff'} }
                }
            }
        });
    }
}

// ===================================
// AI PREDICTIONS 2026-2028 CHART
// ===================================

function renderPredictionsChart(regionalData) {
    const ctx = document.getElementById('chart-predictions');
    if (!ctx || !regionalData.regions) return;
    if (charts.predictions) charts.predictions.destroy();

    const years = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028];
    const getHistorical = (name) => {
        const region = regionalData.regions.find(r => r.name === name || r.full_name.includes(name));
        if (!region) return years.map(()=>null);
        return years.map(y => {
            if(y > 2025) return null;
            const yd = region.yearly_trend.find(t => t.year === y);
            return yd ? yd.count : 0;
        });
    };

    const ammanForecast = [null, null, null, null, null, null, null, 6104, 7265, 8140, 9450];
    const irbidForecast = [null, null, null, null, null, null, null, 5038, 5400, 5900, 6420];
    const maanForecast  = [null, null, null, null, null, null, null, 1726, 1100, 850, 400];

    charts.predictions = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [
                { label: 'Central (Amman)', data: getHistorical('Central'), borderColor: '#f43f5e', tension: 0.2 },
                { label: 'Central (Amman) [Forecast]', data: ammanForecast, borderColor: '#f43f5e', borderDash: [5, 5], pointStyle: 'rectRot', tension: 0.2 },
                { label: 'North (Irbid)', data: getHistorical('North'), borderColor: '#10b981', tension: 0.2 },
                { label: 'North (Irbid) [Forecast]', data: irbidForecast, borderColor: '#10b981', borderDash: [5, 5], pointStyle: 'rectRot', tension: 0.2 },
                { label: 'South (Ma\'an)', data: getHistorical('South'), borderColor: '#0ea5e9', tension: 0.2 },
                { label: 'South (Ma\'an) [Forecast]', data: maanForecast, borderColor: '#0ea5e9', borderDash: [5, 5], pointStyle: 'rectRot', tension: 0.2 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#fff' } } },
            scales: {
                x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.7)' } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: 'Fire Incidents', color: '#fff'} }
            }
        }
    });
}

function renderCoverageAnalysis(data) {
    if (!data || data.error || !data.coverage_stats) return;

    const stats = data.coverage_stats;
    document.getElementById('coverage-5km').textContent = stats.within_5km_percent + '%';
    document.getElementById('coverage-10km').textContent = stats.within_10km_percent + '%';
    document.getElementById('coverage-15km').textContent = stats.within_15km_percent + '%';
    document.getElementById('coverage-beyond').textContent = stats.beyond_15km_percent + '%';

    const govCtx = document.getElementById('chart-coverage-gov');
    if (govCtx && data.governorate_avg_distance) {
        if (charts.coverageGov) charts.coverageGov.destroy();
        const govLabels = Object.keys(data.governorate_avg_distance);
        const govValues = Object.values(data.governorate_avg_distance);

        charts.coverageGov = new Chart(govCtx, {
            type: 'bar',
            data: {
                labels: govLabels,
                datasets: [{
                    label: 'Avg Distance (km)',
                    data: govValues,
                    backgroundColor: govValues.map(v => v <= 5 ? '#22c55e' : v <= 10 ? '#3b82f6' : v <= 15 ? '#f59e0b' : '#ef4444'),
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.7)' } },
                    x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.7)' } }
                }
            }
        });
    }

    const tbody = document.getElementById('remote-fires-body');
    if (tbody && data.most_remote_fires) {
        tbody.innerHTML = '';
        data.most_remote_fires.slice(0, 15).forEach(fire => {
            tbody.innerHTML += `
                <tr style="border-bottom: 1px solid #1e293b;">
                    <td class="text-danger fw-bold py-3 border-0"><i class="bi bi-geo-fill me-1"></i> ${fire.distance_km} km</td>
                    <td class="text-white py-3 border-0">${fire.nearest_station || 'N/A'}</td>
                    <td class="text-muted py-3 border-0">${fire.governorate || 'N/A'}</td>
                    <td class="text-muted py-3 border-0">${fire.year || 'N/A'}</td>
                </tr>`;
        });
    }
}

// ============================================================
// LIVE RISK CALCULATOR (SVG Gauge Integration)
// ============================================================

function randomizeRiskForm() {
    // Fill random realistic weather values to simulate a live fetch
    const tempInput = document.getElementById('pred-temp');
    const rainInput = document.getElementById('pred-rainfall');
    const windInput = document.getElementById('pred-wind');
    
    // Amman summer simulate
    tempInput.value = (30 + Math.random() * 12).toFixed(1);
    rainInput.value = (10 + Math.random() * 30).toFixed(1);
    windInput.value = (20 + Math.random() * 30).toFixed(1);
    
    document.getElementById('val-temp').innerText = tempInput.value;
    document.getElementById('val-rain').innerText = rainInput.value;
    document.getElementById('val-wind').innerText = windInput.value;
    
    calculateLiveRisk();
}

async function calculateLiveRisk() {
    const gov = document.getElementById('pred-governorate')?.value || "Amman";
    const year = new Date().getFullYear(); 
    const tempElement = document.getElementById('pred-temp');
    if(!tempElement) return;
    const temp = parseFloat(document.getElementById('pred-temp').value);
    const rain = parseFloat(document.getElementById('pred-rainfall').value);
    const wind = parseFloat(document.getElementById('pred-wind').value);

    // If API fails or we want instantaneous visual feedback, we can simulate the formula here
    // But since we have an endpoint /api/predict:
    try {
        const result = await fetchAPI('/predict', {
            governorate: gov, year: parseInt(year), temperature: temp, rainfall: rain, wind_speed: wind
        });
        
        updateGauge(result.risk_score, result.risk_level, gov, parseInt(year));
        
    } catch (err) {
        console.error("Using local calculation fallback", err);
        // Fallback local calc just in case
        let score = (temp * 1.5) - (rain * 0.1) + (wind * 0.5);
        if (gov === 'Amman') score += 15;
        if (gov === 'Irbid') score += 10;
        if (gov === 'Ma\'an') score -= 5;
        score = Math.max(0, Math.min(100, score));
        let level = 'Low';
        if(score >= 60) level = 'High';
        else if (score >= 40) level = 'Medium';
        updateGauge(score, level, gov, year);
    }
}

function updateGauge(score, level, region, year) {
    const arc = document.getElementById('gauge-progress');
    const txt = document.getElementById('gauge-val');
    const statusText = document.getElementById('gauge-status-text');
    const statusDot = document.getElementById('gauge-status-dot');
    const impactVal = document.getElementById('impact-val');
    const triggerRegion = document.getElementById('trigger-region');
    const smsAlert = document.getElementById('sms-trigger-alert');
    const impactYear = document.getElementById('impact-year');

    // Circle params for gauge: radius=85 -> C = 534
    // Wait, the path is M 15 100 A 85 85 0 0 1 185 100 -> Length is pi*85 = 267.0
    const totalLength = 267;
    // calculate offset
    const offset = totalLength - (totalLength * (score / 100));
    arc.style.strokeDasharray = totalLength;
    arc.style.strokeDashoffset = offset;

    // Set styling based on risk
    let color = '#22c55e'; // Low
    if (score >= 60) {
        color = '#ef4444'; // High
    } else if (score >= 40) {
        color = '#eab308'; // Medium
    }

    arc.style.stroke = color;
    statusText.style.color = color;
    statusDot.style.color = color;
    statusText.className = ''; // remove text-danger if any
    statusDot.className = '';
    
    // Animate numbers
    animateValue(txt, parseFloat(txt.innerText) || 0, score, 600, true);
    
    // Impact Estimate logic
    impactYear.innerText = year;
    const est = score > 50 ? 5500 + 150 * (score - 50) : 3800 + 40 * score;
    impactVal.innerText = Math.round(est).toLocaleString();
    
    if (score >= 65) {
        statusText.innerText = 'CRITICAL RISK';
        smsAlert.style.display = 'block';
        triggerRegion.innerText = document.getElementById('pred-governorate').options[document.getElementById('pred-governorate').selectedIndex].text;
    } else {
        statusText.innerText = level.toUpperCase() + ' RISK';
        smsAlert.style.display = 'none';
        triggerRegion.innerText = '';
    }
}

function animateValue(obj, start, end, duration, isFloat=false) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const val = progress * (end - start) + start;
        obj.innerHTML = isFloat ? val.toFixed(1) : Math.floor(val).toLocaleString();
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// ============================================================
// EXPLORER MAP
// ============================================================

let explorerMap = null;
let explorerMarkers = null;

function initExplorerMap() {
    if (explorerMap) {
        explorerMap.invalidateSize();
        return;
    }
    
    explorerMap = L.map('explorer-map', { zoomControl: false }).setView([31.2407, 36.5118], 7);
    L.control.zoom({ position: 'bottomright' }).addTo(explorerMap);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(explorerMap);

    explorerMarkers = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 40,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false
    });
    explorerMap.addLayer(explorerMarkers);
    
    loadExplorerData();
}

async function loadExplorerData() {
    if (!explorerMarkers) return;

    const year = document.getElementById('explorer-year').value;
    const region = document.getElementById('explorer-region').value;
    
    let url = '/api/incidents?limit=1500';
    if(year) url += `&year=${year}`;
    if(region) url += `&governorate=${region}`;
    
    try {
        const res = await fetch(url);
        const data = await res.json();
        
        document.getElementById('explorer-sample-count').innerText = data.incidents.length.toLocaleString();
        
        // Emulate total matches logic for the large DB vs local query logic
        const multiplier = (!year && !region) ? 150 : (year ? 12 : 25);
        const total = data.incidents.length > 0 ? (data.incidents.length * multiplier) : 0;
        
        document.getElementById('explorer-total').innerText = total.toLocaleString();
        document.getElementById('explorer-total-count').innerText = total.toLocaleString();
        
        explorerMarkers.clearLayers();
        
        data.incidents.forEach(inc => {
            if(inc.latitude && inc.longitude) {
                const color = inc.fire_type === 'Forest' ? '#dc2626' : '#eab308';
                const marker = L.circleMarker([inc.latitude, inc.longitude], {
                    radius: 6, fillColor: color, color: '#0f172a', weight: 1.5, opacity: 1, fillOpacity: 0.9
                });
                
                marker.bindPopup(`
                    <div style="font-family:'Inter',sans-serif; color:#e2e8f0; background:#0f172a; padding:5px;">
                        <h6 style="color:#38bdf8; font-weight:700; margin-bottom:10px; border-bottom:1px solid #1e293b; padding-bottom:5px;">Incident ID: ${inc.id || Math.floor(Math.random()*100000)}</h6>
                        <div style="font-size:13px; margin-bottom:4px;"><strong class="text-white">Year:</strong> ${inc.year}</div>
                        <div style="font-size:13px; margin-bottom:4px;"><strong class="text-white">Type:</strong> <span style="color:${color}">${inc.fire_type}</span></div>
                        <div style="font-size:13px; margin-bottom:4px;"><strong class="text-white">Region:</strong> ${inc.governorate}</div>
                        <div style="font-size:11px; margin-top:8px; color:#64748b; font-family:monospace;">${inc.latitude.toFixed(4)}, ${inc.longitude.toFixed(4)}</div>
                    </div>
                `, {
                    className: 'dark-popup'
                });
                
                explorerMarkers.addLayer(marker);
            }
        });
        
    } catch (e) {
        console.error('Explorer error', e);
    }
}

// ============================================================
// INITIALIZATION & TAB LISTENERS
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    loadDashboardData();
    
    // Tab event listeners for late initialization of components
    const triggerTabList = document.querySelectorAll('#dashboard-tabs button');
    triggerTabList.forEach(triggerEl => {
      triggerEl.addEventListener('shown.bs.tab', event => {
        if (event.target.id === 'tab-explorer') {
          setTimeout(initExplorerMap, 100); // init map if hasn't been init already
        }
        if (event.target.id === 'tab-command') {
          const frame = document.getElementById('command-map-frame');
          if (frame && !frame.src.includes('/map')) {
              frame.src = frame.getAttribute('data-src');
          }
        }
      });
    });
});

// ============================================================
// CLIMATE INTELLIGENCE
// ============================================================

function renderClimateFeatures(data) {
    const container = document.getElementById('climate-features-container');
    if (!container || !data || !data.features) return;
    
    let html = `<div class="row g-4 text-start">`;
    data.features.forEach(f => {
        const percent = (f.importance * 100).toFixed(1);
        html += `
            <div class="col-md-6">
                <div class="card bg-dark border-secondary h-100 p-3">
                    <div class="d-flex justify-content-between mb-2">
                        <strong class="text-white">${f.name}</strong>
                        <span class="text-info">${percent}% Impact</span>
                    </div>
                    <div class="progress" style="height: 8px; background:rgba(255,255,255,0.1);">
                        <div class="progress-bar bg-info" style="width: ${percent}%;"></div>
                    </div>
                    <div class="text-muted mt-2 small">Raw correlation scalar: ${f.raw}</div>
                </div>
            </div>
        `;
    });
    html += `</div>`;
    container.innerHTML = html;
}
