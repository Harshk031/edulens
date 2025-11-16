@echo off
REM EduLens Verification Script
REM Checks if all components are running correctly

echo.
echo ========================================
echo   EduLens - System Verification
echo ========================================
echo.

REM Check Backend
echo [1/4] Checking Backend Server...
netstat -ano | findstr ":5000.*LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo       [OK] Backend is listening on port 5000
) else (
    echo       [ERROR] Backend is NOT running!
)
echo.

REM Check Frontend
echo [2/4] Checking Frontend (Vite)...
netstat -ano | findstr ":5173.*LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo       [OK] Vite is listening on port 5173
) else (
    echo       [ERROR] Vite is NOT running!
)
echo.

REM Check Electron
echo [3/4] Checking Electron...
tasklist | findstr "electron.exe" >nul 2>&1
if %errorlevel%==0 (
    echo       [OK] Electron is running
) else (
    echo       [ERROR] Electron is NOT running!
)
echo.

REM Test Backend API
echo [4/4] Testing Backend API...
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:5000/api/health' -TimeoutSec 3 -ErrorAction Stop; Write-Host '      [OK] Backend API responds: ' $r.StatusCode } catch { Write-Host '      [ERROR] Backend API not responding!' }"
echo.

echo ========================================
echo   Verification Complete
echo ========================================
echo.
echo If all checks show [OK], EduLens is ready!
echo If any show [ERROR], run START-EDULENS-COMPLETE.bat
echo.
pause
