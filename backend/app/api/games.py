import chess
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from app.core.config import (
    DEEP_DEPTH,
    DEEP_ENGINE_TIME_LIMIT,
    DEFAULT_DEPTH,
    ENGINE_TIME_LIMIT,
)
from app.core.db import db
from app.domain.classifier import classify_move
from app.models import Analysis, Game, Move
from app.repositories.games import game_accuracies, game_card, game_title, list_games
from app.services.analysis import analyze_game
from app.services.engine import StockfishService, StockfishUnavailable

router = APIRouter(prefix="/api", tags=["games"])


class AnalyzeRequest(BaseModel):
    force: bool = False
    depth: int | None = Field(default=None, ge=6, le=24)
    passes: int = Field(default=3, ge=1, le=5)
    time_limit: float | None = Field(default=None, ge=0.1, le=3.0)
    deep: bool = False


class MoveAnalyzeRequest(BaseModel):
    fen: str = Field(min_length=10, max_length=120)
    move_uci: str = Field(min_length=4, max_length=5)
    depth: int = Field(default=12, ge=6, le=24)
    passes: int = Field(default=3, ge=1, le=5)


@router.get("/games")
def games(limit: int = 150):
    limit = max(1, min(300, int(limit or 150)))
    with db() as session:
        return list_games(session, limit=limit)


@router.get("/games/{game_id}/review")
def review(game_id: int):
    with db() as session:
        game = session.get(Game, game_id)
        if game is None:
            raise HTTPException(status_code=404, detail="Oyun bulunamadi.")

        rows = session.execute(
            select(Move, Analysis)
            .outerjoin(Analysis, Analysis.move_id == Move.id)
            .where(Move.game_id == game_id)
            .order_by(Move.ply)
        ).all()

        positions = [{
            "moveId": None,
            "ply": 0,
            "move": "Baslangic",
            "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            "evalCp": 0,
            "quality": "book",
            "qualityLabel": "Baslangic",
            "played": "-",
            "best": "e4 / d4",
            "loss": 0,
            "phase": "opening",
            "label": "Baslangic",
            "advice": "Merkez kontrolu, hizli gelisim ve sah guvenligi ana hedef.",
            "tactic": "Acilis prensipleri",
            "plan": "Merkezi tut, hafif taslari gelistir, rok at.",
            "highlights": ["e4", "d4"],
            "arrows": [],
            "sideToMove": "white",
            "isAnalyzed": False,
        }]

        for move, analysis in rows:
            quality = analysis.quality if analysis and analysis.quality else "book"
            best = analysis.best_move_uci if analysis and analysis.best_move_uci else "-"
            arrows = []

            if analysis and analysis.best_move_uci:
                arrows.append({
                    "from": analysis.best_move_uci[:2],
                    "to": analysis.best_move_uci[2:4],
                    "tone": "best",
                })

            if move.uci:
                if quality == "brilliant":
                    tone = "idea"
                elif quality in {"blunder", "mistake", "wrong", "missed"}:
                    tone = "danger"
                else:
                    tone = "attack"

                arrows.append({
                    "from": move.uci[:2],
                    "to": move.uci[2:4],
                    "tone": tone,
                })

            positions.append({
                "moveId": move.id,
                "ply": move.ply,
                "move": f"{move.move_number}. {move.san}",
                "fen": move.fen_after,
                "evalCp": analysis.eval_after_cp if analysis and analysis.eval_after_cp is not None else 0,
                "quality": quality,
                "qualityLabel": analysis.quality_label if analysis and analysis.quality_label else "Analiz yok",
                "played": move.san,
                "best": best,
                "loss": analysis.loss_cp if analysis and analysis.loss_cp is not None else 0,
                "phase": move.phase,
                "label": analysis.quality_label if analysis and analysis.quality_label else "Analiz yok",
                "advice": analysis.explanation if analysis and analysis.explanation else "Bu hamle icin detayli analiz henuz yok.",
                "tactic": "Motor onerisi ve karar kalitesi",
                "plan": "Aday hamleleri sirala: sah cekme, alma, tehdit. Sonra en temiz plana don.",
                "highlights": [],
                "arrows": arrows,
                "sideToMove": move.side,
                "isAnalyzed": bool(analysis and analysis.loss_cp is not None),
            })

        accuracies = game_accuracies(session, game_id)
        user_accuracy = accuracies["white"] if game.user_color == "white" else accuracies["black"] if game.user_color == "black" else None
        opponent_accuracy = accuracies["black"] if game.user_color == "white" else accuracies["white"] if game.user_color == "black" else None
        analyzed_count = sum(1 for position in positions if position.get("isAnalyzed"))
        total_moves = max(0, len(positions) - 1)

        return {
            "game": {
                **game_card(session, game),
                "title": game_title(game),
                "analysisStatus": {
                    "totalMoves": total_moves,
                    "analyzedMoves": analyzed_count,
                },
            },
            "positions": positions,
        }


@router.post("/games/{game_id}/analyze")
def analyze(game_id: int, payload: AnalyzeRequest):
    with db() as session:
        game = session.get(Game, game_id)
        if game is None:
            raise HTTPException(status_code=404, detail="Oyun bulunamadi.")

        depth = payload.depth or (DEEP_DEPTH if payload.deep else DEFAULT_DEPTH)
        time_limit = payload.time_limit or (DEEP_ENGINE_TIME_LIMIT if payload.deep else ENGINE_TIME_LIMIT)

        try:
            return analyze_game(
                session,
                game_id,
                depth=depth,
                passes=payload.passes,
                time_limit=time_limit,
                force=payload.force,
            )
        except StockfishUnavailable as exc:
            raise HTTPException(status_code=503, detail=str(exc))


@router.post("/analyze-move")
def analyze_move(payload: MoveAnalyzeRequest):
    try:
        board = chess.Board(payload.fen)
    except ValueError:
        raise HTTPException(status_code=400, detail="Gecersiz FEN.")

    try:
        move = chess.Move.from_uci(payload.move_uci)
    except ValueError:
        raise HTTPException(status_code=400, detail="Gecersiz UCI hamlesi.")

    if move not in board.legal_moves:
        raise HTTPException(status_code=400, detail="Legal olmayan hamle.")

    side = "white" if board.turn == chess.WHITE else "black"
    san = board.san(move)
    fen_before = board.fen()

    try:
        with StockfishService() as engine:
            before = engine.analyze_consensus(
                board,
                depth=payload.depth,
                passes=payload.passes,
                time_limit=0.45,
            )
            board.push(move)
            fen_after = board.fen()
            after = engine.analyze_consensus(
                board,
                depth=payload.depth,
                passes=payload.passes,
                time_limit=0.45,
            )
    except StockfishUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    before_side = before["white_cp"] if side == "white" else -before["white_cp"]
    after_side = after["white_cp"] if side == "white" else -after["white_cp"]
    loss = max(0.0, before_side - after_side)

    quality, quality_label, confidence, explanation = classify_move(
        loss,
        san,
        before["best_uci"],
        payload.move_uci,
        fen_before,
        fen_after,
        side,
        before["white_cp"],
        after["white_cp"],
        True,
    )

    arrows = []
    if before["best_uci"]:
        arrows.append({
            "from": before["best_uci"][:2],
            "to": before["best_uci"][2:4],
            "tone": "best",
        })

    arrows.append({
        "from": payload.move_uci[:2],
        "to": payload.move_uci[2:4],
        "tone": "idea" if quality == "brilliant" else "attack",
    })

    return {
        "fen": fen_after,
        "fenAfter": fen_after,
        "played": san,
        "best": before["best_uci"],
        "evalCp": after["white_cp"],
        "loss": round(loss, 1),
        "quality": quality,
        "qualityLabel": quality_label,
        "advice": explanation,
        "phase": "analysis",
        "arrows": arrows,
        "highlights": [payload.move_uci[:2], payload.move_uci[2:4]],
        "sideToMove": side,
        "confidence": confidence,
    }


@router.get("/platform/overview")
def platform_overview():
    with db() as session:
        games_count = session.execute(select(func.count(Game.id))).scalar_one()
        moves_count = session.execute(select(func.count(Move.id))).scalar_one()
        analyses_count = session.execute(select(func.count(Analysis.id))).scalar_one()
        return {
            "games": games_count,
            "moves": moves_count,
            "analyses": analyses_count,
        }
