@echo off
title Jordan Fire Intelligence
cd /d "%~dp0"

:: Check if server is already running
netstat -an | findstr ":8000 " | findstr "LISTENING" >nul
if %errorlevel%==0 (
    echo Server already running. Opening browser...
    start http://localhost:8000
    exit /b
)

echo ============================================================
echo   Jordan Fire Intelligence - Starting Server
echo ============================================================
echo.
echo   Local Access:   http://localhost:8000
echo   Network Access: http://192.168.1.20:8000
echo.
echo   Share the Network Access URL with phones and other PCs
echo   on the same WiFi network.
echo.
echo   Press Ctrl+C to stop the server.
echo ============================================================

:: Open browser after 4 second delay (in background)
start "" cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:8000"

:: Start the server
python start_server.py
pause
