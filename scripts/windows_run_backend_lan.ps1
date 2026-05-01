$ErrorActionPreference = "Stop"

$Root = Resolve-Path "$PSScriptRoot\.."
$Backend = Join-Path $Root "backend"
& "$PSScriptRoot\env.ps1"
Set-Location $Backend

Write-Host "[MoveLab] Backend LAN modunda baslatiliyor..." -ForegroundColor Cyan
Write-Host "[MoveLab] Telefon testi icin bilgisayar ve telefon ayni Wi-Fi aginda olmali."

if (!(Test-Path ".venv")) {
    Write-Host "[MoveLab] .venv yok, olusturuluyor..." -ForegroundColor Yellow
    py -m venv .venv
}

& ".\.venv\Scripts\Activate.ps1"

python -m pip install -r requirements.txt

$env:PYTHONPATH = $Backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
