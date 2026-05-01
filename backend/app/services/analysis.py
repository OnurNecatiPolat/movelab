import chess
from sqlalchemy import select

from app.domain.classifier import classify_move
from app.models import Analysis, Move
from app.services.engine import StockfishService


def analyze_game(session, game_id, depth=12, passes=3, time_limit=0.45, force=False, max_moves=None):
    moves = session.execute(
        select(Move).where(Move.game_id == game_id).order_by(Move.ply)
    ).scalars().all()

    total = len(moves)
    analyzed = 0
    processed = 0
    max_moves = max(1, int(max_moves)) if max_moves else None

    with StockfishService() as engine:
        for move in moves:
            already_analyzed = bool(move.analysis and move.analysis.loss_cp is not None)

            if already_analyzed and not force:
                analyzed += 1
                continue

            if max_moves is not None and processed >= max_moves:
                if already_analyzed:
                    analyzed += 1
                continue

            board_before = chess.Board(move.fen_before)
            before = engine.analyze_consensus(
                board_before,
                depth=depth,
                passes=passes,
                time_limit=time_limit,
            )

            board_after = chess.Board(move.fen_after)
            after = engine.analyze_consensus(
                board_after,
                depth=depth,
                passes=passes,
                time_limit=time_limit,
            )

            before_side = before["white_cp"] if move.side == "white" else -before["white_cp"]
            after_side = after["white_cp"] if move.side == "white" else -after["white_cp"]
            loss = max(0.0, float(before_side) - float(after_side))

            quality, quality_label, class_confidence, explanation = classify_move(
                loss_cp=loss,
                san=move.san,
                best_uci=before["best_uci"],
                played_uci=move.uci,
                fen_before=move.fen_before,
                fen_after=move.fen_after,
                side=move.side,
                eval_before_cp=before["white_cp"],
                eval_after_cp=after["white_cp"],
                analyzed=True,
            )

            if move.analysis is None:
                move.analysis = Analysis(move_id=move.id)

            move.analysis.depth = max(before["depth"], after["depth"])
            move.analysis.passes = min(before["passes"], after["passes"])
            move.analysis.eval_before_cp = before["white_cp"]
            move.analysis.eval_after_cp = after["white_cp"]
            move.analysis.best_move_uci = before["best_uci"]
            move.analysis.loss_cp = loss
            move.analysis.quality = quality
            move.analysis.quality_label = quality_label
            move.analysis.confidence = min(before["confidence"], after["confidence"], class_confidence)
            move.analysis.explanation = explanation

            analyzed += 1
            processed += 1
            session.flush()

    remaining = max(0, total - analyzed)
    return {
        "status": "done" if remaining == 0 else "partial",
        "total": total,
        "analyzed": analyzed,
        "processed": processed,
        "remaining": remaining,
    }
