import hashlib

from sqlalchemy import delete, func, select

from app.domain.accuracy import game_accuracy
from app.models import Analysis, Game, Move


def safe_int(value, default=0):
    try:
        if value is None or value == "":
            return default
        return int(str(value).strip())
    except Exception:
        return default


def game_title(game):
    return f"{game.white_username or 'White'} vs {game.black_username or 'Black'}"


def insert_game(session, owner_username, pgn, headers, url=None):
    white = headers.get("White")
    black = headers.get("Black")
    owner_normalized = (owner_username or "").lower().strip()

    if (white or "").lower().strip() == owner_normalized:
        user_color = "white"
    elif (black or "").lower().strip() == owner_normalized:
        user_color = "black"
    else:
        user_color = None

    link = url or headers.get("Link") or headers.get("Site")
    if not link:
        link = "local:pgn:" + hashlib.sha256(pgn.encode("utf-8")).hexdigest()[:24]

    end_time = safe_int(headers.get("EndTime"), 0)

    game = session.execute(
        select(Game).where(Game.chesscom_url == link)
    ).scalar_one_or_none()

    if game is None:
        game = Game(chesscom_url=link)
        session.add(game)

    game.owner_username = owner_username
    game.pgn = pgn
    game.white_username = white
    game.black_username = black
    game.user_color = user_color
    game.result = headers.get("Result")
    game.time_class = headers.get("TimeClass") or headers.get("TimeControl")
    game.time_control = headers.get("TimeControl")
    game.eco_url = headers.get("ECOUrl") or headers.get("ECO")
    game.end_time = end_time

    session.flush()
    return game.id


def replace_moves(session, game_id, moves):
    session.execute(
        delete(Analysis).where(
            Analysis.move_id.in_(select(Move.id).where(Move.game_id == game_id))
        )
    )
    session.execute(delete(Move).where(Move.game_id == game_id))

    if not moves:
        return

    session.add_all(Move(**move_data) for move_data in moves)


def game_accuracies(session, game_id):
    rows = session.execute(
        select(Move.side, Analysis.loss_cp)
        .join(Analysis, Analysis.move_id == Move.id)
        .where(Move.game_id == game_id, Analysis.loss_cp.is_not(None))
        .order_by(Move.ply)
    ).all()

    losses = {"white": [], "black": []}
    for side, loss_cp in rows:
        if side in losses:
            losses[side].append(loss_cp)

    return {
        "white": game_accuracy(losses["white"]),
        "black": game_accuracy(losses["black"]),
    }


def game_card(session, game):
    acc = game_accuracies(session, game.id)
    user_color = game.user_color
    user_acc = acc["white"] if user_color == "white" else acc["black"] if user_color == "black" else None
    opponent_acc = acc["black"] if user_color == "white" else acc["white"] if user_color == "black" else None

    return {
        "id": game.id,
        "title": game_title(game),
        "whiteUsername": game.white_username,
        "blackUsername": game.black_username,
        "userColor": user_color,
        "result": game.result,
        "timeClass": game.time_class,
        "timeControl": game.time_control,
        "opening": game.eco_url or "Bilinmeyen açılış",
        "whiteAccuracy": acc["white"],
        "blackAccuracy": acc["black"],
        "userAccuracy": user_acc,
        "opponentAccuracy": opponent_acc,
        "accuracy": user_acc,
    }


def list_games(session, limit=150):
    games = session.execute(
        select(Game)
        .order_by(func.coalesce(Game.end_time, 0).desc(), Game.id.desc())
        .limit(limit)
    ).scalars().all()
    return [game_card(session, game) for game in games]
