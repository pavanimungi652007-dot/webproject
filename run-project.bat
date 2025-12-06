@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo Vehicle Service Booking - Full Run
echo ========================================
echo.

REM Kill any process on port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do (
  taskkill /PID %%a /F >nul 2>&1
)
echo Port 3000 cleared.
timeout /t 1 /nobreak >nul

REM Start server in background
echo Starting server...
cd /d C:\lastpro
start "AutoCare Server" npm start
timeout /t 3 /nobreak >nul

REM Run E2E test
echo Running end-to-end test...
powershell -File C:\lastpro\run-e2e.ps1

echo.
echo ========================================
echo Run Complete
echo ========================================
echo Server is running on http://localhost:3000
echo Open in browser to test signup/login/bookings
echo.
pause
