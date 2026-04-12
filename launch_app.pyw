"""
Jordan Fire Intelligence - One-Click Launcher
Double-click this file to start the server and open the browser.
No console window (.pyw extension).
"""

import os
import sys
import time
import subprocess
import webbrowser
import socket

# ── Project directory (same folder as this file) ─────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(BASE_DIR)

PORT = 8000


def is_port_open(port):
    """Check if server is already running on this port."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", port)) == 0


def wait_for_server(port, timeout=30):
    """Wait until the server is ready."""
    start = time.time()
    while time.time() - start < timeout:
        if is_port_open(port):
            return True
        time.sleep(0.5)
    return False


# ── If already running, just open browser ────────────────────────────────────
if is_port_open(PORT):
    webbrowser.open(f"http://localhost:{PORT}")
    sys.exit(0)

# ── Start server in the background (no window) ───────────────────────────────
server_proc = subprocess.Popen(
    [sys.executable, "start_server.py"],
    cwd=BASE_DIR,
    creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)

# ── Wait for server to be ready, then open browser ───────────────────────────
if wait_for_server(PORT, timeout=40):
    time.sleep(0.5)  # Small extra delay for full startup
    webbrowser.open(f"http://localhost:{PORT}")
else:
    # Fallback: open anyway (maybe it just started slow)
    webbrowser.open(f"http://localhost:{PORT}")
