import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.db import db, migrate
from app.services.pgn_importer import pgn_headers, parse_pgn_moves
from app.repositories.games import insert_game, replace_moves

DEMO_PGN = """
[Event "MoveLab Demo"]
[Site "https://www.chess.com/game/demo"]
[Date "2026.04.30"]
[Round "-"]
[White "CaarlsenKaybediyoo"]
[Black "Demo_Rakip"]
[Result "1-0"]
[TimeControl "600"]
[TimeClass "rapid"]
[EndTime "1777500000"]

1. e4 e5 2. Qf3 Nc6 3. Bc4 Nf6 4. Nh3 Bc5 5. O-O O-O 6. d3 d6 7. Bg5 h6 8. Bxf6 Qxf6 9. Qxf6 gxf6 10. Nc3 1-0
""".strip()

def main():
    migrate()

    with db() as conn:
        headers = pgn_headers(DEMO_PGN)
        game_id = insert_game(
            conn,
            "CaarlsenKaybediyoo",
            DEMO_PGN,
            headers,
            "https://www.chess.com/game/demo",
        )
        moves = parse_pgn_moves(game_id, DEMO_PGN)
        replace_moves(conn, game_id, moves)
        print({"status": "ok", "game_id": game_id, "moves": len(moves)})

if __name__ == "__main__":
    main()
