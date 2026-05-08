$PROJECT_DIR = $PSScriptRoot
$VENV_PYTHON = "$PROJECT_DIR\venv\Scripts\python.exe"
$ZROK_EXE    = "$PROJECT_DIR\zrok.exe"
$LOG_FILE    = "$PROJECT_DIR\watchdog.log"

Set-Location $PROJECT_DIR

function Log($msg) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$ts] $msg"
    Write-Host $line
    Add-Content -Path $LOG_FILE -Value $line -ErrorAction SilentlyContinue
}

Log "=== Watchdog started ==="

while ($true) {
    # 1. Ensure server is running on port 8000
    $tcpPort = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
    if (-not $tcpPort) {
        Log "Server not running on :8000. Starting..."
        Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Process cmd -ArgumentList "/c cd /d `"$PROJECT_DIR`" && title FireServer && `"$VENV_PYTHON`" start_server.py >> server_output.log 2>&1" -WindowStyle Minimized
        Log "Server start command issued. Waiting 15s..."
        Start-Sleep -Seconds 15
    } else {
        Log "Server OK on :8000 (PID $($tcpPort.OwningProcess))"
    }

    # 2. Ensure zrok tunnel is alive
    $zrokProc = Get-Process zrok -ErrorAction SilentlyContinue
    if (-not $zrokProc) {
        Log "Zrok not running. Cleaning ghost shares and restarting tunnel..."

        try {
            $overviewJson = & $ZROK_EXE overview --json 2>$null
            $overview = $overviewJson | ConvertFrom-Json
            foreach ($env in $overview.environments) {
                if ($env.shares) {
                    foreach ($share in $env.shares) {
                        $endpoints = $share.frontendEndpoints -join ","
                        if ($endpoints -like "*jordan-fire*") {
                            $token = $share.shareToken
                            Log "Deleting ghost share: $token ($endpoints)"
                            & $ZROK_EXE delete share $token
                            Start-Sleep -Seconds 2
                        }
                    }
                }
            }
        } catch {
            Log "Warning: Could not parse zrok overview: $_"
        }

        Log "Starting new zrok tunnel..."
        Start-Process $ZROK_EXE -ArgumentList "share public http://127.0.0.1:8000 -n public:jordan-fire --headless" -WindowStyle Minimized
        Log "Zrok tunnel start command issued."
        Start-Sleep -Seconds 15
    } else {
        Log "Zrok OK (PID $($zrokProc.Id))"
    }

    # 3. Health check
    try {
        $resp = Invoke-WebRequest -Uri "http://127.0.0.1:8000/login" -Method Get -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        Log "Health check OK: HTTP $($resp.StatusCode)"
    } catch {
        Log "Health check FAILED: $_"
    }

    Log "Sleeping 30s..."
    Start-Sleep -Seconds 30
}
