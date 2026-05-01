from __future__ import annotations

from collections import Counter, defaultdict
from statistics import mean

from sqlalchemy import select, func

from app.models import Analysis, Game, Move


QUALITY_FOCUS = {
    "blunder": ("Taktik güvenlik", "Her hamleden önce 10 saniyelik CCT kontrolü yap: şah çekme, alma, tehdit."),
    "mistake": ("Aday hamle disiplini", "İlk iyi görünen hamleyi oynama; iki aday daha çıkarıp en az bir hamle derin kıyasla."),
    "wrong": ("Plan seçimi", "Hamlenin hangi zayıflığa baskı yaptığını söyleyemiyorsan önce planı netleştir."),
    "missed": ("Fırsat dönüştürme", "Avantajlı konumda sakin hamle yerine en aktif taşı ve forcing devamı ara."),
    "inaccuracy": ("Küçük tempo kayıpları", "Açılış ve oyun ortasında gelişim, merkez ve şah güvenliği üçlüsünü bozmamaya çalış."),
}

QUALITY_TONE = {
    "brilliant": "Bu fikir yaratıcı; burada sezgin doğru çalışmış. Bunu repertuvarına değil, düşünme modeline ekle: forcing fikir + güvenli sonuç.",
    "best": "Temiz karar. Burada abartacak bir şey yok; aynı sakinliği zaman baskısında da korumaya çalış.",
    "excellent": "Gayet güçlü. Pozisyonun ihtiyacını görmüşsün; bu tip hamleler oyun kaliteni yukarı taşır.",
    "good": "Oynanabilir ve sağlıklı; ama burada küçük bir iyileştirme payı kalmış. Bir aday hamle daha çıkarsan kalite artar.",
    "inaccuracy": "Büyük felaket değil. Sadece küçük bir tempo/koordinasyon kaybı var. Bunu alışkanlık seviyesinde düzeltiriz.",
    "wrong": "Burada planın yönü biraz kaymış. Pozisyonu kaybetmedin; sadece karar ağacını daha disiplinli kurman gerekiyor.",
    "mistake": "Bu hamle oyunun dengesini ciddi etkiliyor. İyi haber: bu tip hatalar genellikle net bir kontrol listesiyle hızlı azalır.",
    "blunder": "Burada önce taktik güvenlik patlamış. Moral bozma; blunder azaltma satranç gelişiminde en hızlı puan getiren alandır.",
    "missed": "Burada fırsat vardı. Bu iyi bir haber aslında: pozisyona ulaşmışsın, şimdi o avantajı dönüştürmeyi çalışacağız.",
    "book": "Bu pozisyon henüz analiz bekliyor. Motor verisi geldikçe daha nokta atışı konuşacağım.",
}


def eval_text(cp: float | None) -> str:
    value = float(cp or 0) / 100.0
    return f"{value:+.2f}"


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
    quality = quality or "book"
    loss = float(loss_cp or 0)
    phase_tr = {
        "opening": "açılışta",
        "middlegame": "oyun ortasında",
        "endgame": "finalde",
    }.get(phase or "", "bu pozisyonda")

    base = QUALITY_TONE.get(quality, QUALITY_TONE["book"])
    played = san or played_uci or "oynanan hamle"
    best = best_uci or "motorun önerdiği aday"

    if quality in {"best", "excellent", "brilliant"}:
        return (
            f"{base} {phase_tr.capitalize()} {played} hamlesi pozisyonun ihtiyacına uyuyor. "
            f"Bu hamlede asıl değer, sadece eval değil; planı sade tutman ve rakibe gereksiz karşı oyun vermemen. "
            f"Bunu not et: iyi hamle, çoğu zaman gösterişli hamle değil, pozisyonun senden istediği hamledir."
        )

    if quality == "good":
        return (
            f"{base} {played} kötü bir tercih değil; pozisyon oynanabilir kalıyor. "
            f"Ama bir sonraki seviyeye çıkmak için burada '{best} neden daha temiz?' sorusunu sormalısın. "
            f"Hedefimiz seni hamle ezberleyen değil, aday hamleleri tartan oyuncuya çevirmek."
        )

    if quality in {"inaccuracy", "wrong", "mistake", "blunder", "missed"}:
        focus, prescription = QUALITY_FOCUS.get(quality, QUALITY_FOCUS["inaccuracy"])
        return (
            f"{base} {phase_tr.capitalize()} kritik nokta şu: {focus.lower()}. "
            f"{played} sonrası yaklaşık {loss / 100:.2f} piyonluk kalite kaybı görünüyor; "
            f"bu seni tanımlamaz, sadece çalışılacak temayı gösterir. "
            f"Bir sonraki antrenman reçetesi: {prescription} "
            f"Bu alışkanlık oturdukça aynı tip pozisyonlarda çok daha güvenli oynarsın."
        )

    return (
        f"{base} Motor analizi tamamlandıkça bu pozisyonu daha kişisel yorumlayacağım. "
        f"Şimdilik ana hedef: tehdidi gör, adayları sırala, sonra planı seç."
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
    phase_counter = Counter()
    loss_by_phase = defaultdict(list)
    big_moments = []

    for game, move, analysis in rows:
        quality = analysis.quality or "book"
        quality_counter[quality] += 1
        phase_counter[move.phase] += 1
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

    if main_issue:
        focus_title, prescription = QUALITY_FOCUS[main_issue]
        coach_note = (
            f"Şu an en yüksek getirili çalışma başlığın: {focus_title}. "
            f"Bu kötü oynuyorsun demek değil; sadece gelişim kaldıraç noktanın burada olduğunu söylüyor. "
            f"{prescription}"
        )
    elif rows:
        coach_note = (
            "Analiz edilen oyunlarda büyük bir kırılma paterni öne çıkmıyor. "
            "Şimdi hedef, iyi kararlarını tekrarlanabilir alışkanlığa çevirmek: açılış planı, taş koordinasyonu ve zaman yönetimi."
        )
    else:
        coach_note = (
            "Henüz derin analiz verisi az. Önce oyunları içe aktar, ardından otomatik derin analiz çalıştır; ben sana net çalışma reçetesini çıkarayım."
        )

    total_decided = result_counter["win"] + result_counter["loss"] + result_counter["draw"]
    win_rate = round((result_counter["win"] / total_decided) * 100, 1) if total_decided else None
    loss_rate = round((result_counter["loss"] / total_decided) * 100, 1) if total_decided else None

    phase_focus = None
    if loss_by_phase:
        phase_focus = max(
            loss_by_phase.items(),
            key=lambda item: mean(item[1]) if item[1] else 0,
        )[0]

    encouragement = (
        "Burada mesele mükemmel oynamak değil, hataları sistematik olarak küçültmek. "
        "Her oyundan bir tema çıkarırsan birkaç hafta içinde review ekranında farkı görürsün. "
        "Benim işim seni suçlamak değil; doğru çalışılacak taşı göstermek."
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
        "criticalMoments": sorted(big_moments, key=lambda item: item["lossCp"], reverse=True)[:6],
    }


def build_study_plan(main_issue: str | None, phase_focus: str | None) -> list[dict]:
    plan = []

    if main_issue:
        focus_title, prescription = QUALITY_FOCUS.get(main_issue, QUALITY_FOCUS["inaccuracy"])
        plan.append({
            "title": focus_title,
            "text": prescription,
            "duration": "Her gün 12 dakika",
        })

    if phase_focus == "opening":
        plan.append({
            "title": "Açılış omurgası",
            "text": "İlk 10 hamlede merkez, gelişim ve rok kontrolünü oyun sonrası işaretle.",
            "duration": "Haftada 3 oyun",
        })
    elif phase_focus == "middlegame":
        plan.append({
            "title": "Oyun ortası aday hamle",
            "text": "Her kritik pozisyonda 3 aday çıkar: forcing, güvenli, plan hamlesi.",
            "duration": "Her analizde 5 pozisyon",
        })
    elif phase_focus == "endgame":
        plan.append({
            "title": "Final sadeleştirme",
            "text": "Piyon yapısı, aktif şah ve geçer piyon planını ayrı ayrı kontrol et.",
            "duration": "Haftada 20 dakika",
        })

    plan.append({
        "title": "Review alışkanlığı",
        "text": "Her oyundan sadece 1 ana hata ve 1 iyi karar seç. Fazlası gürültü yapar.",
        "duration": "Oyun başına 3 dakika",
    })

    return plan[:4]
