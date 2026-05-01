from pathlib import Path
import os

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover
    load_dotenv = None

APP_NAME = "MoveLab"
APP_VERSION = "0.8.0"

BASE_DIR = Path(__file__).resolve().parents[2]
PACKAGE_ROOT = BASE_DIR.parent

if load_dotenv:
    load_dotenv(PACKAGE_ROOT / ".env")


def env_path(name, default):
    value = os.getenv(name)
    if not value:
        return Path(default)

    path = Path(value)
    return path if path.is_absolute() else PACKAGE_ROOT / path


DATA_DIR = env_path("MOVELAB_DATA_DIR", BASE_DIR / "data")
DATA_DIR.mkdir(parents=True, exist_ok=True)

LEGACY_SQLITE_PATH = env_path("MOVELAB_DB", DATA_DIR / "movelab.sqlite")
DEFAULT_DATABASE_URL = f"sqlite:///{LEGACY_SQLITE_PATH.as_posix()}"
DATABASE_URL = os.getenv("MOVELAB_DATABASE_URL", DEFAULT_DATABASE_URL)
DATABASE_BACKEND = "postgresql" if DATABASE_URL.startswith("postgresql") else "sqlite"
IS_SQLITE = DATABASE_BACKEND == "sqlite"

STOCKFISH_PATH = os.getenv("STOCKFISH_PATH", "stockfish")

DEFAULT_DEPTH = int(os.getenv("MOVELAB_DEPTH", "12"))
DEEP_DEPTH = int(os.getenv("MOVELAB_DEEP_DEPTH", "16"))

ENGINE_TIME_LIMIT = float(os.getenv("MOVELAB_ENGINE_TIME", "0.45"))
DEEP_ENGINE_TIME_LIMIT = float(os.getenv("MOVELAB_DEEP_ENGINE_TIME", "0.80"))
MAX_PGN_BYTES = int(os.getenv("MOVELAB_MAX_PGN_BYTES", str(2 * 1024 * 1024)))

DEFAULT_CORS_ORIGINS = "http://127.0.0.1:5173,http://localhost:5173,https://localhost,capacitor://localhost"
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("MOVELAB_CORS_ORIGINS", DEFAULT_CORS_ORIGINS).split(",")
    if origin.strip()
]

CHESSCOM_USER_AGENT = os.getenv(
    "CHESSCOM_USER_AGENT",
    "MoveLab/0.8 local-training-app contact: local-beta@example.com",
)

BILLING_PROVIDER = os.getenv("MOVELAB_BILLING_PROVIDER", "manual")
BILLING_PORTAL_URL = os.getenv("MOVELAB_BILLING_PORTAL_URL", "")
BILLING_SUPPORT_EMAIL = os.getenv("MOVELAB_BILLING_SUPPORT_EMAIL", "billing@movelab.local")

PUBLIC_ROADMAP = [
    "Chess.com import health scoring",
    "Coach-led move explanations",
    "Billing provider wiring placeholder",
    "PostgreSQL production deployment",
]
