@echo off
echo === EvidenceAI Development Control ===

IF "%1"=="stop" (
    echo Ending development session...
    cd %~dp0
    call npm run dev:stop
) ELSE (
    echo Starting development session...
    cd %~dp0
    code evidenceai.code-workspace
    timeout /t 2 /nobreak >nul
    call npm run dev:init
)

pause
