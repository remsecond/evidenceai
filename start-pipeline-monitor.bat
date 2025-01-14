@echo off
echo Starting Evidence Pipeline Monitor...
echo.

REM Check if node is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is required but not found.
    echo Please install Node.js from https://nodejs.org/
    exit /b 1
)

REM Start the pipeline server
start "Pipeline Server" cmd /c "node scripts/pipeline-server.js"

REM Wait for server to start
timeout /t 2 /nobreak >nul

REM Start the web server for the monitor interface
start "Web Server" cmd /c "node scripts/web-server.js"

REM Wait for web server to start
timeout /t 2 /nobreak >nul

REM Open the monitor in default browser
start http://localhost:3000/pipeline-monitor.html

echo.
echo Pipeline Monitor started!
echo.
echo Servers running:
echo - Pipeline Server: http://localhost:3000
echo - Monitor Interface: http://localhost:3000/pipeline-monitor.html
echo.
echo Press Ctrl+C in the server windows to stop the servers.
echo.
