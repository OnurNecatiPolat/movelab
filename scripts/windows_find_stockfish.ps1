$ErrorActionPreference = "Continue"

$Root = Resolve-Path "$PSScriptRoot\.."

$candidates = @(
    "$Root\tools\stockfish\stockfish.exe",
    "$Root\tools\stockfish.exe",
    "$Root\backend\tools\stockfish\stockfish.exe",
    "$Root\backend\stockfish.exe",
    "C:\Stockfish\stockfish.exe",
    "C:\stockfish\stockfish.exe",
    "C:\Program Files\Stockfish\stockfish.exe",
    "C:\Program Files (x86)\Stockfish\stockfish.exe",
    "$env:USERPROFILE\stockfish\stockfish.exe",
    "$env:USERPROFILE\Downloads\stockfish\stockfish.exe",
    "$env:USERPROFILE\Downloads\Stockfish\stockfish.exe"
)

Write-Host "[MoveLab] Stockfish aranıyor..." -ForegroundColor Cyan

try {
    $pathHit = (Get-Command stockfish -ErrorAction Stop).Source
    if ($pathHit) {
        Write-Host "[MoveLab] PATH üzerinde bulundu: $pathHit" -ForegroundColor Green
        exit 0
    }
} catch {}

foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
        Write-Host "[MoveLab] Bulundu: $candidate" -ForegroundColor Green
        Write-Host "[MoveLab] Bu terminal için ayarlamak istersen:" -ForegroundColor Cyan
        Write-Host "`$env:STOCKFISH_PATH=`"$candidate`""
        exit 0
    }
}

Write-Host "[MoveLab] Stockfish bulunamadı." -ForegroundColor Red
Write-Host ""
Write-Host "En kolay çözüm:"
Write-Host "1) Stockfish Windows zip indir."
Write-Host "2) İçindeki .exe dosyasını şuraya kopyala:"
Write-Host "   $Root\tools\stockfish\stockfish.exe"
Write-Host "3) Dosya adını stockfish.exe yap."
Write-Host "4) Sonra tekrar çalıştır:"
Write-Host "   .\scripts\windows_check_backend.ps1"
exit 1
