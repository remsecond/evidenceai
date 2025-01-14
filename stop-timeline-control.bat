I reme@echo off
echo Stopping EvidenceAI Timeline Control...

:: Find and kill the node process running on port 3002
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3002" ^| find "LISTENING"') do (
    echo Found Timeline Server process: %%a
    taskkill /F /PID %%a
    echo Timeline Server stopped.
)

:: If no process found
if %ERRORLEVEL% NEQ 0 (
    echo No Timeline Server process found running on port 3002.
)

echo.
echo Timeline Control has been stopped.
