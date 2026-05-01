@echo off
cd /d "%~dp0\.."
powershell -ExecutionPolicy Bypass -File "%~dp0windows_doctor_debug.ps1"
pause
