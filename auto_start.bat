@echo off
set "PROJECT_DIR=%~dp0"
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"
cd /d "%PROJECT_DIR%"

echo ============================================================
echo   Jordan Fire Intelligence - Auto Start
echo ============================================================

echo [1/4] Killing old processes...
taskkill /f /im zrok.exe 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 " ^| findstr "LISTENING"') do taskkill /f /pid %%a 2>nul
taskkill /f /im python.exe 2>nul
timeout /t 3 /nobreak >nul

echo [2/4] Starting Fire Intelligence Server...
start "FireServer" /min cmd /c "cd /d "%PROJECT_DIR%" && .\venv\Scripts\python.exe start_server.py >> server_output.log 2>&1"
timeout /t 12 /nobreak >nul

echo [3/4] Starting Zrok Tunnel...
start "ZrokTunnel" /min "%PROJECT_DIR%\zrok.exe" share public http://127.0.0.1:8000 -n public:jordan-fire --headless
timeout /t 8 /nobreak >nul

echo [4/4] Starting Watchdog...
start "FireWatchdog" /min powershell -ExecutionPolicy Bypass -File "%PROJECT_DIR%\keep_alive.ps1"

echo.
echo ============================================================
echo   Platform is LIVE at:
echo   https://jordan-fire.shares.zrok.io
echo   Password: jordanfire2026
echo ============================================================
timeout /t 5
exit
