@echo off
title EduLens - AI-Powered Learning Assistant
cd /d "%~dp0..\app"

echo ========================================
echo    EduLens - AI Learning Assistant
echo ========================================
echo.
echo Starting application...
echo.

REM Kill any existing processes
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM electron.exe >nul 2>&1

REM Start backend server
echo [1/3] Starting backend server...
start "EduLens Backend" /min node backend\server.js

REM Wait for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend (Vite dev server)
echo [2/3] Starting frontend...
start "EduLens Frontend" /min npm run dev

REM Wait for frontend to start
timeout /t 5 /nobreak >nul

REM Start Electron app
echo [3/3] Launching Electron app...
npm run electron

echo.
echo EduLens is now running!
pause
