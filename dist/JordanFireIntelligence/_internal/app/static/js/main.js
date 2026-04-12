/**
 * Main JavaScript - Shared utilities, animations, and initialization
 */

const API_BASE = '/api';

/**
 * Animated counter - counts up from 0 to target
 */
function animateCounter(element, target, duration = 1500, prefix = '', suffix = '') {
    if (!element) return;
    const start = 0;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + (target - start) * eased);
        element.textContent = prefix + current.toLocaleString() + suffix;
        if (progress < 1) requestAnimationFrame(update);
    }
    
    requestAnimationFrame(update);
}

/**
 * Animate progress bar from 0 to target
 */
function animateProgress(element, target, duration = 1500) {
    if (!element) return;
    element.style.width = '0%';
    setTimeout(() => {
        element.style.width = target + '%';
    }, 100);
}

/**
 * Fetch with error handling
 */
async function fetchAPI(endpoint, params = {}) {
    try {
        const url = new URL(`${API_BASE}${endpoint}`, window.location.origin);
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
                url.searchParams.append(key, params[key]);
            }
        });
        const response = await fetch(url.toString());
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

/**
 * Show loading
 */
function showLoading(selector) {
    const el = document.querySelector(selector);
    if (el) {
        el.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem;" role="status"></div>
                <div class="text-muted">Loading data...</div>
            </div>`;
    }
}

/**
 * Show error
 */
function showError(selector, message = 'Failed to load data') {
    const el = document.querySelector(selector);
    if (el) {
        el.innerHTML = `
            <div class="text-center py-5 text-danger">
                <i class="bi bi-exclamation-triangle-fill" style="font-size: 3rem;"></i>
                <div class="mt-3 fw-semibold">${message}</div>
                <button class="btn btn-outline-danger btn-sm mt-2" onclick="location.reload()">
                    <i class="bi bi-arrow-clockwise me-1"></i>Retry
                </button>
            </div>`;
    }
}

function formatNumber(n) {
    if (n === null || n === undefined) return '-';
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getMonthName(m) {
    return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1] || '';
}

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    
    // 1. Glass navbar on scroll
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (navbar) {
            navbar.classList.toggle('scrolled', window.scrollY > 20);
        }
    });
    
    // 2. Scroll-reveal for cards
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, i * 100);
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    
    document.querySelectorAll('.card.reveal').forEach(card => {
        revealObserver.observe(card);
    });
    
    // 3. Animated stat counters
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseInt(el.dataset.target) || parseInt(el.textContent.replace(/,/g, ''));
                if (target && !el.dataset.animated) {
                    el.dataset.animated = 'true';
                    animateCounter(el, target);
                }
                counterObserver.unobserve(el);
            }
        });
    }, { threshold: 0.5 });
    
    document.querySelectorAll('.stat-number, .stat-counter').forEach(el => {
        counterObserver.observe(el);
    });
    
    // 4. Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
    
    // 5. Create ember particles in hero sections
    document.querySelectorAll('.hero-section').forEach(hero => {
        const container = document.createElement('div');
        container.className = 'ember-container';
        for (let i = 0; i < 8; i++) {
            const ember = document.createElement('div');
            ember.className = 'ember';
            ember.style.bottom = Math.random() * 100 + '%';
            ember.style.left = Math.random() * 100 + '%';
            ember.style.animationDelay = (Math.random() * 3) + 's';
            ember.style.animationDuration = (2 + Math.random() * 3) + 's';
            container.appendChild(ember);
        }
        hero.insertBefore(container, hero.firstChild);
    });
    
    // 6. Button ripple effect
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            ripple.style.cssText = `
                position: absolute; border-radius: 50%;
                background: rgba(255,255,255,0.3);
                width: ${size}px; height: ${size}px;
                left: ${e.clientX - rect.left - size/2}px;
                top: ${e.clientY - rect.top - size/2}px;
                animation: ripple 0.6s ease-out;
                pointer-events: none;
            `;
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    });
});
