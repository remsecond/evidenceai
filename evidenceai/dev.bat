@echo off
echo Starting EvidenceAI Development Environment...

:: Set working directory
cd /d "%~dp0"

:: Create required directories if they don't exist
if not exist .cline mkdir .cline
if not exist session_logs mkdir session_logs
if not exist demos mkdir demos

:: Initialize context if needed
if not exist .cline\context.json (
    echo Initializing development context...
    node cline-init.js
) else (
    echo Loading existing context...
)

:: Start VSCode with EvidenceAI context
echo Starting VSCode with EvidenceAI context...
code evidenceai.code-workspace

:: Start development server if not running
echo Checking development server...
curl -s http://localhost:3456/health >nul 2>&1
if errorlevel 1 (
    echo Starting development server...
    start "EvidenceAI Server" cmd /c "npm run test:server"
    timeout /t 2 >nul
)

echo Development environment ready
echo Open dev_protocol.html in Edge to access Mission Control
