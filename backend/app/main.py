from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.billing import router as billing_router
from app.api.games import router as games_router
from app.api.imports import router as imports_router
from app.core.config import (
    APP_NAME,
    APP_VERSION,
    CORS_ORIGINS,
    DATABASE_BACKEND,
    DATABASE_URL,
    LEGACY_SQLITE_PATH,
)
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    migrate()
    yield


app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(games_router)
app.include_router(imports_router)
app.include_router(billing_router)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "app": APP_NAME,
        "database": {
            "backend": DATABASE_BACKEND,
            "url": safe_database_url(DATABASE_URL),
            "legacySqlitePath": str(LEGACY_SQLITE_PATH),
            "legacySqliteExists": LEGACY_SQLITE_PATH.exists(),
        },
        "stockfish": stockfish_status(),
        "version": APP_VERSION,
    }


@app.get("/api/engine/status")
def engine_status():
    return stockfish_status()
