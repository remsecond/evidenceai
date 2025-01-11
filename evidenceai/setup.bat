@echo off
echo Setting up EvidenceAI Development Environment...

:: Create required directories
if not exist .cline mkdir .cline
if not exist session_logs mkdir session_logs
if not exist demos mkdir demos
if not exist scripts mkdir scripts

:: Ensure test-server.js exists in scripts directory
if not exist "scripts\test-server.js" (
    echo Error: Missing required file scripts/test-server.js
    exit /b 1
)

:: Install dependencies
call npm install

:: Initialize development context
call node cline-init.js

echo.
echo Setup complete! To start development:
echo 1. Open dev_protocol.html in Edge
echo 2. Click "Start Server"
echo 3. Wait for green connection indicator
echo 4. Click "Open Workspace"
