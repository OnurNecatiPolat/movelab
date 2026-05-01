$ErrorActionPreference = "Stop"

$Root = "C:\MoveLabFresh"
. "$Root\scripts\env.ps1"

$env:PIP_CACHE_DIR = "$Root\.runtime\pip-cache"
$env:PIP_NO_CACHE_DIR = "1"

New-Item -ItemType Directory -Force "$Root\.runtime\pip-cache" | Out-Null

cd "$Root\backend"

if (!(Test-Path ".venv")) {
    python -m venv .venv
}

& ".\.venv\Scripts\Activate.ps1"

python -m pip install --upgrade pip setuptools wheel --no-cache-dir
if ($LASTEXITCODE -ne 0) { throw "pip upgrade failed" }

python -m pip install -r requirements.txt --no-cache-dir
if ($LASTEXITCODE -ne 0) { throw "requirements install failed" }

$env:PYTHONPATH = "$Root\backend"
$env:STOCKFISH_PATH = "$Root\tools\stockfish\stockfish.exe"

python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
