/**
 * Dashboard - Charts, prediction, coverage analysis
 * Updated for yearly-only analysis with new features
 */

let charts = {};

// ============================================================
// DATA LOADING
// ============================================================

async function loadDashboardData() {
    try {
        // Load overview stats
        const overview = await fetchAPI('/statistics/overview');

        // Load regional comparison
        const regional = await fetchAPI('/statistics/regional');

        // Load governorate data
        const govData = await fetchAPI('/statistics/governorates');

        // Load coverage analysis
        const coverage = await fetchAPI('/stations/coverage-analysis');

        // Render all charts and tables
        renderYearChart(overview);
        renderRegionalChart(regional);
        renderTypeChart(overview);
        renderGovernorateChart(govData);
        renderGovernorateTable(govData);
        renderCoverageAnalysis(coverage);

    } catch (error) {
        console.error('Dashboard error:', error);
    }
}

// ============================================================
// CHART: Fire Trend by Year
// ============================================================

function renderYearChart(data) {
    const ctx = document.getElementById('chart-year');
    if (!ctx || !data.by_year) return;

    if (charts.year) charts.year.destroy();

    // Create gradient
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 350);
    gradient.addColorStop(0, 'rgba(220, 38, 38, 0.9)');
    gradient.addColorStop(1, 'rgba(245, 158, 11, 0.6)');

    // Build labels and data
    const labels = data.by_year.map(y => y.year);
    const counts = data.by_year.map(y => y.count);

    // Calculate growth annotations
    const growthRates = data.growth_rates || [];
    const growthMap = {};
    growthRates.forEach(g => { growthMap[g.year] = g.growth_percent; });

    charts.year = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Fire Incidents',
                data: counts,
                backgroundColor: gradient,
                borderColor: 'rgba(220, 38, 38, 1)',
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: { duration: 1500, easing: 'easeOutQuart' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(ctx) {
                            const count = ctx.parsed.y.toLocaleString();
                            const year = ctx.label;
                            const growth = growthMap[year];
                            if (growth !== undefined) {
                                const arrow = growth >= 0 ? '↑' : '↓';
                                return `${count} incidents (${arrow} ${Math.abs(growth)}% from prev year)`;
                            }
                            return `${count} incidents`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: {
                        callback: v => v.toLocaleString(),
                        font: { size: 11 }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 12, weight: '600' } }
                }
            }
        }
    });
}

// ============================================================
// CHART: Regional Comparison (North / Central / South)
// ============================================================

function renderRegionalChart(data) {
    const ctx = document.getElementById('chart-regions');
    if (!ctx || !data.regions) return;

    if (charts.regions) charts.regions.destroy();

    const regions = data.regions;
    const labels = regions.map(r => r.name);
    const forestData = regions.map(r => r.forest_fires);
    const grasslandData = regions.map(r => r.grassland_fires);

    charts.regions = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Forest Fires',
                    data: forestData,
                    backgroundColor: 'rgba(220, 38, 38, 0.8)',
                    borderColor: 'rgba(220, 38, 38, 1)',
                    borderWidth: 2,
                    borderRadius: 6
                },
                {
                    label: 'Grassland Fires',
                    data: grasslandData,
                    backgroundColor: 'rgba(245, 158, 11, 0.8)',
                    borderColor: 'rgba(245, 158, 11, 1)',
                    borderWidth: 2,
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: { duration: 1500, easing: 'easeOutQuart' },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { usePointStyle: true, padding: 15, font: { size: 12 } }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: { callback: v => v.toLocaleString(), font: { size: 11 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 13, weight: '600' } }
                }
            }
        }
    });
}

// ============================================================
// CHART: Fire Types Doughnut
// ============================================================

function renderTypeChart(data) {
    const ctx = document.getElementById('chart-types');
    if (!ctx || !data.by_type) return;

    if (charts.types) charts.types.destroy();

    charts.types = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.by_type.map(t => t.type),
            datasets: [{
                data: data.by_type.map(t => t.count),
                backgroundColor: [
                    'rgba(220, 38, 38, 0.85)',
                    'rgba(245, 158, 11, 0.85)'
                ],
                borderColor: '#fff',
                borderWidth: 3,
                hoverOffset: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '60%',
            animation: { animateRotate: true, animateScale: true, duration: 1500 },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 15, usePointStyle: true, pointStyle: 'circle', font: { size: 12 } }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(ctx) {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = ((ctx.parsed / total) * 100).toFixed(1);
                            return `${ctx.label}: ${ctx.parsed.toLocaleString()} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ============================================================
// CHART: Governorate Breakdown
// ============================================================

function renderGovernorateChart(govData) {
    const ctx = document.getElementById('chart-governorates');
    if (!ctx || !govData.governorates) return;

    if (charts.governorates) charts.governorates.destroy();

    const top10 = govData.governorates.slice(0, 10);

    charts.governorates = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: top10.map(g => g.name),
            datasets: [
                {
                    label: 'Forest Fires',
                    data: top10.map(g => g.forest),
                    backgroundColor: 'rgba(220,38,38,0.75)',
                    borderRadius: 4
                },
                {
                    label: 'Grassland Fires',
                    data: top10.map(g => g.grassland),
                    backgroundColor: 'rgba(245,158,11,0.75)',
                    borderRadius: 4
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            animation: { duration: 1500, easing: 'easeOutQuart' },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { usePointStyle: true, padding: 15 }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    stacked: true,
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                y: {
                    stacked: true,
                    grid: { display: false }
                }
            }
        }
    });
}

// ============================================================
// TABLE: Governorate Risk Summary
// ============================================================

function renderGovernorateTable(data) {
    const tbody = document.getElementById('gov-table-body');
    if (!tbody || !data.governorates) return;

    tbody.innerHTML = '';

    const maxCount = Math.max(...data.governorates.map(g => g.total), 1);

    data.governorates.forEach((gov, i) => {
        const riskLevel = gov.total > 100000 ? 'High' : gov.total > 50000 ? 'Medium' : 'Low';
        const riskClass = `risk-${riskLevel.toLowerCase()}`;
        const barWidth = (gov.total / maxCount * 100).toFixed(1);

        // Trend arrow
        let trendHtml = '<span class="text-muted">-</span>';
        if (gov.trend_percent !== undefined) {
            const trend = gov.trend_percent;
            const arrow = trend >= 0 ? '↑' : '↓';
            const color = trend >= 0 ? 'text-danger' : 'text-success';
            trendHtml = `<span class="${color} fw-semibold">${arrow} ${Math.abs(trend)}%</span>`;
        }

        tbody.innerHTML += `
            <tr class="reveal" style="animation-delay: ${i * 0.05}s">
                <td class="fw-bold text-muted">${i + 1}</td>
                <td>
                    <div class="fw-semibold">${gov.name}</div>
                    <div class="progress mt-1" style="height: 4px; width: 120px;">
                        <div class="progress-bar bg-danger" style="width: ${barWidth}%"></div>
                    </div>
                </td>
                <td class="text-center fw-bold">${gov.total.toLocaleString()}</td>
                <td class="text-center">${gov.forest?.toLocaleString() || 0}</td>
                <td class="text-center">${gov.grassland?.toLocaleString() || 0}</td>
                <td class="text-center">${trendHtml}</td>
                <td class="text-center">
                    <span class="risk-badge ${riskClass}">
                        <i class="bi bi-circle-fill" style="font-size: 7px;"></i> ${riskLevel}
                    </span>
                </td>
            </tr>`;
    });
}

// ============================================================
// COVERAGE ANALYSIS
// ============================================================

function renderCoverageAnalysis(data) {
    if (!data || data.error) {
        console.log('No coverage data available');
        return;
    }

    const stats = data.coverage_stats;
    if (!stats) return;

    // Update stat cards
    document.getElementById('coverage-5km').textContent = stats.within_5km_percent + '%';
    document.getElementById('coverage-10km').textContent = stats.within_10km_percent + '%';
    document.getElementById('coverage-15km').textContent = stats.within_15km_percent + '%';
    document.getElementById('coverage-beyond').textContent = stats.beyond_15km_percent + '%';

    // Render coverage by governorate chart
    const govCtx = document.getElementById('chart-coverage-gov');
    if (govCtx && data.governorate_avg_distance) {
        const govLabels = Object.keys(data.governorate_avg_distance);
        const govValues = Object.values(data.governorate_avg_distance);

        if (charts.coverageGov) charts.coverageGov.destroy();

        charts.coverageGov = new Chart(govCtx, {
            type: 'bar',
            data: {
                labels: govLabels,
                datasets: [{
                    label: 'Avg Distance (km)',
                    data: govValues,
                    backgroundColor: govValues.map(v => {
                        if (v <= 5) return 'rgba(34, 197, 94, 0.8)';
                        if (v <= 10) return 'rgba(59, 130, 246, 0.8)';
                        if (v <= 15) return 'rgba(245, 158, 11, 0.8)';
                        return 'rgba(220, 38, 38, 0.8)';
                    }),
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 1200 },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => `Avg distance: ${ctx.parsed.y} km`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Distance (km)' },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // Render remote fires table
    const tbody = document.getElementById('remote-fires-body');
    if (tbody && data.most_remote_fires) {
        tbody.innerHTML = '';
        data.most_remote_fires.slice(0, 10).forEach(fire => {
            tbody.innerHTML += `
                <tr>
                    <td class="text-danger fw-bold">${fire.distance_km} km</td>
                    <td><small>${fire.nearest_station || 'N/A'}</small></td>
                    <td>${fire.governorate || 'N/A'}</td>
                    <td>${fire.year || 'N/A'}</td>
                </tr>`;
        });
    }
}

// ============================================================
// PREDICTION FORM
// ============================================================

async function handlePrediction(e) {
    e.preventDefault();

    const gov = document.getElementById('pred-governorate').value;
    const year = document.getElementById('pred-year').value;
    const temp = document.getElementById('pred-temp').value;
    const rainfall = document.getElementById('pred-rainfall').value;
    const wind = document.getElementById('pred-wind').value;

    if (!gov) {
        alert('Please select a governorate');
        return;
    }

    const params = { governorate: gov };
    if (year) params.year = parseInt(year);
    if (temp) params.temperature = parseFloat(temp);
    if (rainfall) params.rainfall = parseFloat(rainfall);
    if (wind) params.wind_speed = parseFloat(wind);

    try {
        const result = await fetchAPI('/predict', params);
        displayResult(result);
    } catch (err) {
        console.error('Prediction error:', err);
        alert('Prediction failed. Please try again.');
    }
}

function displayResult(result) {
    const resultDiv = document.getElementById('prediction-result');
    const alertDiv = document.getElementById('result-alert');
    const riskLevel = document.getElementById('result-risk-level');
    const details = document.getElementById('result-details');
    const progress = document.getElementById('result-progress');
    const score = document.getElementById('result-score');

    const colors = {
        'Low': { bg: 'alert-success', color: '#16a34a', icon: 'bi-shield-check' },
        'Medium': { bg: 'alert-warning', color: '#d97706', icon: 'bi-exclamation-triangle' },
        'High': { bg: 'alert-danger', color: '#dc2626', icon: 'bi-fire' }
    };

    const c = colors[result.risk_level] || colors['Medium'];
    alertDiv.className = `alert ${c.bg}`;
    alertDiv.style.animation = 'scaleIn 0.4s ease-out';

    riskLevel.textContent = `${result.risk_level} Risk`;
    riskLevel.style.color = c.color;

    const yearText = result.year ? result.year : 'historical average';
    details.textContent = `Prediction for ${result.governorate} — ${yearText}`;

    progress.style.width = '0%';
    progress.style.backgroundColor = result.color;
    setTimeout(() => { progress.style.width = result.risk_score + '%'; }, 200);

    // Animate score counter
    animateCounterEl('result-score', Math.round(result.risk_score), '%');

    resultDiv.style.display = 'block';
}

function animateCounterEl(id, target, suffix = '') {
    const el = document.getElementById(id);
    if (!el) return;
    const start = parseInt(el.textContent.replace(/,/g, '')) || 0;
    const duration = 1000;
    const startTime = performance.now();
    function update(time) {
        const p = Math.min((time - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(start + (target - start) * eased).toLocaleString() + suffix;
        if (p < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    loadDashboardData();
    document.getElementById('prediction-form')?.addEventListener('submit', handlePrediction);
});
