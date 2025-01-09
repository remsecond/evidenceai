@echo off
echo Setting up EvidenceAI Development Environment...

:: Create required directories
if not exist .cline mkdir .cline
if not exist session_logs mkdir session_logs
if not exist demos mkdir demos
if not exist scripts mkdir scripts

:: Clean npm cache and remove node_modules
echo Cleaning previous installation...
rmdir /s /q node_modules 2>nul
del package-lock.json 2>nul

:: Install dependencies
echo Installing dependencies...
call npm install --no-package-lock

:: Initialize development context
echo Initializing development context...
call node cline-init.js

echo.
echo Setup complete! To start development:
echo 1. Open dev_protocol.html in Edge
echo 2. Click "Start Server"
echo 3. Wait for green connection indicator
echo 4. Click "Open Workspace"

echo.
echo Press any key to continue...
pause >nul
