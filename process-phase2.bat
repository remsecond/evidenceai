@echo off
echo Starting EvidenceAI Phase 2 Processing...

REM Try to find Python in common locations
set PYTHON_PATHS=^
%USERPROFILE%\AppData\Local\Programs\Python\Python311\python.exe;^
%USERPROFILE%\AppData\Local\Programs\Python\Python310\python.exe;^
%USERPROFILE%\AppData\Local\Programs\Python\Python39\python.exe;^
%USERPROFILE%\AppData\Local\Microsoft\WindowsApps\python.exe;^
python.exe

set PYTHON_PATH=

for %%p in (%PYTHON_PATHS%) do (
    %%p --version >nul 2>&1
    if not errorlevel 1 (
        set PYTHON_PATH=%%p
        goto :found_python
    )
)

echo ERROR: Python is not installed
echo Please install Python 3.8 or higher from https://www.python.org/downloads/
pause
exit /b 1

:found_python
echo Found Python at: %PYTHON_PATH%

REM Check if virtual environment exists in current directory
if not exist "venv" (
    echo Virtual environment not found.
    echo Please run setup-phase2.bat first to set up the environment.
    pause
    exit /b 1
)

REM Activate virtual environment
echo Activating virtual environment...
call "venv\Scripts\activate.bat"
if errorlevel 1 (
    echo ERROR: Failed to activate virtual environment
    echo Please run setup-phase2.bat to recreate the environment
    pause
    exit /b 1
)

REM Verify required packages
python -c "import PyPDF2, pdfminer, tqdm" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Missing required packages
    echo Please run setup-phase2.bat to install dependencies
    pause
    exit /b 1
)

REM Create working directories if they don't exist
echo Checking directories...
if not exist "input" mkdir "input" 2>nul
if not exist "input\pdf" mkdir "input\pdf" 2>nul
if not exist "input\ofw" mkdir "input\ofw" 2>nul
if not exist "input\ods" mkdir "input\ods" 2>nul
if not exist "input\email" mkdir "input\email" 2>nul
if not exist "input\word" mkdir "input\word" 2>nul
if not exist "processed" mkdir "processed" 2>nul
if not exist "processed\pdf" mkdir "processed\pdf" 2>nul
if not exist "processed\ofw" mkdir "processed\ofw" 2>nul
if not exist "processed\ods" mkdir "processed\ods" 2>nul
if not exist "processed\email" mkdir "processed\email" 2>nul
if not exist "processed\word" mkdir "processed\word" 2>nul
if not exist "staging" mkdir "staging" 2>nul
if not exist "logs" mkdir "logs" 2>nul

REM Ensure src directory structure exists
if not exist "src" mkdir "src" 2>nul
if not exist "src\preprocessing" mkdir "src\preprocessing" 2>nul
if not exist "src\preprocessing\__init__.py" type nul > "src\preprocessing\__init__.py" 2>nul

REM Run processor
echo.
echo Environment ready! Running document processor...
python process_docs.py

REM Deactivate virtual environment
deactivate

echo.
echo Processing complete. Press any key to exit...
pause
