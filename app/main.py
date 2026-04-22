"""
Forest Fire Prediction & Risk Mapping System for Jordan
Prince Al Hussein Bin Abdallah II Academy - Fire and Safety Engineering
Team: Hashem, Yazan, Yousef, Ahmad, Saif, Mustafa
Supervisor: Dr. Diana Rbehat
"""

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
import os

# Database setup
from app.database import init_db

# Initialize database synchronously before app starts
try:
    init_db()
    print("[OK] Database initialized")
except Exception as e:
    print(f"[WARN] Database init warning: {e}")

app = FastAPI(
    title="Forest Fire Prediction System - Jordan",
    description="AI-powered forest fire prediction and risk mapping for Jordan",
    version="2.0.0"
)

# Add session middleware for password protection
app.add_middleware(SessionMiddleware, secret_key="jordan_fire_secret_key_2026")

# Mount static files
static_dir = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Import and register routers
from app.routers import pages, api
app.include_router(pages.router)
app.include_router(api.router, prefix="/api")

# PWA Routes
from fastapi.responses import FileResponse

@app.get("/sw.js", include_in_schema=False)
async def serve_sw():
    return FileResponse(os.path.join(static_dir, "js", "sw.js"), media_type="application/javascript")

@app.get("/manifest.json", include_in_schema=False)
async def serve_manifest():
    return FileResponse(os.path.join(static_dir, "manifest.json"), media_type="application/json")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
