import math
from statistics import mean

def clamp(x, lo, hi):
    return max(lo, min(hi, x))

def move_accuracy(loss_cp):
    loss = max(0.0, float(loss_cp or 0.0))
    score = 100.0 * math.exp(-((loss / 125.0) ** 1.22))
    return round(clamp(score, 0.0, 100.0), 1)

def game_accuracy(losses):
    clean = [float(x) for x in losses if x is not None]
    if not clean:
        return None
    scores = [move_accuracy(x) for x in clean]
    worst_n = max(1, len(scores) // 4)
    worst = sorted(scores)[:worst_n]
    return round(clamp(0.8 * mean(scores) + 0.2 * mean(worst), 0.0, 100.0), 1)

def risk_label(acc):
    if acc is None:
        return "Bilinmiyor"
    if acc >= 88:
        return "Elit"
    if acc >= 78:
        return "Sağlam"
    if acc >= 68:
        return "Geliştirilebilir"
    if acc >= 55:
        return "Riskli"
    return "Kritik"
