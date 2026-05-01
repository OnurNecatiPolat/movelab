import chess

PIECE_VALUES = {
    chess.PAWN: 100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK: 500,
    chess.QUEEN: 900,
}


def normalize_side(side):
    value = str(side or "").lower()
    if value in {"white", "w", "true", "1"}:
        return chess.WHITE
    if value in {"black", "b", "false", "0"}:
        return chess.BLACK
    return None


def eval_for_side(cp, side):
    if cp is None or side is None:
        return None
    return float(cp) if side == chess.WHITE else -float(cp)


def material_balance(fen, side):
    if not fen or side is None:
        return None

    try:
        board = chess.Board(fen)
    except ValueError:
        return None

    total = 0
    for piece in board.piece_map().values():
        value = PIECE_VALUES.get(piece.piece_type, 0)
        total += value if piece.color == side else -value
    return total


def is_forcing_san(san):
    return any(mark in (san or "") for mark in ["x", "+", "#", "!", "="])


def is_brilliant(loss_cp, san, best_uci, played_uci, fen_before, fen_after, side, eval_before_cp, eval_after_cp):
    loss = float(loss_cp or 0)
    if loss > 10:
        return False

    side_bool = normalize_side(side)
    after_eval = eval_for_side(eval_after_cp, side_bool)
    before_eval = eval_for_side(eval_before_cp, side_bool)
    before_mat = material_balance(fen_before, side_bool)
    after_mat = material_balance(fen_after, side_bool)
    mat_delta = None if before_mat is None or after_mat is None else after_mat - before_mat

    forcing = is_forcing_san(san)
    different_from_first = bool(best_uci and played_uci and best_uci != played_uci)
    sacrifice_like = mat_delta is not None and mat_delta <= -180 and after_eval is not None and after_eval >= -35
    creative_alt = (
        different_from_first
        and forcing
        and loss <= 6
        and after_eval is not None
        and after_eval >= 45
        and (before_eval is None or after_eval >= before_eval - 35)
    )
    annotated = "!!" in (san or "") and loss <= 8 and after_eval is not None and after_eval >= -20

    return bool(sacrifice_like or creative_alt or annotated)


def is_missed(loss_cp, side, eval_before_cp, eval_after_cp):
    loss = float(loss_cp or 0)
    if loss < 90 or loss > 240:
        return False

    side_bool = normalize_side(side)
    before = eval_for_side(eval_before_cp, side_bool)
    after = eval_for_side(eval_after_cp, side_bool)

    if before is None or after is None or after >= 120:
        return False

    return before >= 180 and (before - after) >= 110


def classify_move(
    loss_cp,
    san,
    best_uci,
    played_uci,
    fen_before,
    fen_after,
    side,
    eval_before_cp,
    eval_after_cp,
    analyzed=True,
):
    if not analyzed or loss_cp is None:
        return "book", "Analiz yok", 0.0, "Bu hamle için motor analizi henüz yok."

    loss = max(0.0, float(loss_cp))

    if is_brilliant(loss, san, best_uci, played_uci, fen_before, fen_after, side, eval_before_cp, eval_after_cp):
        return (
            "brilliant",
            "Parlak fikir",
            0.72,
            "Düşük motor kaybıyla risk, feda veya forcing karakteri taşıyor ve pozisyonu ayakta tutuyor.",
        )

    if is_missed(loss, side, eval_before_cp, eval_after_cp):
        return (
            "missed",
            "Kaçan fırsat",
            0.66,
            "Daha güçlü bir devam varken avantajın önemli bir kısmı kaçmış görünüyor.",
        )

    if loss >= 320:
        return "blunder", "Kritik hata", 0.90, "Çok büyük centipawn kaybı; taktik güvenlik taraması gerekli."
    if loss >= 190:
        return "mistake", "Hata", 0.86, "Belirgin hata; aday hamleler yeniden kıyaslanmalı."
    if loss >= 115:
        return "wrong", "Ciddi sapma", 0.78, "Plan yönü veya taktik hesapta ciddi sapma var."
    if loss >= 60:
        return "inaccuracy", "Küçük hata", 0.72, "Küçük ama birikince baskı yaratan doğruluk kaybı."
    if loss >= 28:
        return "good", "İyi hamle", 0.70, "Oynanabilir hamle; daha iyi alternatif mevcut olabilir."
    if loss >= 9:
        return "excellent", "Mükemmel hamle", 0.74, "Motor çizgisine yakın, güçlü hamle."
    return "best", "En iyi hamle", 0.78, "Motor çizgisine çok yakın."
