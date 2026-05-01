$ErrorActionPreference = "Continue"

$Root = Resolve-Path "$PSScriptRoot\.."

Write-Host "[MoveLab] Root: $Root" -ForegroundColor Cyan

Write-Host "`n[MoveLab] Python:" -ForegroundColor Cyan
py --version
python --version

Write-Host "`n[MoveLab] Node:" -ForegroundColor Cyan
node --version

Write-Host "`n[MoveLab] NPM:" -ForegroundColor Cyan
npm --version

Write-Host "`n[MoveLab] Stockfish:" -ForegroundColor Cyan
where.exe stockfish

Write-Host "`n[MoveLab] Backend check:" -ForegroundColor Cyan
& "$PSScriptRoot\windows_check_backend.ps1"
