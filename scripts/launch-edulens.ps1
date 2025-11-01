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

# load env to pick dynamic PORT and API base
function Read-Env($path) {
  $map = @{}
  if (Test-Path $path) {
    Get-Content $path | ForEach-Object {
      if ($_ -match '^(.*?)=(.*)$') { $map[$matches[1]] = $matches[2] }
    }
  }
  return $map
}
$Root = Resolve-Path (Join-Path $ScriptRoot "..")
$envLocal = Read-Env (Join-Path $Root ".env.local")
$envMain  = Read-Env (Join-Path $Root ".env")
$BackendPort = if ($envLocal.ContainsKey('PORT')) { [int]$envLocal['PORT'] } elseif ($envMain.ContainsKey('PORT')) { [int]$envMain['PORT'] } else { 5000 }

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

    Free-Port $BackendPort
    # Also free the common dev backend port 5000 in case a manual run is still alive
    Free-Port 5000
    Free-Port 5173
    Free-Port 5174
    Free-Port 5175

    if ($NoLaunch) {
        Log "NoLaunch: checks complete, exiting."
        exit 0
    }

    # Start backend: node server/server.js directly (more reliable than npm)
    Log "Starting backend (node server/server.js)..."
    $projectRoot = (Resolve-Path (Join-Path $ScriptRoot "..")).Path
    # Use timestamped log files to avoid file-lock errors if previous process holds old logs
    $ts = (Get-Date).ToString('yyyyMMdd_HHmmss')
    $serverOut = Join-Path $LogDir ("server.$ts.out.log")
    $serverErr = Join-Path $LogDir ("server.$ts.err.log")
    $backendProc = Start-Process -FilePath "node" -ArgumentList "server/server.js" -WorkingDirectory $projectRoot -RedirectStandardOutput $serverOut -RedirectStandardError $serverErr -WindowStyle Hidden -PassThru
    Start-Sleep -Milliseconds 800
    Log "Backend process started (PID $($backendProc.Id)). Waiting for port $BackendPort to become available..."

    # Wait for backend health on chosen port
    $maxRetries = 60
    $healthUrl = "http://127.0.0.1:$BackendPort/health"
    $backendReady = $false
    $runtimeDetected = $false

    function Read-RuntimeEnv($root) {
        $map = @{}
        $file = Join-Path $root ".runtime-env"
        if (Test-Path $file) {
            Get-Content $file | ForEach-Object { if ($_ -match '^(.*?)=(.*)$') { $map[$matches[1]] = $matches[2] } }
        }
        return $map
    }
    
    for ($i = 0; $i -lt $maxRetries; $i++) {
        # If server switched ports, pick it up from .runtime-env
        $rt = Read-RuntimeEnv $projectRoot
        if ($rt.ContainsKey('PORT')) {
            $newPort = [int]$rt['PORT']
            if ($newPort -ne $BackendPort) {
                $BackendPort = $newPort
                $healthUrl = "http://127.0.0.1:$BackendPort/health"
                if (-not $runtimeDetected) { Log "Detected runtime API port $BackendPort via .runtime-env; updating health target."; $runtimeDetected=$true }
            }
        }
        try {
            $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Log "✅ Backend responsive on port $BackendPort (HTTP /health OK)."
                $backendReady = $true
                break
            }
        } catch {
            if ($i -eq 0) { Log "Checking backend health... (attempt $($i+1)/$maxRetries)" }
        }
        Start-Sleep -Seconds 1
        Write-Host "." -NoNewline -ForegroundColor Cyan
        if (($i + 1) % 5 -eq 0) {
            Log "Health check attempt $($i+1)/$maxRetries..."
            if (Test-Path $serverErr) {
                try { $tail = Get-Content $serverErr -Tail 3 -ErrorAction SilentlyContinue; if ($tail) { Log ("server.err> " + ($tail -join ' | ')) } } catch {}
            }
        }
    }
    
    if (-not $backendReady) {
        Log "ERROR: Backend did not start within expected time ($maxRetries seconds)."
        Log "Checking if backend process is still alive..."
        try {
            $proc = Get-Process -Id $backendProc.Id -ErrorAction SilentlyContinue
            if ($proc) {
                Log "Backend process $($proc.Id) is still running, but /health endpoint not responding."
                Log "This may indicate an error in server initialization. Review server logs."
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
    Log "Waiting for Vite dev server to be ready (5173/5174 fallback)..."
    $viteMaxRetries = 30
    $viteReady = $false
    $DevPort = 5173
    
    for ($i = 1; $i -le $viteMaxRetries; $i++) {
        foreach ($p in 5173,5174,5175) {
            try {
                $response = Invoke-WebRequest -Uri "http://127.0.0.1:$p" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
                if ($response -and $response.StatusCode -eq 200) {
                    Log "✅ Vite dev server is ready on port $p."
                    $viteReady = $true
                    $DevPort = $p
                    break
                }
            } catch {}
        }
        if ($viteReady) { break }
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
    $env:ELECTRON_START_URL = "http://127.0.0.1:$DevPort"
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
