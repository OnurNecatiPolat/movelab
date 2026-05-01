import chess


def phase_for_ply(ply, board=None):
    if ply <= 14:
        return "opening"

    if board is not None:
        queens = len(board.pieces(chess.QUEEN, True)) + len(board.pieces(chess.QUEEN, False))
        minor_major = sum(
            len(board.pieces(piece_type, True)) + len(board.pieces(piece_type, False))
            for piece_type in (chess.KNIGHT, chess.BISHOP, chess.ROOK)
        )
        if queens == 0 and minor_major <= 6:
            return "endgame"

    if ply <= 58:
        return "middlegame"
    return "endgame"
