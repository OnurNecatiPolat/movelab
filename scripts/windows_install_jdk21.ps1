$ErrorActionPreference = "Stop"

$Root = Resolve-Path "$PSScriptRoot\.."
$Downloads = Join-Path $Root ".runtime\downloads"
$JdkRoot = Join-Path $Root ".runtime\jdk-21"
$ZipPath = Join-Path $Downloads "microsoft-jdk-21-windows-x64.zip"
$Url = "https://aka.ms/download-jdk/microsoft-jdk-21-windows-x64.zip"

New-Item -ItemType Directory -Force -Path $Downloads | Out-Null
New-Item -ItemType Directory -Force -Path $JdkRoot | Out-Null

$ExistingJava = Get-ChildItem -Path $JdkRoot -Recurse -Filter java.exe -ErrorAction SilentlyContinue | Select-Object -First 1
if ($ExistingJava) {
    Write-Host "[MoveLab] JDK 21 zaten hazir: $($ExistingJava.FullName)" -ForegroundColor Green
    exit 0
}

if (!(Test-Path $ZipPath) -or ((Get-Item $ZipPath).Length -lt 100000000)) {
    Write-Host "[MoveLab] Microsoft OpenJDK 21 indiriliyor..." -ForegroundColor Cyan
    & curl.exe -L $Url -o $ZipPath
} else {
    Write-Host "[MoveLab] JDK 21 zip zaten mevcut." -ForegroundColor Green
}

Write-Host "[MoveLab] JDK 21 aciliyor..." -ForegroundColor Cyan
Expand-Archive -Path $ZipPath -DestinationPath $JdkRoot -Force

$Java = Get-ChildItem -Path $JdkRoot -Recurse -Filter java.exe -ErrorAction SilentlyContinue | Select-Object -First 1
if (!$Java) {
    throw "JDK 21 icinde java.exe bulunamadi."
}

Write-Host "[MoveLab] JDK 21 hazir: $($Java.FullName)" -ForegroundColor Green
