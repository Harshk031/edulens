@echo off
title EduLens - Complete Fixed Launcher
color 0A
echo.
echo ================================================
echo    EduLens - COMPLETE FIXED LAUNCHER
echo    All Root Causes Addressed
echo ================================================
echo.

cd /d "C:\Users\Harsh\OneDrive\Desktop\backup\EduLens\app"

REM ===========================================
REM PHASE 1: AGGRESSIVE CLEANUP
REM ===========================================
echo [Phase 1] AGGRESSIVE CLEANUP...
echo       Killing all node processes...
taskkill /F /IM node.exe /T >nul 2>&1
echo       Killing all electron processes...
taskkill /F /IM electron.exe /T >nul 2>&1
timeout /t 3 /nobreak >nul
echo       ✅ Cleanup complete!
echo.

REM ===========================================
REM PHASE 2: VERIFY PORT 5000 IS FREE
REM ===========================================
echo [Phase 2] VERIFYING PORT 5000...
netstat -ano | findstr ":5000.*LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo       ⚠️ Port 5000 still occupied! Killing process...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000.*LISTENING"') do (
        taskkill /F /PID %%a /T >nul 2>&1
    )
    timeout /t 3 /nobreak >nul
    
    REM Double-check port is actually free
    netstat -ano | findstr ":5000.*LISTENING" >nul 2>&1
    if %errorlevel%==0 (
        echo       ❌ FAILED to free port 5000!
        echo       Backend will not start. Exiting...
        pause
        exit /b 1
    )
)
echo       ✅ Port 5000 is FREE!
echo.

REM ===========================================
REM PHASE 3: START BACKEND ON PORT 5000
REM ===========================================
echo [1/4] Starting Backend Server...
echo       Target: http://localhost:5000 (FORCED)
start "EduLens Backend" powershell -NoProfile -Command "$host.UI.RawUI.WindowTitle = 'EduLens Backend - Port 5000'; cd 'C:\Users\Harsh\OneDrive\Desktop\backup\EduLens\app'; Write-Host ''; Write-Host '================================' -ForegroundColor Cyan; Write-Host '  BACKEND SERVER' -ForegroundColor Cyan; Write-Host '  Port: 5000 (FORCED)' -ForegroundColor Yellow; Write-Host '  Faster Whisper: PRIMARY' -ForegroundColor Green; Write-Host '  whisper.cpp: Fallback only' -ForegroundColor Gray; Write-Host '================================' -ForegroundColor Cyan; Write-Host ''; `$env:PORT='5000'; node --expose-gc backend/server.js"
echo       Waiting for backend to initialize...
timeout /t 12 /nobreak >nul

REM Verify backend started on port 5000
netstat -ano | findstr ":5000.*LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo       ✅ Backend is running on PORT 5000!
) else (
    echo       ❌ Backend is NOT on port 5000! Check Backend window!
    echo       Press any key to continue anyway...
    pause >nul
)
echo.

REM ===========================================
REM PHASE 4: START VITE FRONTEND
REM ===========================================
echo [Phase 4] STARTING VITE FRONTEND...
echo       Target: http://localhost:5173
start "EduLens Frontend" powershell -NoProfile -Command "$host.UI.RawUI.WindowTitle = 'EduLens Frontend - Port 5173'; cd 'C:\Users\Harsh\OneDrive\Desktop\backup\EduLens\app'; Write-Host ''; Write-Host '================================' -ForegroundColor Cyan; Write-Host '  FRONTEND (Vite)' -ForegroundColor Cyan; Write-Host '  Port: 5173' -ForegroundColor Yellow; Write-Host '  Proxy: http://localhost:5000' -ForegroundColor Yellow; Write-Host '================================' -ForegroundColor Cyan; Write-Host ''; npm run dev:frontend"
echo       Waiting for Vite to initialize...
timeout /t 15 /nobreak >nul

REM Verify Vite started on port 5173
netstat -ano | findstr ":5173.*LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo       ✅ Vite is running on PORT 5173!
) else (
    echo       ❌ Vite is NOT running! Check Frontend window!
    echo       Press any key to continue anyway...
    pause >nul
)
echo.

REM ===========================================
REM PHASE 5: START ELECTRON APP
REM ===========================================
echo [Phase 5] STARTING ELECTRON APP...
start "EduLens Electron" powershell -NoProfile -Command "$host.UI.RawUI.WindowTitle = 'EduLens Electron'; cd 'C:\Users\Harsh\OneDrive\Desktop\backup\EduLens\app'; Write-Host ''; Write-Host '================================' -ForegroundColor Cyan; Write-Host '  ELECTRON APP' -ForegroundColor Cyan; Write-Host '  Loading from: http://localhost:5173' -ForegroundColor Yellow; Write-Host '================================' -ForegroundColor Cyan; Write-Host ''; Write-Host 'Waiting 3 seconds...' -ForegroundColor Gray; Start-Sleep -Seconds 3; npm run dev:electron"
echo       Electron starting...
timeout /t 8 /nobreak >nul
echo.

REM ===========================================
REM FINAL VERIFICATION
REM ===========================================
echo ================================================
echo        ✅ EDULENS STARTUP COMPLETE!
echo ================================================
echo.
echo 🔍 VERIFICATION:
echo    Backend:  Port 5000 (check netstat)
echo    Vite:     Port 5173 (check netstat)
echo    Electron: Starting now
echo.
echo 🎯 ROOT CAUSES FIXED:
echo    1. Port 5000 conflict - FIXED (aggressive cleanup)
echo    2. Backend on wrong port - FIXED (forced to 5000)
echo    3. Missing Vite - FIXED (included in startup)
echo    4. Transcript hanging - FIXED (Faster Whisper)
echo.
echo 💡 IF DEBUG PANEL SHOWS ERRORS:
echo    1. Check Backend window - is it on port 5000?
echo    2. Check Frontend window - is it proxying to 5000?
echo    3. Wait 10 seconds, then press Ctrl+R
echo.
echo 🪟 YOU SHOULD SEE:
echo    1. Backend window (port 5000)
echo    2. Frontend window (port 5173)
echo    3. Electron window (launcher)
echo    4. Electron app (main application)
echo.
echo Press any key to close this launcher...
pause >nul
