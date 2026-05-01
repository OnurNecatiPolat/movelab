param(
    [string]$ApiBase = $env:VITE_API_BASE
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path "$PSScriptRoot\.."
$Frontend = Join-Path $Root "frontend"
$AndroidDir = Join-Path $Frontend "android"
$ApkPath = Join-Path $AndroidDir "app\build\outputs\apk\debug\app-debug.apk"
$BundledSdk = Join-Path $Root ".runtime\android-sdk"
$BundledJdk = Join-Path $Root ".runtime\jdk-21"
$JetBrainsJava = "C:\Program Files\JetBrains\DataGrip 2026.1.2\jbr"

$BundledJava = Get-ChildItem -Path $BundledJdk -Recurse -Filter java.exe -ErrorAction SilentlyContinue | Select-Object -First 1
if ($BundledJava) {
    $env:JAVA_HOME = Split-Path (Split-Path $BundledJava.FullName -Parent) -Parent
    $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
} elseif (Test-Path $JetBrainsJava) {
    $env:JAVA_HOME = $JetBrainsJava
    $env:PATH = "$JetBrainsJava\bin;$env:PATH"
}

if (Test-Path $BundledSdk) {
    $env:ANDROID_HOME = $BundledSdk
    $env:ANDROID_SDK_ROOT = $BundledSdk
    $env:PATH = "$BundledSdk\platform-tools;$BundledSdk\cmdline-tools\latest\bin;$env:PATH"
}

Set-Location $Frontend

if ($ApiBase) {
    $env:VITE_API_BASE = $ApiBase
    Write-Host "[MoveLab] Mobile API base: $ApiBase" -ForegroundColor Cyan
}

Write-Host "[MoveLab] Web build hazirlaniyor..." -ForegroundColor Cyan
& "$Root\.runtime\node\npm.cmd" run build

if (!(Test-Path $AndroidDir)) {
    Write-Host "[MoveLab] Android proje iskeleti olusturuluyor..." -ForegroundColor Cyan
    & "$Root\.runtime\node\npx.cmd" cap add android
} else {
    Write-Host "[MoveLab] Android proje iskeleti mevcut." -ForegroundColor Green
}

Write-Host "[MoveLab] Capacitor sync calisiyor..." -ForegroundColor Cyan
& "$Root\.runtime\node\npx.cmd" cap sync android

$Java = Get-Command java -ErrorAction SilentlyContinue
$SdkRoot = $env:ANDROID_HOME
if (-not $SdkRoot) {
    $SdkRoot = $env:ANDROID_SDK_ROOT
}

if (-not $Java -or -not $SdkRoot) {
    Write-Host "[MoveLab] APK derlemek icin Java ve Android SDK gerekiyor." -ForegroundColor Yellow
    Write-Host "[MoveLab] Android Studio kurulduktan sonra bu scripti tekrar calistir."
    Write-Host "[MoveLab] Alternatif: .\scripts\windows_install_jdk21.ps1 ve .\scripts\windows_install_android_sdk.ps1"
    Write-Host "[MoveLab] Beklenen env: ANDROID_HOME veya ANDROID_SDK_ROOT"
    exit 2
}

Set-Location $AndroidDir
Write-Host "[MoveLab] Debug APK derleniyor..." -ForegroundColor Cyan
& ".\gradlew.bat" assembleDebug
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

if (Test-Path $ApkPath) {
    Write-Host "[MoveLab] APK hazir: $ApkPath" -ForegroundColor Green
} else {
    Write-Host "[MoveLab] APK yolu bulunamadi; Gradle cikisini kontrol et." -ForegroundColor Yellow
}
