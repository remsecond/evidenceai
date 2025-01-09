@echo off
title EvidenceAI Development Server [Port 3456]

:: Change to project directory
cd /d C:\Users\robmo\Desktop\evidenceai

:: Create required directories
if not exist .cline mkdir .cline
if not exist session_logs mkdir session_logs
if not exist demos mkdir demos

:: Clear screen and show status
cls
echo === EvidenceAI Development Server ===
echo.
echo Starting server on port 3456...
echo Keep this window open while using Mission Control
echo.

:: Start the server
call npm run test:server
