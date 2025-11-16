@echo off
echo ========================================
echo Starting EduLens - All Services
echo ========================================
echo.

REM Kill any existing node processes
echo Stopping existing processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM electron.exe 2>nul
timeout /t 2 /nobreak >nul

REM Start backend server
echo.
echo [1/3] Starting Backend Server (Port 5000)...
start "EduLens Backend" cmd /k "cd /d %~dp0 && node backend/server.js"
timeout /t 3 /nobreak >nul

REM Start Vite dev server
echo.
echo [2/3] Starting Vite Dev Server (Port 5173)...
start "EduLens Vite" cmd /k "cd /d %~dp0 && npx vite --config config/vite.config.js"
timeout /t 8 /nobreak >nul

REM Start Electron app
echo.
echo [3/3] Starting Electron App...
start "EduLens Electron" cmd /k "cd /d %~dp0 && set ELECTRON_START_URL=http://localhost:5173 && npx electron electron/electron-main.cjs"

echo.
echo ========================================
echo All services started!
echo ========================================
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo Electron: Desktop App
echo ========================================
echo.
echo Press any key to stop all services...
pause >nul

REM Stop all services
echo.
echo Stopping all services...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM electron.exe 2>nul
echo Done!
