@echo off
cd /d C:\Users\yazan\Desktop\Jordan-Fire-Intelligence-v3-fixed
echo Starting server on port 8000...
venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-level info > server.log 2>&1
echo Server stopped. Check server.log for details.
pause
