"""
app_launcher.py — PyInstaller entry point for Jordan Fire Intelligence
This is the script that gets compiled into the .exe
"""

import sys
import os
import time
import socket
import webbrowser
import threading

# ── Fix paths when running as a PyInstaller bundle ───────────────────────────
if getattr(sys, 'frozen', False):
    # Running as compiled .exe — all files are in sys._MEIPASS
    BASE_DIR = sys._MEIPASS
    # Also set working dir to the exe's directory so SQLite DB is found
    EXE_DIR = os.path.dirname(sys.executable)
    os.chdir(EXE_DIR)
    # Add bundled location to path so app.* imports work
    sys.path.insert(0, BASE_DIR)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    os.chdir(BASE_DIR)

PORT = 8000


def is_port_free(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        return s.connect_ex(("127.0.0.1", port)) != 0


def open_browser():
    """Wait for server, then open browser."""
    time.sleep(3.5)
    webbrowser.open(f"http://localhost:{PORT}")


# ── If port is already in use, just open browser ─────────────────────────────
if not is_port_free(PORT):
    webbrowser.open(f"http://localhost:{PORT}")
    sys.exit(0)

# ── Open browser in a background thread (timing with server startup) ──────────
threading.Thread(target=open_browser, daemon=True).start()

# ── Start the uvicorn server (blocking) ───────────────────────────────────────
import uvicorn

# Redirect stdout/stderr encoding for Windows
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

from app.database import init_db
try:
    init_db()
except Exception as e:
    pass  # Tables may already exist

from app.main import app

uvicorn.run(
    app,
    host="0.0.0.0",   # Allows LAN access too
    port=PORT,
    log_level="error",  # Quiet mode — no console window
)
