# Test backend startup and health check
# Run: PowerShell -NoProfile -ExecutionPolicy Bypass -File .\scripts\test-backend.ps1

Write-Host "`n=== EduLens Backend Diagnostic Test ===" -ForegroundColor Cyan

$projectRoot = Split-Path -Parent $PSScriptRoot

# Step 1: Check if backend is already running
Write-Host "`n1. Checking if port 5000 is already in use..." -ForegroundColor Yellow
$existingProc = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($existingProc) {
    Write-Host "   ⚠️  Port 5000 is already in use (PID: $($existingProc.OwningProcess))" -ForegroundColor Yellow
    try {
        $proc = Get-Process -Id $existingProc.OwningProcess -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "   Process: $($proc.ProcessName)" -ForegroundColor Cyan
        }
    } catch {}
    Write-Host "   Killing existing process..." -ForegroundColor Yellow
    Stop-Process -Id $existingProc.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# Step 2: Start backend
Write-Host "`n2. Starting backend server..." -ForegroundColor Yellow
$backendProc = Start-Process -FilePath "powershell.exe" `
    -ArgumentList "-NoProfile", "-NoExit", "-Command", "cd `"$projectRoot`"; node server/server.js" `
    -WindowStyle Hidden -PassThru

Write-Host "   ✅ Backend process started (PID: $($backendProc.Id))" -ForegroundColor Green
Start-Sleep -Seconds 2

# Step 3: Check if process is still alive
Write-Host "`n3. Checking if process is alive..." -ForegroundColor Yellow
$stillAlive = Get-Process -Id $backendProc.Id -ErrorAction SilentlyContinue
if ($stillAlive) {
    Write-Host "   ✅ Process is still running" -ForegroundColor Green
} else {
    Write-Host "   ❌ Process exited! Backend failed to start." -ForegroundColor Red
    exit 1
}

# Step 4: Test health endpoint
Write-Host "`n4. Testing /health endpoint..." -ForegroundColor Yellow
$maxRetries = 10
$healthSuccess = $false

for ($i = 0; $i -lt $maxRetries; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:5000/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "   ✅ Health check successful (Status: $($response.StatusCode))" -ForegroundColor Green
            Write-Host "   Response: $($response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 1)" -ForegroundColor Cyan
            $healthSuccess = $true
            break
        }
    } catch {
        Write-Host "   . " -NoNewline -ForegroundColor Yellow
        Start-Sleep -Seconds 1
    }
}

if (-not $healthSuccess) {
    Write-Host "`n   ❌ Health check failed after $maxRetries attempts" -ForegroundColor Red
    Write-Host "`n5. Debugging info:" -ForegroundColor Yellow
    
    # Try to connect to port directly
    Write-Host "   Checking TCP connection to 127.0.0.1:5000..." -ForegroundColor Cyan
    $tcpTest = Test-NetConnection -ComputerName 127.0.0.1 -Port 5000 -WarningAction SilentlyContinue
    if ($tcpTest.TcpTestSucceeded) {
        Write-Host "   ✅ Port 5000 is open" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Port 5000 is not responding to TCP" -ForegroundColor Red
    }
} else {
    Write-Host "`n✅ Backend is healthy and responding!" -ForegroundColor Green
}

# Step 6: Cleanup
Write-Host "`n5. Cleaning up..." -ForegroundColor Yellow
try {
    Stop-Process -Id $backendProc.Id -Force -ErrorAction SilentlyContinue
    Write-Host "   ✅ Backend process stopped" -ForegroundColor Green
} catch {}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
Write-Host ""
exit 0
