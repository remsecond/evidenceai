@echo off
echo Testing ChatGPT Evidence Preparation System
echo.

REM Clean up any existing processed files
if exist "processed" (
    echo Cleaning up previous test files...
    rmdir /s /q "processed"
)

REM Run the test script
echo Running tests...
echo.
node scripts/test-chatgpt-prep.js

REM Check if tests passed
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Tests failed! Please check the error messages above.
    exit /b 1
)

echo.
echo Test successful! Generated files:
echo.
echo processed/chatgpt-input/
echo - README.md           (Step-by-step instructions)
echo - manifest.json       (File tracking)
echo - [evidence files]    (Formatted for analysis)
echo.
echo processed/analysis/
echo - evidence-report.md  (Analysis template)
echo - findings.json       (Structured data template)
echo - review-notes.md     (Quality checklist)
echo.
echo Next steps:
echo 1. Review the generated files in processed/chatgpt-input/
echo 2. Follow the instructions in README.md
echo 3. Save ChatGPT's analysis in processed/analysis/
echo.
echo Press any key to open the instructions...
pause > nul

REM Open the README file
start processed/chatgpt-input/README.md
