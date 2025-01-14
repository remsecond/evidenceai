@echo off
echo Stopping Evidence Pipeline Monitor...
echo.

REM Find and kill the pipeline server process
for /f "tokens=2" %%a in ('tasklist ^| findstr "Pipeline Server"') do (
    taskkill /PID %%a /F >nul 2>&1
)

REM Find and kill the web server process
for /f "tokens=2" %%a in ('tasklist ^| findstr "Web Server"') do (
    taskkill /PID %%a /F >nul 2>&1
)

REM Clean up any temporary files
if exist "processed\chatgpt-input\manifest.json" (
    echo Cleaning up temporary files...
    del /q "processed\chatgpt-input\manifest.json" >nul 2>&1
)

echo.
echo Pipeline Monitor stopped successfully.
echo.
echo Note: Analysis files in processed/analysis/ have been preserved.
echo      You can find them at:
echo      - processed/analysis/evidence-report.md
echo      - processed/analysis/findings.json
echo      - processed/analysis/review-notes.md
echo.
