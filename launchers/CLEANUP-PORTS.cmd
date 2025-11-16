@echo off
REM Port Cleanup Utility
REM Kills all processes on ports 5000 and 5173

title Port Cleanup Utility
color 0A

echo.
echo ================================================
echo    Port Cleanup Utility
echo    Frees ports 5000 and 5173
echo ================================================
echo.

REM Check port 5000
echo [1/2] Checking port 5000...
netstat -ano | findstr ":5000.*LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo       Port 5000 is OCCUPIED
    echo       Finding and killing process...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000.*LISTENING"') do (
        echo       Killing PID: %%a
        taskkill /F /PID %%a /T >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
    
    REM Verify
    netstat -ano | findstr ":5000.*LISTENING" >nul 2>&1
    if %errorlevel%==0 (
        echo       [FAILED] Port 5000 still occupied!
    ) else (
        echo       [SUCCESS] Port 5000 is now FREE
    )
) else (
    echo       Port 5000 is already FREE
)
echo.

REM Check port 5173
echo [2/2] Checking port 5173...
netstat -ano | findstr ":5173.*LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo       Port 5173 is OCCUPIED
    echo       Finding and killing process...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173.*LISTENING"') do (
        echo       Killing PID: %%a
        taskkill /F /PID %%a /T >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
    
    REM Verify
    netstat -ano | findstr ":5173.*LISTENING" >nul 2>&1
    if %errorlevel%==0 (
        echo       [FAILED] Port 5173 still occupied!
    ) else (
        echo       [SUCCESS] Port 5173 is now FREE
    )
) else (
    echo       Port 5173 is already FREE
)
echo.

REM Kill all node and electron processes for good measure
echo [EXTRA] Killing all node and electron processes...
taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /IM electron.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul
echo       Done!
echo.

echo ================================================
echo    Cleanup Complete!
echo ================================================
echo.
echo Ports 5000 and 5173 should now be free.
echo You can now start EduLens safely.
echo.
pause
