@echo off
echo Running Enhanced Content Analysis Verification...
echo.

:: Check if node is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    exit /b 1
)

:: Run the verification script
node scripts/verify-content-analysis.js

if %ERRORLEVEL% neq 0 (
    echo.
    echo Verification failed! Check the logs for details.
    exit /b 1
) else (
    echo.
    echo Verification completed successfully.
)

pause
