@echo off
cd /d "%~dp0\.."
powershell -ExecutionPolicy Bypass -File "%~dp0windows_run_frontend.ps1"
pause
