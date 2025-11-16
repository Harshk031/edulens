@echo off
REM EduLens Complete Startup Script
REM Starts all components in correct order with proper checks

echo.
echo ========================================
echo   EduLens - Complete Startup
echo ========================================
echo.

REM Kill any existing processes
echo [1/4] Cleaning up old processes...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM electron.exe >nul 2>&1
timeout /t 2 >nul
echo       Done!
echo.

REM Start Backend
echo [2/4] Starting Backend Server (port 5000)...
start "EduLens Backend" cmd /k "cd /d C:\Users\Harsh\OneDrive\Desktop\backup\EduLens\app && echo ================================ && echo   BACKEND SERVER (Port 5000) && echo ================================ && echo. && node --expose-gc backend/server.js"
timeout /t 8 >nul
echo       Backend started!
echo.

REM Start Frontend (Vite)
echo [3/4] Starting Frontend (Vite - port 5173)...
start "EduLens Frontend" cmd /k "cd /d C:\Users\Harsh\OneDrive\Desktop\backup\EduLens\app && echo ================================ && echo   FRONTEND (Vite - Port 5173) && echo ================================ && echo. && npm run dev:frontend"
timeout /t 12 >nul
echo       Frontend started!
echo.

REM Start Electron
echo [4/4] Starting Electron App...
start "EduLens Electron" cmd /k "cd /d C:\Users\Harsh\OneDrive\Desktop\backup\EduLens\app && echo ================================ && echo   ELECTRON APP && echo ================================ && echo. && timeout /t 3 >nul && npm run dev:electron"
timeout /t 5 >nul
echo       Electron starting...
echo.

echo ========================================
echo   EduLens Started Successfully!
echo ========================================
echo.
echo You should see 3 windows:
echo   1. Backend Server (port 5000)
echo   2. Frontend Vite (port 5173)
echo   3. Electron App (main window)
echo.
echo Press any key to close this launcher...
pause >nul
