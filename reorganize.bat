@echo off
echo Starting project reorganization...

echo.
echo Step 1: Running cleanup script...
call cleanup.bat

echo.
echo Step 2: Running consolidation script...
call consolidate.bat

echo.
echo Step 3: Updating import paths...
call update-imports.bat

echo.
echo Project reorganization complete!
pause
