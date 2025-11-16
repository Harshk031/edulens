# EduLens Master Startup Script
# Starts all components in the correct order

$appPath = "C:\Users\Harsh\OneDrive\Desktop\backup\EduLens\app"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  EduLens - Master Startup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Kill any existing processes
Write-Host "[1/4] Cleaning up old processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "      Done!" -ForegroundColor Green
Write-Host ""

# Start Backend
Write-Host "[2/4] Starting Backend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$appPath'; Write-Host ''; Write-Host '==================================' -ForegroundColor Cyan; Write-Host '  BACKEND SERVER (Port 5000)' -ForegroundColor Cyan; Write-Host '==================================' -ForegroundColor Cyan; Write-Host ''; node --expose-gc backend/server.js"
) -WindowStyle Normal
Start-Sleep -Seconds 8
Write-Host "      Backend started on port 5000" -ForegroundColor Green
Write-Host ""

# Start Frontend
Write-Host "[3/4] Starting Frontend (Vite)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$appPath'; Write-Host ''; Write-Host '==================================' -ForegroundColor Cyan; Write-Host '  FRONTEND (Vite - Port 5173)' -ForegroundColor Cyan; Write-Host '==================================' -ForegroundColor Cyan; Write-Host ''; npm run dev:frontend"
) -WindowStyle Normal
Start-Sleep -Seconds 10
Write-Host "      Frontend started on port 5173" -ForegroundColor Green
Write-Host ""

# Start Electron
Write-Host "[4/4] Starting Electron App..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$appPath'; Write-Host ''; Write-Host '==================================' -ForegroundColor Cyan; Write-Host '  ELECTRON APP' -ForegroundColor Cyan; Write-Host '==================================' -ForegroundColor Cyan; Write-Host ''; Start-Sleep -Seconds 3; npm run dev:electron"
) -WindowStyle Normal
Start-Sleep -Seconds 5
Write-Host "      Electron app launching..." -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "  EduLens Started Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "You should now see 3 windows:" -ForegroundColor Cyan
Write-Host "  1. Backend Server (port 5000)" -ForegroundColor White
Write-Host "  2. Frontend Vite (port 5173)" -ForegroundColor White
Write-Host "  3. Electron App (main window)" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit this launcher..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
