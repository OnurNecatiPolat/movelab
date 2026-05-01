param(
    [string]$Username = "CaarlsenKaybediyoo",
    [int]$Archives = 2
)

$ErrorActionPreference = "Stop"

Write-Host "[MoveLab] Chess.com sync basliyor..." -ForegroundColor Cyan
Write-Host "[MoveLab] Username: $Username"
Write-Host "[MoveLab] Archives: $Archives"
Write-Host "[MoveLab] Backend: http://127.0.0.1:8000"

$body = @{
    username = $Username
    max_archives = $Archives
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod `
        -Uri "http://127.0.0.1:8000/api/import/chesscom" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body

    $response | ConvertTo-Json -Depth 8
}
catch {
    Write-Host "[MoveLab] Sync hatasi:" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.ReadToEnd()
    } else {
        $_.Exception.Message
    }
    exit 1
}
