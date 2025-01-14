SO let@echo off
echo Starting new EvidenceAI development session...

REM Initialize Cline context
echo.
echo Step 1: Initializing Cline context...
node cline-init.js

REM Review development protocol
echo.
echo Step 2: Reviewing development protocol...
type DEVELOPMENT_PROTOCOL.md

REM Check current state
echo.
echo Step 3: Loading current project state...
type CURRENT_STATE.md

REM Load latest session checkpoint
echo.
echo Step 4: Loading latest session checkpoint...
type docs\SESSION_CHECKPOINT_2024_01_13.md

echo.
echo Session initialization complete!
echo.
echo Remember:
echo 1. Every session must end with a runnable demo
echo 2. Test with real data before adding features
echo 3. Show concrete proof, not theoretical plans
echo.
pause
