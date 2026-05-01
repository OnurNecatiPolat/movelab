$ErrorActionPreference = "Stop"

$Root = Resolve-Path "$PSScriptRoot\.."
$Backend = Join-Path $Root "backend"
& "$PSScriptRoot\env.ps1"
Set-Location $Backend

Write-Host "[MoveLab] Backend .venv siliniyor..." -ForegroundColor Yellow

if (Test-Path ".venv") {
    Remove-Item -Recurse -Force ".venv"
}

py -m venv .venv
& ".\.venv\Scripts\Activate.ps1"

python -m pip install --upgrade pip setuptools wheel
python -m pip install -r requirements.txt

Write-Host "[MoveLab] Backend venv sifirlandi." -ForegroundColor Green
