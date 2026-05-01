@echo off
cd /d "%~dp0\.."
powershell -ExecutionPolicy Bypass -File "%~dp0windows_import_demo.ps1"
pause
