import chess

PIECE_VALUES = {
    chess.PAWN: 100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK: 500,
    chess.QUEEN: 900,
}

PIECE_NAMES = {
    chess.PAWN: "piyon",
    chess.KNIGHT: "at",
    chess.BISHOP: "fil",
    chess.ROOK: "kale",
    chess.QUEEN: "vezir",
    chess.KING: "sah",
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


def move_context(san, best_uci, played_uci, fen_before, fen_after):
    details = []

    try:
        board_before = chess.Board(fen_before)
        board_after = chess.Board(fen_after)
        played = chess.Move.from_uci(played_uci) if played_uci else None
    except ValueError:
        board_before = None
        board_after = None
        played = None

    if played and board_before:
        piece = board_before.piece_at(played.from_square)
        captured = board_before.piece_at(played.to_square)
        if piece:
            details.append(
                f"{PIECE_NAMES.get(piece.piece_type, 'tas')} {chess.square_name(played.from_square)}-{chess.square_name(played.to_square)} hattina gitti"
            )
        if captured:
            details.append(
                f"{chess.square_name(played.to_square)} karesindeki {PIECE_NAMES.get(captured.piece_type, 'tas')} alindi"
            )
        if board_before.is_castling(played):
            details.append("rok ile sah guvenligi guncellendi")
        if played.promotion:
            details.append(f"terfi {PIECE_NAMES.get(played.promotion, 'tas')} ile geldi")

    if board_after:
        if board_after.is_check():
            details.append("hamle sonrasi sah cekiliyor")
        legal_checks = 0
        for candidate in board_after.legal_moves:
            try:
                board_after.push(candidate)
                if board_after.is_check():
                    legal_checks += 1
                board_after.pop()
            except Exception:
                pass
        if legal_checks:
            details.append(f"rakibin {legal_checks} sah cekme kaynagi var")

    if best_uci and played_uci and best_uci != played_uci:
        details.append(f"motorun ilk tercihi {best_uci}, oynanan {played_uci}")
    elif best_uci and played_uci == best_uci:
        details.append("oynanan hamle motorun ilk tercihiyle eslesiyor")

    if is_forcing_san(san):
        details.append("hamle forcing karakter tasiyor")

    return "; ".join(details[:4])


def build_explanation(base, loss, san, best_uci, played_uci, fen_before, fen_after, side, eval_before_cp, eval_after_cp):
    side_bool = normalize_side(side)
    before = eval_for_side(eval_before_cp, side_bool)
    after = eval_for_side(eval_after_cp, side_bool)
    context = move_context(san, best_uci, played_uci, fen_before, fen_after)

    parts = [base]
    if before is not None and after is not None:
        parts.append(
            f"Taraf perspektifinde eval {before / 100:+.2f}'den {after / 100:+.2f}'ye gitti; kayip {loss / 100:.2f} piyon."
        )
    if best_uci and played_uci and best_uci != played_uci:
        parts.append(f"Daha temiz aday {best_uci}; oynanan {played_uci} ayni kaliteyi koruyamadi.")
    if context:
        parts.append(f"Pozisyon izi: {context}.")
    return " ".join(parts)


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
        return "book", "Analiz yok", 0.0, "Bu hamle icin motor analizi henuz yok."

    loss = max(0.0, float(loss_cp))

    if is_brilliant(loss, san, best_uci, played_uci, fen_before, fen_after, side, eval_before_cp, eval_after_cp):
        return (
            "brilliant",
            "Parlak fikir",
            0.72,
            build_explanation(
                "Dusuk motor kaybiyla riskli veya forcing bir fikir calisiyor.",
                loss,
                san,
                best_uci,
                played_uci,
                fen_before,
                fen_after,
                side,
                eval_before_cp,
                eval_after_cp,
            ),
        )

    if is_missed(loss, side, eval_before_cp, eval_after_cp):
        return (
            "missed",
            "Kacan firsat",
            0.66,
            build_explanation(
                "Avantaji buyutacak devam kacmis; hamle guvenli gorunse de baskiyi yeterince artirmiyor.",
                loss,
                san,
                best_uci,
                played_uci,
                fen_before,
                fen_after,
                side,
                eval_before_cp,
                eval_after_cp,
            ),
        )

    explanations = [
        (320, "blunder", "Kritik hata", 0.90, "Kritik taktik veya konumsal kayip var; sah, alma ve tehdit kontrolu kacmis."),
        (190, "mistake", "Hata", 0.86, "Belirgin hata; aday hamleler arasinda motorun ana fikri korunamamis."),
        (115, "wrong", "Ciddi sapma", 0.78, "Plan yonu saptigi icin pozisyon kalitesi ciddi dusuyor."),
        (60, "inaccuracy", "Kucuk hata", 0.72, "Kucuk dogruluk kaybi var; pozisyon oynanir ama baski veya koordinasyon azaliyor."),
        (28, "good", "Iyi hamle", 0.70, "Oynanabilir hamle; motor daha temiz bir aday bulsa da pozisyon dengesi korunuyor."),
        (9, "excellent", "Mukemmel hamle", 0.74, "Motor cizgisine yakin guclu hamle; ana plan korunuyor."),
        (0, "best", "En iyi hamle", 0.78, "Motor cizgisine cok yakin; hesap ve plan uyumlu."),
    ]

    for threshold, quality, label, confidence, base in explanations:
        if loss >= threshold:
            return (
                quality,
                label,
                confidence,
                build_explanation(base, loss, san, best_uci, played_uci, fen_before, fen_after, side, eval_before_cp, eval_after_cp),
            )

    return "best", "En iyi hamle", 0.78, "Motor cizgisine cok yakin."
