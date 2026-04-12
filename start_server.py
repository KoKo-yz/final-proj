import sys
import os
import uvicorn

# Set UTF-8 encoding
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# Change to project directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

print("=" * 60)
print("Starting Jordan Fire Intelligence Server")
print("=" * 60)

try:
    from app.main import app
    print("[OK] App loaded successfully")
except Exception as e:
    print(f"[ERROR] Failed to load app: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print(f"[OK] Starting server on http://0.0.0.0:8000")
print("=" * 60)

uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
