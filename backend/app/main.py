from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, HTTPException, Request
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

logger = logging.getLogger(__name__)


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
    app.state.database_ready = False
    app.state.database_error = None
    try:
        migrate()
        app.state.database_ready = True
    except Exception as exc:
        app.state.database_error = str(exc)
        logger.exception("Database migration failed during startup")
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
def health(request: Request):
    database = {
        "backend": DATABASE_BACKEND,
        "url": safe_database_url(DATABASE_URL),
        "legacySqlitePath": str(LEGACY_SQLITE_PATH),
        "legacySqliteExists": LEGACY_SQLITE_PATH.exists(),
        "ready": bool(getattr(request.app.state, "database_ready", False)),
    }
    database_error = getattr(request.app.state, "database_error", None)
    if database_error:
        database["error"] = database_error

    return {
        "status": "ok" if database["ready"] else "degraded",
        "app": APP_NAME,
        "database": database,
        "stockfish": stockfish_status(),
        "version": APP_VERSION,
    }


@app.get("/api/ready")
def ready(request: Request):
    if not getattr(request.app.state, "database_ready", False):
        raise HTTPException(
            status_code=503,
            detail=getattr(request.app.state, "database_error", None) or "Database is not ready.",
        )
    return {"status": "ready", "database": {"backend": DATABASE_BACKEND}}


@app.get("/api/engine/status")
def engine_status():
    return stockfish_status()
