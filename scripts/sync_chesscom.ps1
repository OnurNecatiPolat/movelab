param(
    [string]$Username = "CaarlsenKaybediyoo",
    [int]$Archives = 1
)

$ErrorActionPreference = "Stop"

$Root = "C:\MoveLabFresh"
. "$Root\scripts\env.ps1"

$body = @{
    username = $Username
    max_archives = $Archives
} | ConvertTo-Json

Invoke-RestMethod `
    -Uri "http://127.0.0.1:8000/api/import/chesscom" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body | ConvertTo-Json -Depth 8
