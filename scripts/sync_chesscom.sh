#!/usr/bin/env bash
set -euo pipefail
USERNAME="${1:-CaarlsenKaybediyoo}"
ARCHIVES="${2:-2}"

echo "[MoveLab] Chess.com sync başlıyor"
echo "[MoveLab] username=$USERNAME archives=$ARCHIVES"
echo "[MoveLab] Backend: http://127.0.0.1:8000"

curl -sS -X POST "http://127.0.0.1:8000/api/import/chesscom" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"max_archives\":$ARCHIVES}" | python -m json.tool
