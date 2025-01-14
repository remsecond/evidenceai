@echo off
echo Debugging EvidenceAI Pipeline...
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is required but not found.
    echo Please install Node.js from https://nodejs.org/
    exit /b 1
)

REM Kill any existing node processes
echo Cleaning up any existing processes...
taskkill /F /IM node.exe >nul 2>&1

REM Create required directories
echo Creating directories...
if not exist "uploads" mkdir uploads
if not exist "processed" mkdir processed
if not exist "processed\pipeline" mkdir processed\pipeline

REM Copy test files
echo Copying test files...
copy "simple-pdf-processor\test\fixtures\sample-ofw.txt" "uploads\test-ofw.txt" >nul 2>&1
copy "simple-pdf-processor\test\fixtures\sample-email.txt" "uploads\test-email.txt" >nul 2>&1
copy "simple-pdf-processor\test\fixtures\sample-records.json" "uploads\test-records.json" >nul 2>&1
copy "simple-pdf-processor\test\fixtures\sample-records.csv" "uploads\test-records.csv" >nul 2>&1

REM Start pipeline server in debug mode
echo Starting pipeline server in debug mode...
start "Pipeline Server" cmd /c "node --inspect scripts/pipeline-server.js"

REM Wait for server to start
timeout /t 2 /nobreak >nul

REM Test pipeline
echo.
echo Testing pipeline...
echo.
echo 1. Testing server connection...
curl -s -X GET http://localhost:3000/status
if %ERRORLEVEL% NEQ 0 (
    echo × Server connection failed
    goto :error
) else (
    echo ✓ Server connection successful
)

echo.
echo 2. Testing file processing...
curl -s -X POST http://localhost:3000/api/process
if %ERRORLEVEL% NEQ 0 (
    echo × Processing failed
    goto :error
) else (
    echo ✓ Processing triggered
)

echo.
echo 3. Checking outputs...
timeout /t 2 /nobreak >nul
if exist "processed\pipeline\timeline.json" (
    echo ✓ Timeline generated
) else (
    echo × Timeline missing
)

if exist "processed\pipeline\relationships.json" (
    echo ✓ Relationships generated
) else (
    echo × Relationships missing
)

if exist "processed\pipeline\validation.json" (
    echo ✓ Validation generated
) else (
    echo × Validation missing
)

echo.
echo Debug complete! Check results above.
echo.
echo To view debug info:
echo 1. Open Chrome
echo 2. Go to chrome://inspect
echo 3. Click "Open dedicated DevTools for Node"
echo.
echo Press any key to stop debug servers...
pause >nul

REM Cleanup
taskkill /F /IM node.exe >nul 2>&1
exit /b 0

:error
echo.
echo Debug failed! Check error messages above.
echo.
taskkill /F /IM node.exe >nul 2>&1
exit /b 1
