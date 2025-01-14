@echo off
echo Testing Full Pipeline with Sample Data...
echo.

REM Create test directories if they don't exist
if not exist "uploads" mkdir uploads
if not exist "processed" mkdir processed

REM Copy sample files to uploads
echo Preparing test files...
copy "simple-pdf-processor\test\fixtures\sample-ofw.txt" "uploads\test-ofw.txt" >nul
copy "simple-pdf-processor\test\fixtures\sample-email.txt" "uploads\test-email.txt" >nul
copy "simple-pdf-processor\test\fixtures\sample-records.json" "uploads\test-records.json" >nul
copy "simple-pdf-processor\test\fixtures\sample-records.csv" "uploads\test-records.csv" >nul

REM Start the pipeline monitor
echo Starting pipeline monitor...
call start-pipeline-monitor.bat

REM Wait for servers to start
timeout /t 3 /nobreak >nul

REM Trigger pipeline processing via API
echo.
echo Triggering pipeline processing...
curl -X POST http://localhost:3000/process

echo.
echo Test Setup Complete!
echo.
echo The pipeline monitor should now show:
echo 1. Processing of test files
echo 2. Data integration
echo 3. LLM preparation
echo.
echo When complete, you'll see:
echo - Timeline data
echo - Relationship mapping
echo - Validation results
echo.
echo To verify the results:
echo 1. Check processed/chatgpt-input/ for generated files
echo 2. Review processed/analysis/ for templates
echo 3. Examine the browser interface for progress
echo.
echo Press any key to open the monitor...
pause >nul

REM Open the monitor URL
start http://localhost:3000/pipeline-monitor.html

echo.
echo When finished testing:
echo 1. Run stop-pipeline-monitor.bat to shut down servers
echo 2. Check processed/analysis/ for results
echo.
