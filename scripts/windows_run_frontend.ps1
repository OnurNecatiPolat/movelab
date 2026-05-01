$ErrorActionPreference = "Stop"

$Root = Resolve-Path "$PSScriptRoot\.."
$Frontend = Join-Path $Root "frontend"
& "$PSScriptRoot\env.ps1"
Set-Location $Frontend

Write-Host "[MoveLab] Frontend baslatiliyor..." -ForegroundColor Cyan

if (Test-Path "package-lock.json") {
    npm ci
} else {
    npm install
}
npm run dev
