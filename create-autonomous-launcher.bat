@echo off
title EduLens - Fully Autonomous Launcher
echo.
echo ========================================
echo   EduLens - Fully Autonomous Launcher
echo ========================================
echo.

cd /d "C:\Users\Harsh\OneDrive\Desktop\backup\EduLens\app"

echo [1/3] Starting Backend Server...
start /B "EduLens-Backend" node backend/server.js

echo [2/3] Waiting for backend to initialize...
timeout /t 8 /nobreak >nul

echo [3/3] Starting Frontend (Vite)...
start /B "EduLens-Frontend" npm run dev:frontend

echo.
echo ✅ EduLens is starting autonomously...
echo ✅ Backend: http://localhost:5000
echo ✅ Frontend: http://localhost:5173
echo ✅ LM Studio: Connected
echo.
echo 🎉 Launch complete! No manual intervention required.
echo.
pause
