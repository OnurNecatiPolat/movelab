import logging

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select

from app.core.config import CHESSCOM_USER_AGENT, MAX_PGN_BYTES
from app.core.db import db
from app.models import Game
from app.repositories.games import insert_game, replace_moves
from app.services.pgn_importer import parse_pgn_moves, pgn_headers

router = APIRouter(prefix="/api/import", tags=["import"])
logger = logging.getLogger(__name__)


class PgnImportRequest(BaseModel):
    owner_username: str = Field(min_length=1, max_length=80)
    pgn: str = Field(min_length=20)
    url: str | None = Field(default=None, max_length=500)

    @field_validator("owner_username")
    @classmethod
    def clean_owner_username(cls, value):
        return value.strip()

    @field_validator("pgn")
    @classmethod
    def validate_pgn_size(cls, value):
        if len(value.encode("utf-8")) > MAX_PGN_BYTES:
            raise ValueError("PGN dosyasi izin verilen boyutu asiyor.")
        return value.strip()


class ChesscomSyncRequest(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    owner_username: str | None = Field(default=None, max_length=80)
    max_archives: int | None = Field(default=None, ge=1, le=600)
    all_archives: bool = True
    new_only: bool = True

    @field_validator("username")
    @classmethod
    def clean_username(cls, value):
        return value.strip()

    @field_validator("owner_username")
    @classmethod
    def clean_owner_username(cls, value):
        if value is None or value.strip() == "":
            return None
        return value.strip()


@router.post("/pgn")
def import_pgn(payload: PgnImportRequest):
    try:
        headers = pgn_headers(payload.pgn)
        if not headers:
            raise HTTPException(status_code=400, detail="PGN okunamadi veya gecersiz.")

        with db() as session:
            game_id = insert_game(session, payload.owner_username, payload.pgn, headers, payload.url)
            moves = parse_pgn_moves(game_id, payload.pgn)
            replace_moves(session, game_id, moves)
            return {"status": "ok", "gameId": game_id, "moves": len(moves)}
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("PGN import failed")
        raise HTTPException(status_code=500, detail=f"PGN import sirasinda hata olustu: {exc}")


@router.post("/chesscom")
async def sync_chesscom(payload: ChesscomSyncRequest):
    username = payload.username
    owner_username = payload.owner_username or username
    request_headers = {"User-Agent": CHESSCOM_USER_AGENT}
    archive_urls = []
    games = []

    try:
        timeout = httpx.Timeout(60.0, connect=15.0)
        async with httpx.AsyncClient(timeout=timeout, headers=request_headers, follow_redirects=True) as client:
            archives_response = await client.get(
                f"https://api.chess.com/pub/player/{username}/games/archives"
            )

            if archives_response.status_code == 404:
                raise HTTPException(
                    status_code=404,
                    detail=f"Chess.com kullanicisi bulunamadi veya arsiv yok: {username}",
                )

            if archives_response.status_code == 429:
                raise HTTPException(
                    status_code=429,
                    detail="Chess.com rate-limit verdi. Birkac dakika sonra tekrar dene.",
                )

            archives_response.raise_for_status()
            all_archive_urls = archives_response.json().get("archives", [])
            if payload.all_archives:
                archive_urls = all_archive_urls
            else:
                archive_count = payload.max_archives or 12
                archive_urls = all_archive_urls[-archive_count:]

            for archive_url in archive_urls:
                archive_response = await client.get(archive_url)

                if archive_response.status_code == 429:
                    raise HTTPException(
                        status_code=429,
                        detail=f"Chess.com rate-limit verdi. Son arsiv: {archive_url}",
                    )

                archive_response.raise_for_status()
                games.extend(archive_response.json().get("games", []))

    except HTTPException:
        raise
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Chess.com API HTTP hatasi.",
                "error": str(exc),
                "status_code": exc.response.status_code if exc.response else None,
            },
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Chess.com API baglanti hatasi.",
                "error": str(exc),
            },
        )

    imported = 0
    imported_new = 0
    updated_existing = 0
    skipped = 0
    skipped_existing = 0
    failed = []

    try:
        with db() as session:
            for index, game in enumerate(games):
                pgn = game.get("pgn")
                if not pgn:
                    skipped += 1
                    continue

                try:
                    parsed_headers = pgn_headers(pgn)
                    if not parsed_headers:
                        skipped += 1
                        continue

                    link = game.get("url") or parsed_headers.get("Link") or parsed_headers.get("Site")
                    existing = None
                    if link:
                        existing = session.execute(select(Game).where(Game.chesscom_url == link)).scalar_one_or_none()

                    existing_same = existing is not None and existing.pgn == pgn
                    if existing_same and payload.new_only:
                        skipped_existing += 1
                        continue

                    game_id = insert_game(session, owner_username, pgn, parsed_headers, game.get("url"))

                    if existing_same:
                        skipped_existing += 1
                        continue

                    moves = parse_pgn_moves(game_id, pgn)
                    replace_moves(session, game_id, moves)
                    imported += 1
                    if existing is None:
                        imported_new += 1
                    else:
                        updated_existing += 1
                except Exception as exc:
                    failed.append({
                        "index": index,
                        "url": game.get("url"),
                        "error": str(exc),
                    })

            return {
                "status": "ok" if not failed else "partial",
                "username": username,
                "owner_username": owner_username,
                "archives_checked": len(archive_urls),
                "games_seen": len(games),
                "imported": imported,
                "imported_new": imported_new,
                "updated_existing": updated_existing,
                "skipped": skipped,
                "skipped_existing": skipped_existing,
                "new_only": payload.new_only,
                "failed_count": len(failed),
                "failed_first_5": failed[:5],
            }
    except Exception as exc:
        logger.exception("Chess.com database import failed")
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Database import sirasinda hata olustu.",
                "error": str(exc),
                "archives_checked": len(archive_urls),
                "games_seen": len(games),
                "imported_before_error": imported,
            },
        )
