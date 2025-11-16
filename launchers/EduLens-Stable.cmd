@echo off
title EduLens - Stable Desktop Launcher
color 0A
echo.
echo ================================================
echo      EduLens - Stable Desktop Launcher
echo ================================================
echo.

REM Change to app directory
cd /d "C:\Users\Harsh\OneDrive\Desktop\backup\EduLens\app"

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ ERROR: Cannot find package.json
    echo Current directory: %CD%
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

echo ✅ Found package.json - proceeding with launch
echo.

echo [1/4] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: Node.js not found or not in PATH
    echo Please install Node.js or add it to PATH
    pause
    exit /b 1
)
echo ✅ Node.js is available

echo.
echo [2/4] Starting Backend Server...
echo Starting: node backend/server.js
start /B "EduLens-Backend" cmd /c "cd /d %CD% && node backend/server.js"

echo.
echo [3/4] Waiting for backend to initialize...
echo Please wait 10 seconds...
timeout /t 10 /nobreak

echo.
echo [4/4] Starting Electron Desktop App...
echo Starting: npm run start
start "EduLens-Desktop-App" cmd /c "cd /d %CD% && npm run start"

echo.
echo ================================================
echo         🎉 LAUNCH SEQUENCE COMPLETE!
echo ================================================
echo.
echo ✅ Backend Server: Starting on port 5000
echo ✅ Desktop App:    Launching Electron
echo ✅ LM Studio:      http://192.168.29.151:1234
echo ✅ Mode:           Desktop Only Application
echo.
echo 🚀 EduLens Desktop App should open shortly...
echo 💡 This launcher will stay open for monitoring
echo.
echo ================================================
echo              LAUNCHER STATUS
echo ================================================
echo.
echo If the app doesn't open:
echo 1. Check if Node.js is installed
echo 2. Check if npm dependencies are installed
echo 3. Check console for error messages
echo.
echo Press 'X' to close this launcher window
echo Press 'R' to restart the application
echo Press 'S' to show status
echo.

:menu
set /p choice="Enter choice (X/R/S): "
if /i "%choice%"=="X" goto exit
if /i "%choice%"=="R" goto restart
if /i "%choice%"=="S" goto status
goto menu

:status
echo.
echo Checking application status...
tasklist /FI "IMAGENAME eq node.exe" | find "node.exe" >nul
if errorlevel 1 (
    echo ❌ Backend: Not running
) else (
    echo ✅ Backend: Running
)

tasklist /FI "IMAGENAME eq electron.exe" | find "electron.exe" >nul
if errorlevel 1 (
    echo ❌ Desktop App: Not running
) else (
    echo ✅ Desktop App: Running
)
echo.
goto menu

:restart
echo.
echo Restarting application...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM electron.exe 2>nul
timeout /t 2 /nobreak >nul
goto start_services

:start_services
echo Restarting backend...
start /B "EduLens-Backend" cmd /c "cd /d %CD% && node backend/server.js"
timeout /t 8 /nobreak >nul
echo Restarting desktop app...
start "EduLens-Desktop-App" cmd /c "cd /d %CD% && npm run start"
echo Restart complete!
goto menu

:exit
echo.
echo Closing EduLens Launcher...
echo Thank you for using EduLens!
timeout /t 2 /nobreak >nul
