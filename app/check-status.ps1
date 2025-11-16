# EduLens Status Checker
# Comprehensive health check for all components

Write-Host "🔍 EduLens System Status Check" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host ""

# Check Backend
Write-Host "📡 Backend Server:" -ForegroundColor Yellow
$backend = Get-Process node -ErrorAction SilentlyContinue | Where-Object {$_.CommandLine -like "*server.js*"}
if ($backend) {
    Write-Host "   ✅ Running (PID: $($backend.Id))" -ForegroundColor Green
    Write-Host "   Memory: $([math]::Round($backend.WorkingSet64/1MB, 2)) MB" -ForegroundColor Gray
    Write-Host "   CPU: $($backend.CPU)s" -ForegroundColor Gray
} else {
    Write-Host "   ❌ Not Running" -ForegroundColor Red
}

# Check Backend Port
Write-Host ""
Write-Host "🌐 Backend API (Port 5000):" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -TimeoutSec 3 -ErrorAction Stop
    Write-Host "   ✅ Responding" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Not Responding" -ForegroundColor Red
}

# Check Frontend
Write-Host ""
Write-Host "🎨 Frontend (Vite):" -ForegroundColor Yellow
$vite = Get-Process node -ErrorAction SilentlyContinue | Where-Object {$_.CommandLine -like "*vite*"}
if ($vite) {
    Write-Host "   ✅ Running (PID: $($vite.Id))" -ForegroundColor Green
} else {
    Write-Host "   ❌ Not Running" -ForegroundColor Red
}

# Check Electron
Write-Host ""
Write-Host "⚡ Electron App:" -ForegroundColor Yellow
$electron = Get-Process electron -ErrorAction SilentlyContinue
if ($electron) {
    Write-Host "   ✅ Running (PID: $($electron.Id))" -ForegroundColor Green
} else {
    Write-Host "   ❌ Not Running" -ForegroundColor Red
}

# Check Whisper.cpp
Write-Host ""
Write-Host "🎤 Whisper.cpp:" -ForegroundColor Yellow
$whisperBin = "C:/whisper.cpp/main.exe"
if (Test-Path $whisperBin) {
    Write-Host "   ✅ Found at $whisperBin" -ForegroundColor Green
    $whisperProc = Get-Process main -ErrorAction SilentlyContinue
    if ($whisperProc) {
        Write-Host "   ⚠️ Whisper process running (may be stuck)" -ForegroundColor Yellow
        Write-Host "      PID: $($whisperProc.Id)" -ForegroundColor Gray
    }
} else {
    Write-Host "   ❌ Not Found" -ForegroundColor Red
}

# Check Whisper Model
Write-Host ""
Write-Host "Whisper Model:" -ForegroundColor Yellow
$whisperModel = "C:/whisper.cpp/ggml-base.bin"
if (Test-Path $whisperModel) {
    $modelSize = [math]::Round((Get-Item $whisperModel).Length/1MB, 2)
    Write-Host "   OK Found - Size: $modelSize MB" -ForegroundColor Green
} else {
    Write-Host "   ERROR Not Found" -ForegroundColor Red
}

Write-Host ""
Write-Host "===============================" -ForegroundColor Cyan
Write-Host "Status check complete!" -ForegroundColor Cyan
Write-Host ""
