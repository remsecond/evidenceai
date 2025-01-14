@echo off
echo Cleaning up EvidenceAI environment...

REM Kill any running Python processes
taskkill /F /IM python.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Remove virtual environment
if exist "venv" (
    echo Removing virtual environment...
    rmdir /s /q "venv" 2>nul
)

REM Remove working directories
echo Removing working directories...
if exist "input" rmdir /s /q "input" 2>nul
if exist "processed" rmdir /s /q "processed" 2>nul
if exist "staging" rmdir /s /q "staging" 2>nul
if exist "logs" rmdir /s /q "logs" 2>nul

REM Remove Python cache
echo Removing Python cache...
if exist "src\preprocessing\__pycache__" rmdir /s /q "src\preprocessing\__pycache__" 2>nul
if exist "__pycache__" rmdir /s /q "__pycache__" 2>nul

echo.
echo Cleanup complete! You can now:
echo 1. Run setup-phase2.bat to create a fresh environment
echo 2. Run dev.bat to process files
echo.
pause
