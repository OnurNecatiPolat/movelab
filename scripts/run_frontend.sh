#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/frontend"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi
npm run dev
