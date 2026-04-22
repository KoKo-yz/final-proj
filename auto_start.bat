@echo off
set PROJECT_DIR=C:\Users\yazan\Desktop\Jordan-Fire-Intelligence-v3-fixed
cd /d "%PROJECT_DIR%"

echo ============================================================
echo   Jordan Fire Intelligence - Auto Start
echo ============================================================

:: Kill any old server or tunnel processes
echo [1/4] Cleaning up old processes...
taskkill /f /im zrok.exe 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 " ^| findstr "LISTENING"') do taskkill /f /pid %%a 2>nul
timeout /t 2 /nobreak >nul

:: Give the DB a clean slate (no lingering locks)
echo [2/4] Clearing ghost zrok shares...
".\zrok.exe" overview --json > "%TEMP%\zrok_overview.json" 2>nul

:: Start the Python server using the venv
echo [3/4] Starting Fire Intelligence Server...
start "FireServer" /min cmd /c "cd /d "%PROJECT_DIR%" && .\venv\Scripts\python.exe start_server.py >> server_output.log 2>&1"
timeout /t 8 /nobreak >nul

:: Start the zrok tunnel
echo [4/4] Starting Zrok Tunnel...
start "ZrokTunnel" /min ".\zrok.exe" share public http://127.0.0.1:8000 -n public:jordan-fire --headless
timeout /t 5 /nobreak >nul

echo.
echo ============================================================
echo   Platform is LIVE at:
echo   https://jordan-fire.shares.zrok.io
echo ============================================================
echo.
echo Starting Watchdog (monitors and auto-restarts)...
start "FireWatchdog" /min powershell -ExecutionPolicy Bypass -File "%PROJECT_DIR%\keep_alive.ps1"

echo.
echo Done! Watchdog running in background.
echo Close this window when ready.
timeout /t 5
exit
