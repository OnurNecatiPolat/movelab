from collections import Counter, defaultdict
from statistics import mean

from sqlalchemy import select

from app.models import Analysis, Game, Move


QUALITY_FOCUS = {
    "blunder": ("Taktik güvenlik", "Her hamleden önce 10 saniye: şah çekme, alma, tehdit. Önce rakibin cevabını gör, sonra hamleyi oynat."),
    "mistake": ("Aday hamle disiplini", "İlk akla gelen hamleyi hemen oynama. En az iki aday daha çıkar ve hangisi rakibe daha az karşı oyun veriyor bak."),
    "wrong": ("Plan netliği", "Hamlenin amacını tek cümleyle söyleyemiyorsan dur. Önce hedef kareyi, zayıflığı veya değişim planını belirle."),
    "missed": ("Fırsatı bitirme", "Avantajlıyken güvenli hamleye kaçma. Şah çekme, alma ve tehdit hamlelerini önce tara."),
    "inaccuracy": ("Küçük tempo kayıpları", "Büyük hata değil; sadece ritim kaybı. Gelişim, merkez ve şah güvenliği üçlüsünü bozmamaya çalış."),
}


def _phase_text(phase: str | None) -> str:
    return {
        "opening": "açılışta",
        "middlegame": "oyun ortasında",
        "endgame": "finalde",
    }.get(phase or "", "bu pozisyonda")


def _eval_direction(eval_before_cp: float | None, eval_after_cp: float | None) -> str:
    if eval_before_cp is None or eval_after_cp is None:
        return ""
    before = float(eval_before_cp)
    after = float(eval_after_cp)
    delta = after - before
    if abs(delta) < 20:
        return " Pozisyonun dengesi büyük ölçüde korunmuş."
    if delta > 0:
        return " Hamleden sonra pozisyon daha rahatlamış görünüyor."
    return " Hamleden sonra rakibin işi biraz kolaylaşmış."


def human_move_advice(
    *,
    quality: str | None,
    label: str | None,
    loss_cp: float | None,
    san: str | None,
    best_uci: str | None,
    played_uci: str | None,
    phase: str | None,
    eval_before_cp: float | None,
    eval_after_cp: float | None,
) -> str:
    """Short, human, coach-like advice for the review UI.

    The aim is not to sound like a raw engine trace. Keep it warm, direct,
    and immediately useful.
    """
    quality = quality or "book"
    played = san or played_uci or "bu hamle"
    best = best_uci or "motorun önerdiği aday"
    phase_tr = _phase_text(phase)
    loss = float(loss_cp or 0)
    eval_note = _eval_direction(eval_before_cp, eval_after_cp)

    if quality == "brilliant":
        return (
            f"Güzel fikir doktor. {played} sadece iyi bir hamle değil; rakibe pratik problem çıkaran aktif bir karar. "
            f"Bu tip hamlelerde aradığımız şey şu: risk var ama hesap kontrol altında. Bunu repertuvar ezberi değil, cesur aday hamle alışkanlığı olarak sakla."
        )

    if quality in {"best", "excellent"}:
        return (
            f"Temiz karar. {phase_tr.capitalize()} {played} pozisyonun senden istediği hamleye çok yakın. "
            f"Burada öğrenilecek şey gösteriş değil: sade plan, iyi taş koordinasyonu ve rakibe gereksiz karşı oyun vermemek.{eval_note}"
        )

    if quality == "good":
        return (
            f"Bu hamle oynanır. Kötü değil; sadece biraz daha net bir seçenek vardı. "
            f"Bir dahaki sefere {best} gibi adayları da masaya koy. Hedefimiz hamle ezberlemek değil, iyi adayları kıyaslama refleksi kazanmak."
        )

    if quality in {"inaccuracy", "wrong", "mistake", "blunder", "missed"}:
        focus, prescription = QUALITY_FOCUS.get(quality, QUALITY_FOCUS["inaccuracy"])
        severity = "küçük bir sapma" if loss < 100 else "kritik bir karar anı"
        return (
            f"Burada mesele moral bozmak değil; bu {severity}. Ana tema: {focus}. "
            f"{prescription} Bu hamle seni tanımlamaz; sadece çalışılacak noktayı gösterir. Birkaç oyunda aynı kontrolü yaparsan bu hata tipi hızla azalır."
        )

    return (
        "Bu hamle henüz tam analiz edilmedi. Analiz tamamlanınca sana kısa, net ve çalışılabilir bir koç notu çıkaracağım."
    )


def classify_result_for_user(game: Game) -> str | None:
    if not game.user_color or not game.result:
        return None

    if game.result == "1/2-1/2":
        return "draw"

    if game.user_color == "white":
        return "win" if game.result == "1-0" else "loss" if game.result == "0-1" else None

    if game.user_color == "black":
        return "win" if game.result == "0-1" else "loss" if game.result == "1-0" else None

    return None


def build_coach_summary(session, owner_username: str | None = None) -> dict:
    game_stmt = select(Game)
    if owner_username:
        game_stmt = game_stmt.where(Game.owner_username == owner_username)
    games = session.execute(game_stmt).scalars().all()

    result_counter = Counter()
    for game in games:
        result = classify_result_for_user(game)
        if result:
            result_counter[result] += 1

    analyzed_stmt = (
        select(Game, Move, Analysis)
        .join(Move, Move.game_id == Game.id)
        .join(Analysis, Analysis.move_id == Move.id)
        .where(Analysis.loss_cp.is_not(None))
    )
    if owner_username:
        analyzed_stmt = analyzed_stmt.where(Game.owner_username == owner_username)

    rows = session.execute(analyzed_stmt).all()
    quality_counter = Counter()
    loss_by_phase = defaultdict(list)
    big_moments = []

    for game, move, analysis in rows:
        quality = analysis.quality or "book"
        quality_counter[quality] += 1
        loss_by_phase[move.phase].append(float(analysis.loss_cp or 0))

        if quality in {"blunder", "mistake", "wrong", "missed"} or float(analysis.loss_cp or 0) >= 90:
            big_moments.append({
                "gameId": game.id,
                "moveId": move.id,
                "move": f"{move.move_number}. {move.san}",
                "quality": quality,
                "lossCp": round(float(analysis.loss_cp or 0), 1),
                "phase": move.phase,
                "title": f"{game.white_username or 'White'} vs {game.black_username or 'Black'}",
            })

    issue_order = ["blunder", "mistake", "wrong", "missed", "inaccuracy"]
    main_issue = next((q for q in issue_order if quality_counter[q] > 0), None)

    total_decided = result_counter["win"] + result_counter["loss"] + result_counter["draw"]
    win_rate = round((result_counter["win"] / total_decided) * 100, 1) if total_decided else None
    loss_rate = round((result_counter["loss"] / total_decided) * 100, 1) if total_decided else None

    phase_focus = None
    if loss_by_phase:
        phase_focus = max(
            loss_by_phase.items(),
            key=lambda item: mean(item[1]) if item[1] else 0,
        )[0]

    if main_issue:
        focus_title, prescription = QUALITY_FOCUS[main_issue]
        coach_note = (
            f"Bugünkü ana çalışma başlığın {focus_title}. Bu kötü oynuyorsun demek değil; puanı en hızlı buradan kazanırsın. "
            f"{prescription}"
        )
    elif rows:
        coach_note = (
            "Büyük bir tekrar eden kırılma görünmüyor. Şimdi hedefin iyi kararları çoğaltmak: sakin aday hamle, temiz plan, zaman baskısında aynı kalite."
        )
    else:
        coach_note = (
            "Henüz yeterli derin analiz yok. Önce yeni oyunları çekip otomatik derin analiz çalıştır; sonra sana net çalışma reçetesi çıkaracağım."
        )

    encouragement = (
        "Benim senden istediğim kusursuzluk değil, tekrar eden hatayı küçültmen. Her oyundan tek ana ders çıkarırsan gelişim çok daha hızlı olur."
    )

    return {
        "games": len(games),
        "analyzedMoves": len(rows),
        "wins": result_counter["win"],
        "losses": result_counter["loss"],
        "draws": result_counter["draw"],
        "winRate": win_rate,
        "lossRate": loss_rate,
        "qualityCounts": dict(quality_counter),
        "phaseFocus": phase_focus,
        "mainFocus": main_issue,
        "coachNote": coach_note,
        "encouragement": encouragement,
        "studyPlan": build_study_plan(main_issue, phase_focus),
        "criticalMoments": sorted(big_moments, key=lambda item: item["lossCp"], reverse=True)[:5],
    }


def build_study_plan(main_issue: str | None, phase_focus: str | None) -> list[dict]:
    plan = []

    if main_issue:
        focus_title, prescription = QUALITY_FOCUS.get(main_issue, QUALITY_FOCUS["inaccuracy"])
        plan.append({
            "title": focus_title,
            "text": prescription,
            "duration": "Her gün 10-12 dakika",
        })

    if phase_focus == "opening":
        plan.append({
            "title": "Açılış omurgası",
            "text": "İlk 10 hamlede merkez, gelişim ve rok hedeflerini tek tek kontrol et.",
            "duration": "Haftada 3 oyun",
        })
    elif phase_focus == "middlegame":
        plan.append({
            "title": "Oyun ortası aday hamle",
            "text": "Kritik pozisyonda üç aday çıkar: forcing hamle, güvenli hamle, plan hamlesi.",
            "duration": "Her analizde 5 pozisyon",
        })
    elif phase_focus == "endgame":
        plan.append({
            "title": "Final sadeleştirme",
            "text": "Aktif şah, piyon yapısı ve geçer piyon planını sırayla kontrol et.",
            "duration": "Haftada 20 dakika",
        })

    plan.append({
        "title": "Review alışkanlığı",
        "text": "Her oyundan sadece 1 ana hata ve 1 iyi karar seç. Fazlası gürültü yapar.",
        "duration": "Oyun başına 3 dakika",
    })

    return plan[:4]
