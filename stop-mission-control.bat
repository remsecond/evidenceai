@echo off
echo Stopping EvidenceAI Mission Control...
echo.

REM Get port numbers from environment or use defaults
set PIPELINE_PORT=%PIPELINE_PORT%
if "%PIPELINE_PORT%"=="" set PIPELINE_PORT=3000
set WEB_PORT=%WEB_PORT%
if "%WEB_PORT%"=="" set WEB_PORT=3001

REM Kill all node processes
echo Stopping all Node.js processes...
%SystemRoot%\System32\taskkill /F /IM node.exe >nul 2>&1

REM Wait for processes to stop
%SystemRoot%\System32\timeout /t 2 /nobreak >nul

REM Check ports
echo Checking ports...
%SystemRoot%\System32\netstat -ano | %SystemRoot%\System32\findstr ":3000" >nul
if %ERRORLEVEL% EQU 0 (
    echo Warning: Port 3000 may still be in use
)
%SystemRoot%\System32\netstat -ano | %SystemRoot%\System32\findstr ":3001" >nul
if %ERRORLEVEL% EQU 0 (
    echo Warning: Port 3001 may still be in use
)

REM Clean up any temporary files
if exist "processed\pipeline\manifest.json" (
    echo Cleaning up temporary files...
    del /q "processed\pipeline\manifest.json" >nul 2>&1
)

echo.
echo Mission Control stopped successfully.
echo.
echo Note: Processed files have been preserved:
echo      - processed/pipeline/timeline.json
echo      - processed/pipeline/relationships.json
echo      - processed/pipeline/validation.json
echo.
