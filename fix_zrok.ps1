$PROJECT_DIR = $PSScriptRoot
$ZROK_EXE = "$PROJECT_DIR\zrok.exe"

Write-Host "=== Zrok Ghost Share Fix ===" -ForegroundColor Cyan

# Step 1: Kill everything
Write-Host "[1] Killing all zrok and python processes..." -ForegroundColor Yellow
Get-Process zrok -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 3

# Step 2: Delete the ghost share via zrok overview
Write-Host "[2] Checking for ghost shares..." -ForegroundColor Yellow
try {
    $overviewJson = & $ZROK_EXE overview --json 2>$null
    $overview = $overviewJson | ConvertFrom-Json

    foreach ($env in $overview.environments) {
        if ($env.shares) {
            foreach ($share in $env.shares) {
                $endpoints = $share.frontendEndpoints -join ","
                if ($endpoints -like "*jordan-fire*") {
                    Write-Host "  -> Deleting ghost share: $($share.shareToken)" -ForegroundColor Red
                    & $ZROK_EXE delete share $share.shareToken
                    Start-Sleep -Seconds 2
                }
            }
        }
    }
} catch {
    Write-Host "  Could not parse zrok overview. Skipping ghost cleanup." -ForegroundColor DarkYellow
}

# Step 3: Start the server fresh
Write-Host "[3] Starting server..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/c cd /d `"$PROJECT_DIR`" && title FireServer && .\venv\Scripts\python.exe start_server.py >> server_output.log 2>&1" -WindowStyle Minimized
Write-Host "    Waiting 12 seconds for server to be ready..." -ForegroundColor DarkGray
Start-Sleep -Seconds 12

# Step 4: Verify server is up
$serverUp = $false
try {
    $resp = Invoke-WebRequest -Uri "http://127.0.0.1:8000/login" -Method Get -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "  [OK] Server is UP (HTTP $($resp.StatusCode))" -ForegroundColor Green
    $serverUp = $true
} catch {
    Write-Host "  [WARN] Server health check failed: $_" -ForegroundColor Red
}

# Step 5: Start fresh tunnel
Write-Host "[4] Starting fresh zrok tunnel..." -ForegroundColor Yellow
Start-Process $ZROK_EXE -ArgumentList "share public http://127.0.0.1:8000 -n public:jordan-fire --headless" -WindowStyle Minimized
Start-Sleep -Seconds 8

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  DONE! Try opening:" -ForegroundColor Green
Write-Host "  https://jordan-fire.shares.zrok.io" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Starting watchdog..." -ForegroundColor DarkGray
Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -File `"$PROJECT_DIR\keep_alive.ps1`"" -WindowStyle Minimized
