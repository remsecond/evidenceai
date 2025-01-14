@echo off
echo Running Universal Processor Test Suite...
echo.
echo This will process the test data in all possible combinations:
echo 1. Complete Dataset (OFW + Email PDF + Email ODS)
echo 2. OFW + Email PDF Only
echo 3. OFW Only
echo 4. Email PDF + ODS Only
echo.
echo Results will be saved to the 'processed' directory
echo.

REM Ensure Node.js is available
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is required but not found in PATH
    exit /b 1
)

REM Check if test data exists
if not exist "C:\Users\robmo\OneDrive\Documents\evidenceai_test\input\3_File_Nov_Jan_Test" (
    echo Error: Test data directory not found
    echo Expected: C:\Users\robmo\OneDrive\Documents\evidenceai_test\input\3_File_Nov_Jan_Test
    exit /b 1
)

REM Create processed directory if it doesn't exist
if not exist "processed" mkdir processed

echo Starting processor...
echo.

node scripts/process-test-data.js

echo.
echo Processing complete! Check the 'processed' directory for results.
echo.
echo Each combination has generated:
echo - JSON file containing the complete brief
echo - TXT file containing the LLM prompt
echo.
echo You can now analyze how the processor handles different source combinations
echo and how the confidence scores adjust based on available data.
