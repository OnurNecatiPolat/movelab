param(
    [string]$Username = "CaarlsenKaybediyoo"
)

$ErrorActionPreference = "Stop"

$body = @{
    username = $Username
    max_archives = 1
} | ConvertTo-Json

Write-Host "[MoveLab] Raw backend response:" -ForegroundColor Cyan

try {
    Invoke-WebRequest `
        -Uri "http://127.0.0.1:8000/api/import/chesscom" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body
}
catch {
    Write-Host "[MoveLab] Endpoint hatasi:" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.ReadToEnd()
    } else {
        $_.Exception.Message
    }
    exit 1
}
