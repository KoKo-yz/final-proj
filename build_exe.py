"""
Jordan Fire Intelligence - PyInstaller Build Script
Run: python build_exe.py
Output: dist/JordanFireIntelligence/JordanFireIntelligence.exe
"""

import subprocess
import sys
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

print("=" * 60)
print("Building Jordan Fire Intelligence Desktop App")
print("=" * 60)

# ── Check PyInstaller is installed ───────────────────────────────────────────
try:
    import PyInstaller
    print("[OK] PyInstaller found")
except ImportError:
    print("[...] Installing PyInstaller...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])
    print("[OK] PyInstaller installed")

# ── Build command ─────────────────────────────────────────────────────────────
cmd = [
    sys.executable, "-m", "PyInstaller",
    "--onedir",                          # Folder output (faster startup than --onefile)
    "--noconsole",                        # No console window
    "--name", "JordanFireIntelligence",
    "--icon", "app/static/favicon.ico" if os.path.exists("app/static/favicon.ico") else "NONE",

    # Include all app data directories
    "--add-data", "app/templates;app/templates",
    "--add-data", "app/static;app/static",
    "--add-data", "data;data",            # Include the SQLite database
    "--add-data", "app/config.py;app",

    # Hidden imports needed by FastAPI / SQLAlchemy / uvicorn
    "--hidden-import", "uvicorn.logging",
    "--hidden-import", "uvicorn.loops",
    "--hidden-import", "uvicorn.loops.auto",
    "--hidden-import", "uvicorn.protocols",
    "--hidden-import", "uvicorn.protocols.http",
    "--hidden-import", "uvicorn.protocols.http.auto",
    "--hidden-import", "uvicorn.protocols.websockets",
    "--hidden-import", "uvicorn.protocols.websockets.auto",
    "--hidden-import", "uvicorn.lifespan",
    "--hidden-import", "uvicorn.lifespan.on",
    "--hidden-import", "fastapi",
    "--hidden-import", "sqlalchemy",
    "--hidden-import", "sqlalchemy.dialects.sqlite",
    "--hidden-import", "jinja2",
    "--hidden-import", "aiofiles",
    "--hidden-import", "anyio",
    "--hidden-import", "starlette",
    "--hidden-import", "multipart",
    "--hidden-import", "email.mime.text",

    "app_launcher.py",   # Entry point (we'll create this below)
]

print("\n[...] Running PyInstaller (this may take 2-3 minutes)...")
result = subprocess.run(cmd, cwd=BASE_DIR)

if result.returncode == 0:
    print("\n" + "=" * 60)
    print("[OK] BUILD SUCCESSFUL!")
    print(f"     Executable: dist/JordanFireIntelligence/JordanFireIntelligence.exe")
    print("     Copy the entire 'dist/JordanFireIntelligence/' folder to any PC.")
    print("     The data/fire_incidents.db file is bundled inside.")
    print("=" * 60)
else:
    print("\n[ERROR] Build failed. Check errors above.")
