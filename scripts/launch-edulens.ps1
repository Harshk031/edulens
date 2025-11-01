# One-click launcher (robust). Run with:
# PowerShell -NoProfile -ExecutionPolicy Bypass -File .\scripts\launch-edulens.ps1

Param(
    [switch]$NoLaunch  # run only checks if provided
)

$ErrorActionPreference = "Stop"
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptRoot

# ensure logs directory
$LogDir = Join-Path $ScriptRoot "..\logs"
if (-not (Test-Path $LogDir)) {
    New-Item -Path $LogDir -ItemType Directory -Force | Out-Null
}
$LogFile = Join-Path $LogDir "launcher.log"

function Log {
    param([string]$msg)
    $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $line = "$timestamp`t$msg"
    Add-Content -Path $LogFile -Value $line
    Write-Host $line
}

try {
    Log "=== EduLens launcher started ==="

    # Node version check
    $nodeVersionRaw = & node -v 2>$null
    if (-not $?) {
        Log "ERROR: Node.js not found in PATH. Please install Node >= 18 and ensure 'node' is on PATH."
        throw "Node missing"
    }
    $nodeVersionRaw = $nodeVersionRaw.TrimStart("v")
    $nodeMajor = [int]($nodeVersionRaw.Split('.')[0])
    Log "Node.js version detected: v$nodeVersionRaw"
    if ($nodeMajor -lt 18) {
        Log "ERROR: Node.js version must be >= 18. Found: $nodeVersionRaw"
        throw "Node too old"
    }

    # Kill any stale server on port 5000 (Windows-specific)
    function Free-Port {
        param([int]$port)
        try {
            $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
            if ($conns) {
                foreach ($c in $conns) {
                    if ($c.OwningProcess -and $c.OwningProcess -ne $PID) {
                        try {
                            Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
                        } catch {
                            # ignore
                        }
                        Log "Killed process $($c.OwningProcess) occupying port $port"
                    }
                }
            }
        } catch {
            # fallback: netstat + taskkill (older Windows)
        }
    }

    Free-Port 5000
    Free-Port 5173

    if ($NoLaunch) {
        Log "NoLaunch: checks complete, exiting."
        exit 0
    }

    # Start backend: node server/server.js directly (more reliable than npm)
    Log "Starting backend (node server/server.js)..."
    $projectRoot = (Resolve-Path (Join-Path $ScriptRoot "..")).Path
    $backendCmd = "cd `"$projectRoot`"; node server/server.js"
    $backendProc = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile", "-NoExit", "-Command", $backendCmd -WindowStyle Hidden -PassThru
    Start-Sleep -Milliseconds 800
    Log "Backend process started (PID $($backendProc.Id)). Waiting for port 5000 to become available..."

    # Wait for port 5000 with HTTP health check
    $maxRetries = 30
    $healthUrl = "http://127.0.0.1:5000/health"
    $backendReady = $false
    
    for ($i = 0; $i -lt $maxRetries; $i++) {
        try {
            $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Log "✅ Backend responsive on port 5000 (HTTP /health OK)."
                $backendReady = $true
                break
            }
        } catch {
            # Health check failed, keep retrying
            if ($i -eq 0) {
                Log "Checking backend health... (attempt $($i+1)/$maxRetries)"
            }
        }
        
        Start-Sleep -Seconds 1
        Write-Host "." -NoNewline -ForegroundColor Cyan
        
        # Log progress every 5 attempts
        if (($i + 1) % 5 -eq 0) {
            Log "Health check attempt $($i+1)/$maxRetries..."
        }
    }
    
    if (-not $backendReady) {
        Log "ERROR: Backend did not start within expected time ($maxRetries seconds)."
        Log "Checking if backend process is still alive..."
        try {
            $proc = Get-Process -Id $backendProc.Id -ErrorAction SilentlyContinue
            if ($proc) {
                Log "Backend process $($proc.Id) is still running, but /health endpoint not responding."
                Log "This may indicate an error in server initialization."
            } else {
                Log "Backend process has exited. Check server/server.js for errors."
            }
        } catch {}
        throw "backend-timeout"
    }
    
    Write-Host "`n" -NoNewline  # newline after dots

    # Start Vite dev server (required for Electron frontend)
    Log "Starting Vite dev server (port 5173)..."
    $viteLogFile = Join-Path $LogDir "vite.log"
    $viteBin = Join-Path $projectRoot "node_modules\\.bin\\vite.cmd"
    if (-not (Test-Path $viteBin)) { $viteBin = "npx.cmd vite" }
    $viteCmd = "& `"$viteBin`" > `"$viteLogFile`" 2>&1"
    $viteProc = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile", "-NoExit", "-Command", "cd `"$projectRoot`"; $viteCmd" -WindowStyle Hidden -PassThru
    Start-Sleep -Milliseconds 500
    Log "Vite process started (PID $($viteProc.Id))."
    Log "Giving Vite initial startup time..."
    Start-Sleep -Seconds 4  # Give Vite enough time to initialize before checking

    # Wait for Vite to be ready (port 5173) - HTTP health check
    Log "Waiting for Vite dev server to be ready on port 5173..."
    $viteMaxRetries = 30
    $viteReady = $false
    
    for ($i = 1; $i -le $viteMaxRetries; $i++) {
        try {
            $response = Invoke-WebRequest -Uri "http://127.0.0.1:5173" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response -and $response.StatusCode -eq 200) {
                Log "✅ Vite dev server is ready on port 5173."
                $viteReady = $true
                break
            }
        } catch {
            # Keep retrying
        }
        Start-Sleep -Seconds 2
        Write-Host "." -NoNewline -ForegroundColor Cyan
        Log "Vite check attempt $i/$viteMaxRetries..."
        if ($i -eq $viteMaxRetries) {
            Log "ERROR: ❌ Vite dev server did not respond within expected time."
            throw "vite-timeout"
        }
    }
    
    Write-Host "`n" -NoNewline

    # Start Electron app with inherited environment and proper working directory
    Log "Starting Electron app..."
    $env:ELECTRON_START_URL = 'http://127.0.0.1:5173'
    $electronBin = Join-Path $projectRoot "node_modules\\.bin\\electron.cmd"
    if (-not (Test-Path $electronBin)) { $electronBin = Join-Path $projectRoot "node_modules\\.bin\\electron.ps1" }
    if (-not (Test-Path $electronBin)) { $electronBin = "electron" }
    $electronProc = Start-Process -FilePath $electronBin -ArgumentList "electron.js" -WorkingDirectory $projectRoot -WindowStyle Normal -PassThru
    Log "Electron started (PID $($electronProc.Id))."

    Log "=== Launcher completed successfully ==="
    exit 0
}
catch {
    $err = $_.Exception.Message
    Log "LAUNCHER ERROR: $err"
    Log "Stack: $($_.ScriptStackTrace)"
    Write-Host "`nERROR: EduLens launcher failed! See $LogFile for details.`n"
    exit 1
}
