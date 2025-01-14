@echo off
echo Starting EvidenceAI document processor...

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Run Python processor
python process_docs.py

REM Deactivate virtual environment
deactivate

echo.
echo Processing complete. Press any key to exit...
pause
