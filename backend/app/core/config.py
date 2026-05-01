from pathlib import Path
import os
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

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


def normalize_database_url(url: str) -> str:
    if url.startswith("postgres://"):
        url = "postgresql+psycopg://" + url.removeprefix("postgres://")
    elif url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url.removeprefix("postgresql://")

    if not url.startswith("postgresql+psycopg://"):
        return url

    parsed = urlsplit(url)
    sslmode = os.getenv("MOVELAB_DATABASE_SSLMODE")
    needs_railway_ssl = parsed.hostname and parsed.hostname.endswith(".proxy.rlwy.net")
    connect_timeout = os.getenv("MOVELAB_DATABASE_CONNECT_TIMEOUT", "10")

    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    if sslmode or needs_railway_ssl:
        query.setdefault("sslmode", sslmode or "require")
    query.setdefault("connect_timeout", connect_timeout)
    return urlunsplit(parsed._replace(query=urlencode(query)))


DATABASE_URL = normalize_database_url(
    os.getenv("MOVELAB_DATABASE_URL") or os.getenv("DATABASE_URL") or DEFAULT_DATABASE_URL
)
DATABASE_BACKEND = "postgresql" if DATABASE_URL.startswith("postgresql") else "sqlite"
IS_SQLITE = DATABASE_BACKEND == "sqlite"

STOCKFISH_PATH = os.getenv("STOCKFISH_PATH", "stockfish")

DEFAULT_DEPTH = int(os.getenv("MOVELAB_DEPTH", "12"))
DEEP_DEPTH = int(os.getenv("MOVELAB_DEEP_DEPTH", "16"))

ENGINE_TIME_LIMIT = float(os.getenv("MOVELAB_ENGINE_TIME", "0.45"))
DEEP_ENGINE_TIME_LIMIT = float(os.getenv("MOVELAB_DEEP_ENGINE_TIME", "0.80"))
MAX_PGN_BYTES = int(os.getenv("MOVELAB_MAX_PGN_BYTES", str(2 * 1024 * 1024)))

DEFAULT_CORS_ORIGINS = (
    "http://127.0.0.1:5173,http://localhost:5173,http://localhost,"
    "https://localhost,capacitor://localhost,ionic://localhost,"
    "https://movelab-seven.vercel.app"
)
RUNTIME_CORS_ORIGINS = [
    "http://localhost",
    "https://localhost",
    "capacitor://localhost",
    "ionic://localhost",
    "https://movelab-seven.vercel.app",
]
_configured_cors_origins = [
    origin.strip()
    for origin in os.getenv("MOVELAB_CORS_ORIGINS", DEFAULT_CORS_ORIGINS).split(",")
    if origin.strip()
]
CORS_ORIGINS = sorted(set(_configured_cors_origins + RUNTIME_CORS_ORIGINS))
CORS_ORIGIN_REGEX = os.getenv("MOVELAB_CORS_ORIGIN_REGEX", r"https://.*\.vercel\.app").strip() or None

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
