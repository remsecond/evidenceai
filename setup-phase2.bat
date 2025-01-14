@echo off
echo Setting up EvidenceAI Phase 2 environment...

REM Try to find Python in user's home directory first
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

REM Clean up previous installation if it exists
echo Cleaning up previous installation...
if exist "venv" (
    echo - Removing old virtual environment
    taskkill /F /IM python.exe >nul 2>&1
    timeout /t 2 /nobreak >nul
    rmdir /s /q "venv" 2>nul
)

REM Try to remove directories if they exist, ignore errors
rd /s /q "input" 2>nul
rd /s /q "processed" 2>nul
rd /s /q "staging" 2>nul
rd /s /q "logs" 2>nul

REM Create Python virtual environment in current directory
echo Creating fresh Python virtual environment...
"%PYTHON_PATH%" -m venv "%CD%\venv"
if errorlevel 1 (
    echo ERROR: Failed to create virtual environment
    echo Please ensure Python is installed correctly and try again
    pause
    exit /b 1
)

REM Activate virtual environment
echo Activating virtual environment...
call "%CD%\venv\Scripts\activate.bat"
if errorlevel 1 (
    echo ERROR: Failed to activate virtual environment
    pause
    exit /b 1
)

REM Install core packages first
echo Installing core Python packages...
python -m pip install --upgrade pip wheel setuptools

REM Install PDF processing packages
echo Installing PDF processing packages...
pip install PyPDF2==3.0.1
pip install pdfminer.six==20221105

REM Install remaining packages
echo Installing remaining packages...
pip install -r requirements.txt

REM Create required directories
echo Creating directories...
mkdir "input" 2>nul
mkdir "input\pdf" 2>nul
mkdir "input\ofw" 2>nul
mkdir "input\ods" 2>nul
mkdir "input\email" 2>nul
mkdir "input\word" 2>nul
mkdir "processed" 2>nul
mkdir "processed\pdf" 2>nul
mkdir "processed\ofw" 2>nul
mkdir "processed\ods" 2>nul
mkdir "processed\email" 2>nul
mkdir "processed\word" 2>nul
mkdir "staging" 2>nul
mkdir "logs" 2>nul

REM Create src directory structure
mkdir "src" 2>nul
mkdir "src\preprocessing" 2>nul
type nul > "src\preprocessing\__init__.py" 2>nul

echo.
echo Setup complete! You can now:
echo 1. Put files in the input folder with their original names:
echo    - OFW_Messages_Report_YYYY-MM-DD_HH-MM-SS.pdf
echo    - Email exchange with user@domain.com after YYYY-MM-DD before YYYY-MM-DD.pdf
echo    - label Emails from user@domain.com after YYYY-MM-DD before YYYY-MM-DD.ods
echo 2. Run dev.bat to process them
echo.
pause
