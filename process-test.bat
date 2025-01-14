@echo off
echo EvidenceAI Test Processing
echo.

REM Check if Node.js is installed
powershell -Command "if (!(Get-Command node -ErrorAction SilentlyContinue)) { exit 1 }"
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is required but not found
    echo Please install Node.js from https://nodejs.org/
    exit /b 1
)

REM Create input directory if it doesn't exist
if not exist "input" mkdir input

REM Copy test files if provided
if "%~1" NEQ "" (
    echo Copying test files from %~1...
    xcopy /Y /I "%~1\*.*" "input\"
)

REM Process files
echo.
echo Processing evidence files...
node scripts/process-evidence.js input

REM Open output directory
if exist "processed\combined" (
    echo.
    echo Opening output directory...
    start "" "processed\combined"
)
