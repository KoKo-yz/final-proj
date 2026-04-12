# Quick Start Script - Forest Fire Prediction System
# Run this to get the app running quickly

Write-Host "🌲 Forest Fire Prediction System - Quick Start" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check Python
$pythonVersion = python --version 2>&1
Write-Host "✓ $pythonVersion" -ForegroundColor Green
Write-Host ""

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt
Write-Host ""

# Generate sample data if database doesn't exist
if (-not (Test-Path "data\fire_incidents.db")) {
    Write-Host "🎲 Generating sample data for testing..." -ForegroundColor Yellow
    python scripts/generate_sample_data.py --count 2000
    Write-Host ""
} else {
    Write-Host "✓ Database already exists" -ForegroundColor Green
    Write-Host ""
}

# Start the server
Write-Host "🚀 Starting the application..." -ForegroundColor Green
Write-Host ""
Write-Host "📍 Open your browser to: http://localhost:8000" -ForegroundColor Cyan
Write-Host "📊 API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
