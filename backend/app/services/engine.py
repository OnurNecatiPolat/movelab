from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from statistics import median
import os
import platform
import shutil

import chess.engine

from app.core.config import (
    BASE_DIR,
    DEFAULT_DEPTH,
    ENGINE_TIME_LIMIT,
    PACKAGE_ROOT,
    STOCKFISH_PATH,
)


@dataclass(frozen=True)
class EngineResult:
    cp: float
    best_uci: str | None
    depth: int


class StockfishUnavailable(RuntimeError):
    pass


def _candidate_paths():
    candidates = []

    env_path = os.getenv("STOCKFISH_PATH")
    if env_path:
        candidates.append(Path(env_path))

    configured = STOCKFISH_PATH
    if configured and configured.lower() not in {"stockfish", "stockfish.exe"}:
        candidates.append(Path(configured))

    candidates.extend([
        PACKAGE_ROOT / "tools" / "stockfish" / "stockfish.exe",
        PACKAGE_ROOT / "tools" / "stockfish.exe",
        BASE_DIR / "tools" / "stockfish" / "stockfish.exe",
        BASE_DIR / "tools" / "stockfish.exe",
        PACKAGE_ROOT / "stockfish.exe",
        BASE_DIR / "stockfish.exe",
    ])

    for binary in ["stockfish", "stockfish.exe"]:
        found = shutil.which(binary)
        if found:
            candidates.append(Path(found))

    if platform.system().lower() == "windows":
        candidates.extend([
            Path("C:/Stockfish/stockfish.exe"),
            Path("C:/stockfish/stockfish.exe"),
            Path("C:/Program Files/Stockfish/stockfish.exe"),
            Path("C:/Program Files (x86)/Stockfish/stockfish.exe"),
            Path.home() / "stockfish" / "stockfish.exe",
            Path.home() / "Downloads" / "stockfish" / "stockfish.exe",
            Path.home() / "Downloads" / "Stockfish" / "stockfish.exe",
        ])

        for base in [PACKAGE_ROOT / "tools", PACKAGE_ROOT / "engines", BASE_DIR / "tools"]:
            if base.exists():
                candidates.extend(base.rglob("stockfish*.exe"))
    else:
        candidates.extend([
            Path("/usr/games/stockfish"),
            Path("/usr/bin/stockfish"),
            Path("/usr/local/bin/stockfish"),
            PACKAGE_ROOT / "tools" / "stockfish" / "stockfish",
            BASE_DIR / "tools" / "stockfish" / "stockfish",
        ])

    unique = []
    seen = set()
    for item in candidates:
        try:
            normalized = str(item.expanduser().resolve())
        except Exception:
            normalized = str(item)
        if normalized not in seen:
            seen.add(normalized)
            unique.append(Path(normalized))
    return unique


def resolve_stockfish_path():
    checked = []
    for path in _candidate_paths():
        checked.append(str(path))
        try:
            if path.exists() and path.is_file():
                return str(path)
        except OSError:
            continue

    if STOCKFISH_PATH in {"stockfish", "stockfish.exe"}:
        found = shutil.which(STOCKFISH_PATH)
        if found:
            return found

    raise StockfishUnavailable(
        "Stockfish bulunamadı. Windows için önerilen çözüm: "
        "stockfish.exe dosyasını proje içinde tools\\stockfish\\stockfish.exe konumuna koy "
        "veya STOCKFISH_PATH ortam değişkenini tam stockfish.exe yoluna ayarla. "
        "Kontrol edilen ilk yollar: " + " | ".join(checked[:12])
    )


class StockfishService:
    def __init__(self, path=STOCKFISH_PATH):
        self.path = path
        self._engine = None

    def __enter__(self):
        self.open()
        return self

    def __exit__(self, exc_type, exc, tb):
        self.close()

    def ensure_available(self):
        return resolve_stockfish_path()

    def open(self):
        if self._engine is None:
            resolved = self.ensure_available()
            self._engine = chess.engine.SimpleEngine.popen_uci(resolved)
        return self._engine

    def close(self):
        if self._engine is not None:
            try:
                self._engine.quit()
            finally:
                self._engine = None

    def analyze_once(self, board, depth, time_limit):
        engine = self.open()
        info = engine.analyse(board, chess.engine.Limit(depth=depth, time=time_limit))
        score = info["score"].pov(chess.WHITE)
        cp = score.score(mate_score=100000)
        pv = info.get("pv") or []
        best = pv[0].uci() if pv else None
        return EngineResult(cp=float(cp or 0), best_uci=best, depth=depth)

    def analyze_consensus(self, board, depth=DEFAULT_DEPTH, passes=3, time_limit=ENGINE_TIME_LIMIT):
        depth = max(6, min(24, int(depth or DEFAULT_DEPTH)))
        passes = max(1, min(5, int(passes or 1)))
        time_limit = max(0.1, min(3.0, float(time_limit or ENGINE_TIME_LIMIT)))

        pass_depths = [min(28, depth + 2 * i) for i in range(passes)]
        results = [self.analyze_once(board, d, time_limit) for d in pass_depths]
        evals = [r.cp for r in results]
        bests = [r.best_uci for r in results if r.best_uci]

        best = Counter(bests).most_common(1)[0][0] if bests else None
        spread = max(evals) - min(evals) if evals else 0
        confidence = max(0.35, min(0.98, 1.0 - (spread / 500.0)))

        return {
            "white_cp": float(median(evals)) if evals else 0.0,
            "best_uci": best,
            "depth": max(pass_depths),
            "passes": len(results),
            "eval_spread": spread,
            "confidence": round(confidence, 3),
        }


def stockfish_status():
    try:
        resolved = resolve_stockfish_path()
        return {
            "available": True,
            "path": resolved,
            "message": "Stockfish hazır.",
            "platform": platform.system(),
        }
    except Exception as exc:
        return {
            "available": False,
            "path": None,
            "message": str(exc),
            "platform": platform.system(),
            "recommended_windows_path": str(PACKAGE_ROOT / "tools" / "stockfish" / "stockfish.exe"),
        }
