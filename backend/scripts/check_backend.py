import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import DATABASE_BACKEND, DATABASE_URL, LEGACY_SQLITE_PATH
from app.core.db import migrate
from app.services.engine import stockfish_status


def safe_database_url(url: str):
    if "@" not in url or "://" not in url:
        return url

    scheme, rest = url.split("://", 1)
    credentials, host = rest.split("@", 1)
    if ":" not in credentials:
        return url
    user, _password = credentials.split(":", 1)
    return f"{scheme}://{user}:***@{host}"


def main():
    try:
        migrate()
        payload = {
            "status": "ok",
            "database": {
                "backend": DATABASE_BACKEND,
                "url": safe_database_url(DATABASE_URL),
                "legacy_sqlite_path": str(LEGACY_SQLITE_PATH),
                "legacy_sqlite_exists": LEGACY_SQLITE_PATH.exists(),
            },
            "stockfish": stockfish_status(),
        }
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    except Exception as exc:
        payload = {
            "status": "error",
            "database": {
                "backend": DATABASE_BACKEND,
                "url": safe_database_url(DATABASE_URL),
            },
            "hint": "Database baglantisini, .env icindeki MOVELAB_DATABASE_URL degerini ve server durumunu kontrol et.",
            "error": str(exc),
        }
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        raise SystemExit(1)


if __name__ == "__main__":
    main()
