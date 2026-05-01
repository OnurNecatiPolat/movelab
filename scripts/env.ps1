$ErrorActionPreference = "Stop"

$Root = Resolve-Path "$PSScriptRoot\.."
$Python = Join-Path $Root ".runtime\python"
$Node = Join-Path $Root ".runtime\node"
$StockfishDir = Join-Path $Root "tools\stockfish"
$Stockfish = Join-Path $StockfishDir "stockfish.exe"

$env:PATH = "$Python;$Python\Scripts;$Node;$StockfishDir;" + $env:PATH
$env:STOCKFISH_PATH = $Stockfish
if (-not $env:MOVELAB_CORS_ORIGINS) {
    $env:MOVELAB_CORS_ORIGINS = "http://127.0.0.1:5173,http://localhost:5173"
}

Write-Host "[MoveLab] Local runtime aktif." -ForegroundColor Green
Write-Host "[MoveLab] Root:   $Root"
Write-Host "[MoveLab] Python: $Python\python.exe"
Write-Host "[MoveLab] Node:   $Node\node.exe"
Write-Host "[MoveLab] Fish:   $Stockfish"
