@echo off
title EduLens - Fixed Desktop Launcher
color 0A
echo.
echo ================================================
echo      EduLens - Fixed Desktop Launcher
echo ================================================
echo.

cd /d "C:\Users\Harsh\OneDrive\Desktop\backup\EduLens\app"

echo ✅ Changed to app directory: %CD%
echo.

echo [1/3] Starting Backend Server...
start /B "EduLens-Backend" node backend/server.js

echo [2/3] Waiting for backend initialization...
echo Please wait 8 seconds...
timeout /t 8 /nobreak >nul

echo [3/3] Starting Desktop Application...
echo Running: npm run start
npm run start

echo.
echo If you see this message, the app should be running!
pause
