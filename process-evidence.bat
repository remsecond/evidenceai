@echo off
echo EvidenceAI Processing Tool
echo.

REM Check if input file was provided
if "%~1"=="" (
    echo Error: Please provide an input file
    echo Usage: process-evidence.bat [file]
    echo Example: process-evidence.bat evidence.txt
    exit /b 1
)

REM Check if file exists
if not exist "%~1" (
    echo Error: File not found: %~1
    exit /b 1
)

REM Check if Node.js is installed
powershell -Command "if (!(Get-Command node -ErrorAction SilentlyContinue)) { exit 1 }"
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is required but not found
    echo Please install Node.js from https://nodejs.org/
    exit /b 1
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo Error: Failed to install dependencies
        exit /b 1
    )
)

REM Create output directories if they don't exist
if not exist "processed" mkdir processed

REM Process the evidence file
echo Processing %~1...
echo.

node scripts/process-evidence.js "%~1"

echo.
if %ERRORLEVEL% EQU 0 (
    echo Processing completed successfully!
) else (
    echo Processing failed with error code %ERRORLEVEL%
)
