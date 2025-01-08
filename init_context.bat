@echo off
setlocal EnableDelayedExpansion

:: Set colors using ANSI escape codes
set "ESC="
for /F "tokens=1,2 delims=#" %%a in ('"prompt #$H#$E# & echo on & for %%b in (1) do rem"') do (
  set "ESC=%%b"
)

:: Clear screen and set title
cls
title EvidenceAI Development Environment

:: ASCII Art Header
echo %ESC%[92m
echo  _____       _     _                      _    _
echo ^|  ___^|_   _(_) __^| ^| ___ _ __   ___ ___^| ^|  / \
echo ^| ^|__  \ \ / / ^|/ _` ^|/ _ \ '_ \ / __/ _ \ ^| /  /
echo ^|  __^|  \ V /^| ^| (_^| ^|  __/ ^| ^| ^| (_^|  __/ ^|/ /_
echo ^|_____^|  \_/ ^|_^|\__,_^|\___^|_^| ^|_^|\___\___^|_/_/(_)
echo %ESC%[0m

:: Set project root and configuration
set "PROJECT_ROOT=%~dp0"
set "ROLE=Development_Manager"
set "PROJECT=EvidenceAI"
set "PHASE=Phase_1"
set "MILESTONE=Core_Implementation"

:: Function to display section headers
call :PrintSection "Environment Validation"

:: Check required tools
echo %ESC%[36mChecking required tools...%ESC%[0m
call :CheckTool "Node.js" "node --version"
call :CheckTool "Git" "git --version"
call :CheckTool "VSCode" "code --version"

:: Validate environment
echo.
echo %ESC%[36mValidating environment...%ESC%[0m
if not exist "%PROJECT_ROOT%PROJECT_CONTEXT.md" (
    echo %ESC%[91mERROR: PROJECT_CONTEXT.md not found%ESC%[0m
    goto :Error
)

if not exist "%PROJECT_ROOT%.vscode" (
    echo %ESC%[93mWARNING: .vscode directory not found. Creating...%ESC%[0m
    mkdir "%PROJECT_ROOT%.vscode"
)

if not exist "%PROJECT_ROOT%.git" (
    echo %ESC%[93mWARNING: Git repository not initialized%ESC%[0m
)

:: Display project context
call :PrintSection "Project Context"
echo Loading from PROJECT_CONTEXT.md...
type "%PROJECT_ROOT%PROJECT_CONTEXT.md"

:: Display implementation status
call :PrintSection "Pipeline Status"
call :PrintProgress "Document Ingestion" 75
call :PrintProgress "Content Processing" 65
call :PrintProgress "Data Organization" 50
call :PrintProgress "Analysis & Enrichment" 45

call :PrintSection "Domain Status"
call :PrintProgress "Family Law (Base Case)" 85
call :PrintProgress "Employment Law" 20
call :PrintProgress "Healthcare" 15
call :PrintProgress "Corporate Compliance" 10

call :PrintSection "Component Status"
call :PrintProgress "PDF Server" 90
call :PrintProgress "Chatsum Integration" 80
call :PrintProgress "Deepseek Integration" 75
call :PrintProgress "Neo4j Integration" 40

call :PrintSection "Infrastructure Status"
call :PrintProgress "Error Handling" 70
call :PrintProgress "Caching System" 60
call :PrintProgress "Queue Management" 50
call :PrintProgress "Monitoring" 55

:: Display environment info
call :PrintSection "Development Environment"
echo Role: %ROLE%
echo Project: %PROJECT%
echo Phase: %PHASE%
echo Milestone: %MILESTONE%
echo Project Root: %PROJECT_ROOT%

:: Check Git status
call :PrintSection "Git Status"
git status

:: Display current priorities
call :PrintSection "Current Development Priorities"
echo Immediate:
echo 1. Complete PDF processing pipeline
echo 2. Finalize AI integration
echo 3. Implement timeline generation
echo 4. Validate base case (family law)
echo.
echo Short-term:
echo 1. Enhanced pattern detection
echo 2. Cross-domain templates
echo 3. API platform development
echo 4. Integration capabilities
echo.
echo Medium-term:
echo 1. Domain expansion
echo 2. Advanced analytics
echo 3. Partner integrations
echo 4. Vertical solutions

:: Instructions for Claude
call :PrintSection "Instructions for Claude"
echo Role: Development Manager for EvidenceAI
echo Context: PROJECT_CONTEXT.md loaded
echo Current Phase: Implementation Phase 1
echo Focus: Core feature completion

echo.
echo %ESC%[92mEnvironment initialized successfully!%ESC%[0m
goto :End

:PrintSection
echo.
echo %ESC%[36m=================================================%ESC%[0m
echo %ESC%[36m   %~1%ESC%[0m
echo %ESC%[36m=================================================%ESC%[0m
exit /b

:PrintProgress
set "component=%~1"
set "percent=%~2"
set "progressBar="
for /L %%i in (1,1,50) do (
    set /a "val=%%i * 2"
    if !val! leq %percent% (
        set "progressBar=!progressBar!="
    ) else (
        set "progressBar=!progressBar! "
    )
)
echo %ESC%[93m%component% : [!progressBar!] %percent%%%ESC%[0m
exit /b

:CheckTool
set "toolName=%~1"
set "toolCmd=%~2"
%toolCmd% >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo %ESC%[92m%toolName%: Available%ESC%[0m
) else (
    echo %ESC%[91m%toolName%: Not found%ESC%[0m
    set "TOOL_ERROR=1"
)
exit /b

:Error
echo.
echo %ESC%[91mEnvironment validation failed. Please fix the issues above.%ESC%[0m
pause
exit /b 1

:End
echo.
echo %ESC%[92mPress any key to continue development...%ESC%[0m
pause >nul
endlocal
