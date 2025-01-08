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

:: Set project paths
set "PROJECT_ROOT=%~dp0"
set "VSCODE_WORKSPACE=%PROJECT_ROOT%evidenceai.code-workspace"
set "NODE_MODULES=%PROJECT_ROOT%node_modules"

:: Display startup header
echo %ESC%[92m
echo Starting EvidenceAI Development Environment...
echo =========================================
echo %ESC%[0m

:: Check for package.json and node_modules
if not exist "%PROJECT_ROOT%package.json" (
    echo %ESC%[91mERROR: package.json not found%ESC%[0m
    goto :Error
)

if not exist "%NODE_MODULES%" (
    echo %ESC%[93mWARNING: node_modules not found. Installing dependencies...%ESC%[0m
    call npm install
    if !ERRORLEVEL! neq 0 (
        echo %ESC%[91mERROR: Failed to install dependencies%ESC%[0m
        goto :Error
    )
)

:: Initialize development context
echo %ESC%[36m
echo Initializing development context...
echo %ESC%[0m
call "%PROJECT_ROOT%init_context.bat"
if %ERRORLEVEL% neq 0 (
    echo %ESC%[91mERROR: Context initialization failed%ESC%[0m
    goto :Error
)

:: Configure VSCode workspace
if not exist "%PROJECT_ROOT%.vscode" (
    mkdir "%PROJECT_ROOT%.vscode"
)

:: Start VSCode with context
echo %ESC%[36m
echo Starting VSCode with EvidenceAI context...
echo %ESC%[0m

:: Check if VSCode is already running for this workspace
tasklist /FI "IMAGENAME eq Code.exe" 2>NUL | find /I /N "Code.exe">NUL
if !ERRORLEVEL! equ 0 (
    echo %ESC%[93mVSCode is already running. Opening new window...%ESC%[0m
    code "%VSCODE_WORKSPACE%" -n
) else (
    code "%VSCODE_WORKSPACE%" --cli-data-dir "%PROJECT_ROOT%.vscode" ^
        --load-session "evidenceai" ^
        --user-data-dir "%PROJECT_ROOT%.vscode-user"
)

:: Display success message
echo %ESC%[92m
echo =========================================
echo Development Session Started Successfully
echo =========================================
echo Role: Development Manager
echo Project: EvidenceAI
echo Context: Loaded from PROJECT_CONTEXT.md
echo %ESC%[0m

goto :End

:Error
echo.
echo %ESC%[91mFailed to start development environment.%ESC%[0m
echo %ESC%[91mPlease fix the issues above and try again.%ESC%[0m
pause
exit /b 1

:End
echo %ESC%[92m
echo Development environment is ready.
echo You can now begin development tasks.
echo %ESC%[0m
