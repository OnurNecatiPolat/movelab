import io
import chess
import chess.pgn
from app.domain.phase import phase_for_ply

def pgn_headers(pgn):
    parsed = chess.pgn.read_game(io.StringIO(pgn))
    if parsed is None:
        return {}
    return dict(parsed.headers)

def parse_pgn_moves(game_id, pgn):
    parsed = chess.pgn.read_game(io.StringIO(pgn))
    if parsed is None:
        return []

    board = parsed.board()
    rows = []
    ply = 0

    for node in parsed.mainline():
        move = node.move
        fen_before = board.fen()
        san = board.san(move)
        side = "white" if board.turn == chess.WHITE else "black"
        move_number = board.fullmove_number
        uci = move.uci()

        board.push(move)
        fen_after = board.fen()
        ply += 1

        rows.append({
            "game_id": game_id,
            "ply": ply,
            "move_number": move_number,
            "side": side,
            "san": san,
            "uci": uci,
            "fen_before": fen_before,
            "fen_after": fen_after,
            "phase": phase_for_ply(ply, board),
        })

    return rows
