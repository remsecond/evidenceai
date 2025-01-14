@echo off
echo Preparing evidence files for ChatGPT analysis...
echo.

REM Create required directories
if not exist "processed" mkdir processed
if not exist "processed\analysis" mkdir processed\analysis

REM Run the preparation script
node scripts/prepare-chatgpt-evidence.js

REM Check if script ran successfully
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Error: Failed to prepare evidence files
    exit /b 1
)

echo.
echo Files prepared successfully!
echo.
echo Next steps:
echo 1. Open processed/chatgpt-input/README.md
echo 2. Follow the upload instructions
echo 3. Save ChatGPT's analysis in processed/analysis/
echo.
echo Press any key to open the README...
pause > nul

REM Open the README file
start processed/chatgpt-input/README.md
