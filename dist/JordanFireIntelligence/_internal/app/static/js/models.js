/**
 * Models Page - Animated performance charts and comparisons
 */

let charts = {};

async function loadModelData() {
    try {
        const perf = await fetchAPI('/models/performance');
        renderModelCards(perf);
        renderPerformanceChart(perf);
        renderROCChart(perf);
        
        const features = await fetchAPI('/models/feature-importance');
        renderFeatureImportance(features);
        
    } catch (error) {
        console.error('Model data error:', error);
        document.getElementById('model-cards').innerHTML = `
            <div class="col-12 text-center py-5 text-danger">
                <i class="bi bi-exclamation-triangle-fill" style="font-size:3rem;"></i>
                <div class="mt-3">Failed to load model data</div>
            </div>`;
    }
}

function renderModelCards(data) {
    const container = document.getElementById('model-cards');
    if (!container || !data.models) return;
    container.innerHTML = '';
    
    const icons = {
        'Random Forest': 'bi-tree text-success',
        'XGBoost': 'bi-graph-up-arrow text-primary',
        'SVM': 'bi-bullseye text-danger',
        'Neural Network': 'bi-diagram-3 text-warning'
    };
    
    data.models.forEach((model, idx) => {
        const isBest = model.name === data.best_model;
        const delay = idx * 0.15;
        
        container.innerHTML += `
            <div class="col-md-6 col-lg-3" style="animation: fadeInUp 0.6s ease-out ${delay}s both;">
                <div class="card h-100 shadow-sm ${isBest ? 'border-success border-2' : ''} reveal">
                    ${isBest ? '<div class="position-absolute top-0 end-0 m-3"><span class="badge bg-success px-3 py-2">★ Best</span></div>' : ''}
                    <div class="card-body text-center">
                        <div class="mb-3" style="animation: float 3s ease-in-out infinite; animation-delay: ${delay}s;">
                            <i class="bi ${icons[model.name] || 'bi-cpu'}" style="font-size: 2.5rem;"></i>
                        </div>
                        <h5 class="fw-bold mb-1">${model.name}</h5>
                        ${isBest ? '<small class="text-success fw-semibold">Top Performer</small>' : ''}
                        
                        <div class="row mt-4 g-2">
                            <div class="col-6">
                                <div class="model-metric">
                                    <div class="stat-number" data-target="${Math.round(model.accuracy * 100)}">${(model.accuracy * 100).toFixed(1)}%</div>
                                    <div class="model-metric-label">Accuracy</div>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="model-metric">
                                    <div class="stat-number" data-target="${Math.round(model.f1_score * 100)}">${(model.f1_score * 100).toFixed(1)}%</div>
                                    <div class="model-metric-label">F1-Score</div>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="model-metric">
                                    <div class="stat-number" data-target="${Math.round(model.precision * 100)}">${(model.precision * 100).toFixed(1)}%</div>
                                    <div class="model-metric-label">Precision</div>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="model-metric">
                                    <div class="stat-number" data-target="${Math.round(model.recall * 100)}">${(model.recall * 100).toFixed(1)}%</div>
                                    <div class="model-metric-label">Recall</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="mt-3 pt-3 border-top">
                            <small class="text-muted">AUC-ROC</small>
                            <div class="fw-bold text-primary">${(model.auc_roc * 100).toFixed(1)}%</div>
                        </div>
                    </div>
                </div>
            </div>`;
    });
    
    // Re-observe new reveal elements
    setTimeout(() => {
        document.querySelectorAll('.card.reveal:not(.visible)').forEach(card => {
            card.classList.add('visible');
        });
    }, 100);
}

function renderPerformanceChart(data) {
    const ctx = document.getElementById('chart-performance');
    if (!ctx || !data.models) return;
    
    charts.performance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.models.map(m => m.name),
            datasets: [
                { label: 'Accuracy', data: data.models.map(m => +(m.accuracy * 100).toFixed(1)), backgroundColor: 'rgba(59,130,246,0.75)', borderRadius: 6 },
                { label: 'F1-Score', data: data.models.map(m => +(m.f1_score * 100).toFixed(1)), backgroundColor: 'rgba(16,185,129,0.75)', borderRadius: 6 },
                { label: 'Precision', data: data.models.map(m => +(m.precision * 100).toFixed(1)), backgroundColor: 'rgba(245,158,11,0.75)', borderRadius: 6 },
                { label: 'Recall', data: data.models.map(m => +(m.recall * 100).toFixed(1)), backgroundColor: 'rgba(239,68,68,0.75)', borderRadius: 6 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: { duration: 2000, easing: 'easeOutQuart' },
            plugins: {
                legend: { position: 'top', labels: { usePointStyle: true, padding: 15 } },
                tooltip: {
                    backgroundColor: 'rgba(15,23,42,0.9)', padding: 12, cornerRadius: 8,
                    callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}%` }
                }
            },
            scales: {
                y: { beginAtZero: false, min: 80, max: 100, ticks: { callback: v => v + '%' } }
            }
        }
    });
}

function renderFeatureImportance(data) {
    const ctx = document.getElementById('chart-features');
    if (!ctx || !data.features) return;
    
    const sorted = [...data.features].sort((a, b) => b.importance - a.importance);
    const colors = ['#dc2626','#d97706','#3b82f6','#10b981','#8b5cf6','#ec4899','#0ea5e9','#6366f1','#14b8a6'];
    
    charts.features = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(f => f.name),
            datasets: [{
                label: 'Importance',
                data: sorted.map(f => +(f.importance * 100).toFixed(1)),
                backgroundColor: sorted.map((_, i) => colors[i % colors.length] + 'bb'),
                borderColor: sorted.map((_, i) => colors[i % colors.length]),
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            animation: { duration: 1800, easing: 'easeOutQuart' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15,23,42,0.9)', padding: 12, cornerRadius: 8,
                    callbacks: { label: ctx => `Importance: ${ctx.parsed.x}%` }
                }
            },
            scales: {
                x: { beginAtZero: true, ticks: { callback: v => v + '%' } }
            }
        }
    });
}

function renderROCChart(data) {
    const ctx = document.getElementById('chart-roc');
    if (!ctx || !data.models) return;
    
    const colors = [
        { b: 'rgba(16,185,129,1)', bg: 'rgba(16,185,129,0.08)' },
        { b: 'rgba(59,130,246,1)', bg: 'rgba(59,130,246,0.08)' },
        { b: 'rgba(239,68,68,1)', bg: 'rgba(239,68,68,0.08)' },
        { b: 'rgba(245,158,11,1)', bg: 'rgba(245,158,11,0.08)' }
    ];
    
    function rocPoints(auc) {
        const pts = [];
        for (let i = 0; i <= 100; i++) {
            const fpr = i / 100;
            const tpr = Math.pow(fpr, (1 - auc) / auc);
            pts.push({ x: fpr, y: Math.min(tpr, 1) });
        }
        return pts;
    }
    
    charts.roc = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: data.models.map((m, i) => ({
                label: `${m.name} (AUC: ${(m.auc_roc * 100).toFixed(1)}%)`,
                data: rocPoints(m.auc_roc),
                borderColor: colors[i].b,
                backgroundColor: colors[i].bg,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2.5
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: { duration: 2000, easing: 'easeOutQuart' },
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, padding: 12 } },
                tooltip: {
                    backgroundColor: 'rgba(15,23,42,0.9)', padding: 12, cornerRadius: 8
                }
            },
            scales: {
                x: { type: 'linear', title: { display: true, text: 'False Positive Rate', font: { weight: '600' } }, min: 0, max: 1 },
                y: { type: 'linear', title: { display: true, text: 'True Positive Rate', font: { weight: '600' } }, min: 0, max: 1 }
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', loadModelData);
