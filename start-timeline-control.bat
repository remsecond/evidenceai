@echo off
echo Starting EvidenceAI Timeline Control...

:: Install dependencies
echo Installing dependencies...
call npm install express cors

:: Set environment variables
set NODE_ENV=development
set PORT=3002

:: Start the timeline server
echo Starting Timeline Server on port %PORT%...
start "Timeline Server" cmd /c "node scripts/timeline-server.js"

:: Wait a moment for the server to start using PowerShell
powershell -Command "Start-Sleep -Seconds 2"

:: Open the interface in default browser
echo Opening Timeline Control interface...
start http://localhost:%PORT%

echo.
echo Timeline Control is running!
echo Press Ctrl+C in the server window to stop.
