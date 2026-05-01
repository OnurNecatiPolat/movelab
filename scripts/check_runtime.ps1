$ErrorActionPreference = "Stop"

$Root = "C:\MoveLabFresh"
. "$Root\scripts\env.ps1"

Write-Host "`n[Python]" -ForegroundColor Cyan
python --version
python -m pip --version

Write-Host "`n[Node]" -ForegroundColor Cyan
node --version
npm --version

Write-Host "`n[Stockfish]" -ForegroundColor Cyan

$Fish = "$Root\tools\stockfish\stockfish.exe"

if (!(Test-Path $Fish)) {
    throw "Stockfish bulunamadı: $Fish"
}

"uci`nquit`n" | & $Fish

Write-Host "`n[MoveLab] Runtime tamamen hazır." -ForegroundColor Green
