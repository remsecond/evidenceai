@echo off
echo Starting EvidenceAI Mission Control...
echo.

REM Check if Node.js is installed
%SystemRoot%\System32\where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is required but not found.
    echo Please install Node.js from https://nodejs.org/
    exit /b 1
)

REM Kill any existing node processes
echo Cleaning up existing processes...
%SystemRoot%\System32\taskkill /F /IM node.exe >nul 2>&1

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo Error: Failed to install dependencies
        exit /b 1
    )
)

REM Create required directories
if not exist "uploads" mkdir uploads
if not exist "processed" mkdir processed
if not exist "processed\pipeline" mkdir processed\pipeline

REM Set ports and ensure they're free
set PIPELINE_PORT=3000
set WEB_PORT=3001

echo Checking ports...
%SystemRoot%\System32\netstat -ano | %SystemRoot%\System32\findstr ":%PIPELINE_PORT%" >nul
if %ERRORLEVEL% EQU 0 (
    echo Error: Port %PIPELINE_PORT% is already in use
    exit /b 1
)
%SystemRoot%\System32\netstat -ano | %SystemRoot%\System32\findstr ":%WEB_PORT%" >nul
if %ERRORLEVEL% EQU 0 (
    echo Error: Port %WEB_PORT% is already in use
    exit /b 1
)

REM Start pipeline server
echo Starting pipeline server on port %PIPELINE_PORT%...
start "Pipeline Server" cmd /c "set PORT=%PIPELINE_PORT% && node scripts/pipeline-server.js"

REM Wait for server to start
%SystemRoot%\System32\timeout /t 2 /nobreak >nul

REM Start web server
echo Starting web server on port %WEB_PORT%...
start "Web Server" cmd /c "set WEB_PORT=%WEB_PORT% && node scripts/web-server.js"

REM Wait for web server to start
%SystemRoot%\System32\timeout /t 2 /nobreak >nul

REM Open Mission Control in default browser
echo Opening Mission Control...
start http://localhost:%WEB_PORT%/mission-control.html

echo.
echo Mission Control started!
echo.
echo Servers running:
echo - Pipeline Server: http://localhost:%PIPELINE_PORT%
echo - Web Server: http://localhost:%WEB_PORT%
echo.
echo Press Ctrl+C in the server windows to stop the servers.
echo.
