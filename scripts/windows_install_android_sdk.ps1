$ErrorActionPreference = "Stop"

$Root = Resolve-Path "$PSScriptRoot\.."
$Downloads = Join-Path $Root ".runtime\downloads"
$SdkRoot = Join-Path $Root ".runtime\android-sdk"
$CmdlineTools = Join-Path $SdkRoot "cmdline-tools\latest"
$ZipPath = Join-Path $Downloads "commandlinetools-win-14742923_latest_sdk.zip"
$ExtractRoot = Join-Path $Downloads "android-commandlinetools-14742923-sdk"
$Url = "https://dl.google.com/android/repository/commandlinetools-win-14742923_latest.zip"
$JetBrainsJava = "C:\Program Files\JetBrains\DataGrip 2026.1.2\jbr"

New-Item -ItemType Directory -Force -Path $Downloads | Out-Null
New-Item -ItemType Directory -Force -Path $SdkRoot | Out-Null

if (!(Test-Path $ZipPath) -or ((Get-Item $ZipPath).Length -lt 100000000)) {
    Write-Host "[MoveLab] Android command-line tools indiriliyor..." -ForegroundColor Cyan
    & curl.exe -L $Url -o $ZipPath
} else {
    Write-Host "[MoveLab] Command-line tools zip zaten mevcut." -ForegroundColor Green
}

if (!(Test-Path $CmdlineTools)) {
    Write-Host "[MoveLab] Android SDK klasor yapisi hazirlaniyor..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Force -Path $ExtractRoot | Out-Null
    Expand-Archive -Path $ZipPath -DestinationPath $ExtractRoot -Force
    New-Item -ItemType Directory -Force -Path $CmdlineTools | Out-Null
    Copy-Item -Path (Join-Path $ExtractRoot "cmdline-tools\*") -Destination $CmdlineTools -Recurse -Force
} else {
    Write-Host "[MoveLab] Command-line tools zaten kurulu." -ForegroundColor Green
}

if (Test-Path $JetBrainsJava) {
    $env:JAVA_HOME = $JetBrainsJava
    $env:PATH = "$JetBrainsJava\bin;$env:PATH"
}

$env:ANDROID_HOME = $SdkRoot
$env:ANDROID_SDK_ROOT = $SdkRoot
$env:PATH = "$CmdlineTools\bin;$SdkRoot\platform-tools;$env:PATH"

$SdkManager = Join-Path $CmdlineTools "bin\sdkmanager.bat"

Write-Host "[MoveLab] Android SDK lisanslari kabul ediliyor..." -ForegroundColor Cyan
1..20 | ForEach-Object { "y" } | & $SdkManager --sdk_root=$SdkRoot --licenses | Out-Host

Write-Host "[MoveLab] Gerekli Android SDK paketleri kuruluyor..." -ForegroundColor Cyan
& $SdkManager --sdk_root=$SdkRoot "platform-tools" "platforms;android-36" "build-tools;36.0.0"

Write-Host "[MoveLab] Android SDK hazir: $SdkRoot" -ForegroundColor Green
Write-Host "[MoveLab] Bu oturum icin ANDROID_HOME=$SdkRoot"
