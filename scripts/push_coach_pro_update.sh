#!/usr/bin/env bash
set -euo pipefail

BRANCH="${1:-coach-pro-update}"

echo "[MoveLab] Coach Pro branch: $BRANCH"

git status
git checkout -B "$BRANCH"
git add backend frontend README.md INTEGRATION_DEPLOY.md DEPLOY_COACH_PRO_NOW.md VERSION.txt railway.toml .env.example .gitignore scripts || true
git commit -m "Add Coach Pro review, new-game sync, batch deep analysis, and polished charts" || {
  echo "[MoveLab] Commit oluşturulmadı; değişiklik olmayabilir."
}
git push -u origin "$BRANCH"

echo
echo "[MoveLab] Push tamam. GitHub'da PR açıp main'e merge et."
echo "[MoveLab] Vercel/Railway GitHub bağlıysa deploy otomatik tetiklenir."
