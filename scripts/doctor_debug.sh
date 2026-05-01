#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "[MoveLab] root=$ROOT"
echo "[MoveLab] python:"
python --version || true
echo "[MoveLab] node:"
node --version || true
echo "[MoveLab] npm:"
npm --version || true
echo "[MoveLab] stockfish:"
which stockfish || true
echo "[MoveLab] backend check:"
cd "$ROOT"
./scripts/check_backend.sh
