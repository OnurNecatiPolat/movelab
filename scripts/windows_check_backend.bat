@echo off
cd /d "%~dp0\.."
powershell -ExecutionPolicy Bypass -File "%~dp0windows_check_backend.ps1"
pause
