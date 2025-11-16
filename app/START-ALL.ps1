# EduLens - Complete Startup Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting EduLens - All Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Stop existing processes
Write-Host "Stopping existing processes..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -eq "node" -or $_.ProcessName -eq "electron"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Get the script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Start Backend Server
Write-Host ""
Write-Host "[1/3] Starting Backend Server (Port 5000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptPath'; Write-Host 'Backend Server Starting...' -ForegroundColor Green; node backend/server.js"
Start-Sleep -Seconds 3

# Start Vite Dev Server
Write-Host ""
Write-Host "[2/3] Starting Vite Dev Server (Port 5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptPath'; Write-Host 'Vite Dev Server Starting...' -ForegroundColor Green; npx vite --config config/vite.config.js"
Start-Sleep -Seconds 8

# Verify Vite is running
Write-Host ""
Write-Host "Verifying Vite server..." -ForegroundColor Yellow
$viteRunning = $false
for ($i = 0; $i -lt 10; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $viteRunning = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 1
    }
}

if ($viteRunning) {
    Write-Host "✓ Vite server is running!" -ForegroundColor Green
} else {
    Write-Host "⚠ Vite server may not be ready yet, but continuing..." -ForegroundColor Yellow
}

# Start Electron App
Write-Host ""
Write-Host "[3/3] Starting Electron App..." -ForegroundColor Green
$env:ELECTRON_START_URL = "http://localhost:5173"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptPath'; `$env:ELECTRON_START_URL='http://localhost:5173'; Write-Host 'Electron App Starting...' -ForegroundColor Green; npx electron electron/electron-main.cjs"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "All services started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:5000" -ForegroundColor White
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "Electron: Desktop App" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop this script (services will continue running)" -ForegroundColor Yellow
Write-Host "To stop all services, run: Get-Process | Where-Object {`$_.ProcessName -eq 'node' -or `$_.ProcessName -eq 'electron'} | Stop-Process -Force" -ForegroundColor Yellow
Write-Host ""

# Keep script running
while ($true) {
    Start-Sleep -Seconds 10
    # Check if services are still running
    $nodeCount = (Get-Process | Where-Object {$_.ProcessName -eq "node"}).Count
    $electronCount = (Get-Process | Where-Object {$_.ProcessName -eq "electron"}).Count
    $timestamp = Get-Date -Format 'HH:mm:ss'
    Write-Host "[$timestamp] Services running - Node: $nodeCount, Electron: $electronCount" -ForegroundColor Gray
}
