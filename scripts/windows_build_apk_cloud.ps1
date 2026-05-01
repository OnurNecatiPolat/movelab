$ErrorActionPreference = "Stop"

param(
    [Parameter(Mandatory = $true)]
    [string]$ApiBase
)

$Root = Resolve-Path "$PSScriptRoot\.."

if (-not $ApiBase.StartsWith("https://")) {
    Write-Host "[MoveLab] Cloud APK icin HTTPS API adresi onerilir." -ForegroundColor Yellow
}

powershell -ExecutionPolicy Bypass -File (Join-Path $Root "scripts\windows_build_apk.ps1") -ApiBase $ApiBase
