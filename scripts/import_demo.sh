#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"

if [ ! -d ".venv" ]; then
  python -m venv .venv
fi

source .venv/bin/activate
python -m pip install -r requirements.txt

export PYTHONPATH="$PWD"
python scripts/import_demo.py
