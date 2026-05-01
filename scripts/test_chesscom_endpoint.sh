#!/usr/bin/env bash
set -euo pipefail
USERNAME="${1:-CaarlsenKaybediyoo}"
echo "[MoveLab] raw backend response:"
curl -i -X POST "http://127.0.0.1:8000/api/import/chesscom" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"max_archives\":1}"
echo
