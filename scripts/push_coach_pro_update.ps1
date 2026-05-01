param(
    [string]$Branch = "coach-pro-update"
)

$ErrorActionPreference = "Stop"

Write-Host "[MoveLab] Coach Pro branch: $Branch" -ForegroundColor Cyan

git status
git checkout -B $Branch
git add backend frontend README.md INTEGRATION_DEPLOY.md DEPLOY_COACH_PRO_NOW.md VERSION.txt railway.toml .env.example .gitignore scripts

try {
    git commit -m "Add Coach Pro review, new-game sync, batch deep analysis, and polished charts"
} catch {
    Write-Host "[MoveLab] Commit oluşturulmadı; değişiklik olmayabilir." -ForegroundColor Yellow
}

git push -u origin $Branch

Write-Host ""
Write-Host "[MoveLab] Push tamam. GitHub'da PR açıp main'e merge et." -ForegroundColor Green
Write-Host "[MoveLab] Vercel/Railway GitHub bağlıysa deploy otomatik tetiklenir." -ForegroundColor Green
