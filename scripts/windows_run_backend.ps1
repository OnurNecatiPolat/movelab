$ErrorActionPreference = "Stop"

$Root = Resolve-Path "$PSScriptRoot\.."
$Backend = Join-Path $Root "backend"
& "$PSScriptRoot\env.ps1"
Set-Location $Backend

Write-Host "[MoveLab] Backend baslatiliyor..." -ForegroundColor Cyan

if (!(Test-Path ".venv")) {
    Write-Host "[MoveLab] .venv yok, olusturuluyor..." -ForegroundColor Yellow
    py -m venv .venv
}

& ".\.venv\Scripts\Activate.ps1"

python -m pip install --upgrade pip setuptools wheel
python -m pip install -r requirements.txt

$env:PYTHONPATH = $Backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
