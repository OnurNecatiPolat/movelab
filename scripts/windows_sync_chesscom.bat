@echo off
cd /d "%~dp0\.."
set /p USERNAME=Chess.com username [CaarlsenKaybediyoo]:
if "%USERNAME%"=="" set USERNAME=CaarlsenKaybediyoo
set /p ARCHIVES=Archive count [2]:
if "%ARCHIVES%"=="" set ARCHIVES=2
powershell -ExecutionPolicy Bypass -File "%~dp0windows_sync_chesscom.ps1" -Username "%USERNAME%" -Archives %ARCHIVES%
pause
