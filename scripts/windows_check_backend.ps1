$ErrorActionPreference = "Stop"

$Root = Resolve-Path "$PSScriptRoot\.."
$Backend = Join-Path $Root "backend"
& "$PSScriptRoot\env.ps1"
Set-Location $Backend

Write-Host "[MoveLab] Backend check basliyor..." -ForegroundColor Cyan

if (!(Test-Path ".venv")) {
    Write-Host "[MoveLab] .venv yok, olusturuluyor..." -ForegroundColor Yellow
    py -m venv .venv
}

& ".\.venv\Scripts\Activate.ps1"

python -m pip install --upgrade pip setuptools wheel
python -m pip install -r requirements.txt

$env:PYTHONPATH = $Backend
python scripts\check_backend.py
Write-Host "`n[MoveLab] Stockfish bulunamazsa .\scripts\windows_find_stockfish.ps1 çalıştır." -ForegroundColor Yellow
