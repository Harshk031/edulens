@echo off
REM EduLens Complete Startup Script - FINAL VERSION
REM This script starts all components properly

echo.
echo ========================================
echo   EduLens - Complete Startup
echo ========================================
echo.

REM Kill any existing processes
echo [1/4] Cleaning up old processes...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM electron.exe >nul 2>&1
timeout /t 3 >nul
echo       Done!
echo.

REM Start Backend
echo [2/4] Starting Backend Server...
start "EduLens Backend" powershell -NoProfile -Command "$host.UI.RawUI.WindowTitle = 'EduLens Backend'; cd 'C:\Users\Harsh\OneDrive\Desktop\backup\EduLens\app'; Write-Host ''; Write-Host '================================' -ForegroundColor Cyan; Write-Host '  BACKEND SERVER (Port 5000)' -ForegroundColor Cyan; Write-Host '================================' -ForegroundColor Cyan; Write-Host ''; node backend/server.js"
timeout /t 10 >nul
echo       Backend started!
echo.

REM Start Frontend (Vite)
echo [3/4] Starting Frontend (Vite)...
start "EduLens Frontend" powershell -NoProfile -Command "$host.UI.RawUI.WindowTitle = 'EduLens Frontend'; cd 'C:\Users\Harsh\OneDrive\Desktop\backup\EduLens\app'; Write-Host ''; Write-Host '================================' -ForegroundColor Cyan; Write-Host '  FRONTEND (Vite - Port 5173)' -ForegroundColor Cyan; Write-Host '================================' -ForegroundColor Cyan; Write-Host ''; npm run dev:frontend"
timeout /t 15 >nul
echo       Frontend started!
echo.

REM Start Electron
echo [4/4] Starting Electron App...
start "EduLens Electron" powershell -NoProfile -Command "$host.UI.RawUI.WindowTitle = 'EduLens Electron'; cd 'C:\Users\Harsh\OneDrive\Desktop\backup\EduLens\app'; Write-Host ''; Write-Host '================================' -ForegroundColor Cyan; Write-Host '  ELECTRON APP' -ForegroundColor Cyan; Write-Host '================================' -ForegroundColor Cyan; Write-Host ''; Write-Host 'Waiting 3 seconds...' -ForegroundColor Gray; Start-Sleep -Seconds 3; npm run dev:electron"
timeout /t 5 >nul
echo       Electron starting...
echo.

echo ========================================
echo   EduLens Started Successfully!
echo ========================================
echo.
echo You should see:
echo   1. Backend window (port 5000)
echo   2. Frontend window (port 5173)
echo   3. Electron window (starting)
echo   4. Electron app (opens in ~10 seconds)
echo.
echo If debug panel shows errors:
echo   Wait 10 seconds, then press Ctrl+R
echo.
echo Press any key to close this launcher...
pause >nul
