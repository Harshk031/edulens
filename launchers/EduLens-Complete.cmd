@echo off
title EduLens - Complete Desktop Launcher
color 0A
echo.
echo ================================================
echo     EduLens - Complete Desktop Launcher
echo ================================================
echo.

cd /d "C:\Users\Harsh\OneDrive\Desktop\backup\EduLens\app"

echo ✅ Working directory: %CD%
echo.

echo [1/4] Starting Backend Server...
start /B "EduLens-Backend" node backend/server.js
echo ✅ Backend starting on port 5000

echo.
echo [2/4] Waiting for backend initialization...
timeout /t 8 /nobreak >nul
echo ✅ Backend should be ready

echo.
echo [3/4] Starting Frontend (Vite)...
start /B "EduLens-Frontend" npm run dev:frontend
echo ✅ Frontend starting on port 5173

echo.
echo [4/4] Waiting for frontend to be ready...
echo Please wait 15 seconds for Vite to compile...
timeout /t 15 /nobreak >nul

echo.
echo ================================================
echo        🚀 LAUNCHING DESKTOP APP
echo ================================================
echo.
echo ✅ Backend:  http://localhost:5000
echo ✅ Frontend: http://localhost:5173
echo ✅ Now launching Electron Desktop App...
echo.

npm run start

echo.
echo ================================================
echo         📱 DESKTOP APP LAUNCHED!
echo ================================================
echo.
echo If you see a white screen:
echo 1. Wait a few more seconds for loading
echo 2. Check if ports 5000 and 5173 are accessible
echo 3. Press Ctrl+Shift+I in the app to see console
echo.
echo Press any key to close this launcher...
pause >nul
