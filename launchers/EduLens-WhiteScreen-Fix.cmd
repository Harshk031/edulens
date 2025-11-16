@echo off
title EduLens - White Screen Fix Launcher
color 0A
echo.
echo ================================================
echo    EduLens - White Screen Fix Launcher
echo ================================================
echo.

cd /d "C:\Users\Harsh\OneDrive\Desktop\backup\EduLens\app"

echo ✅ Working directory: %CD%
echo.

echo [1/4] Starting Backend Server...
start /B "EduLens-Backend" node backend/server.js
echo ✅ Backend starting...

echo.
echo [2/4] Waiting for backend to initialize...
timeout /t 8 /nobreak >nul
echo ✅ Backend ready

echo.
echo [3/4] Starting Frontend (Vite) - FIXED VERSION...
start /B "EduLens-Frontend" npm run dev:frontend
echo ✅ Frontend starting with fixed configuration...

echo.
echo [4/4] Waiting for frontend to compile and be ready...
echo This may take 15-20 seconds for first-time compilation...
timeout /t 20 /nobreak >nul

echo.
echo ================================================
echo         🧪 TESTING SERVICES
echo ================================================
echo.

echo Testing backend...
curl -s http://localhost:5000/health >nul 2>&1
if errorlevel 1 (
    echo ❌ Backend not responding
) else (
    echo ✅ Backend responding
)

echo Testing frontend...
curl -s http://localhost:5173 >nul 2>&1
if errorlevel 1 (
    echo ❌ Frontend not responding - will cause white screen
    echo.
    echo 🔧 TROUBLESHOOTING:
    echo 1. Check if Vite compiled successfully
    echo 2. Look for errors in the frontend window
    echo 3. Try opening http://localhost:5173 in browser first
    echo.
    pause
    exit /b 1
) else (
    echo ✅ Frontend responding - ready for Electron!
)

echo.
echo ================================================
echo        🚀 LAUNCHING ELECTRON APP
echo ================================================
echo.
echo Both services are ready - launching desktop app...
echo.

npm run start

echo.
echo ================================================
echo If you still see white screen:
echo 1. Press Ctrl+Shift+I in Electron to open DevTools
echo 2. Check Console tab for errors
echo 3. Check Network tab for failed requests
echo ================================================
echo.
pause
