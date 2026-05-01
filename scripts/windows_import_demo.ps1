$ErrorActionPreference = "Stop"

$Root = Resolve-Path "$PSScriptRoot\.."
$Backend = Join-Path $Root "backend"
Set-Location $Backend

Write-Host "[MoveLab] Demo oyun import ediliyor..." -ForegroundColor Cyan

if (!(Test-Path ".venv")) {
    py -m venv .venv
}

& ".\.venv\Scripts\Activate.ps1"

python -m pip install -r requirements.txt

$env:PYTHONPATH = $Backend
python scripts\import_demo.py
