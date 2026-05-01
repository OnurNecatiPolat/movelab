import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Database,
  Gauge,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import "./styles/app.css";

const CLOUD_API_BASE = "https://movelab-production-f81c.up.railway.app";
const LOCAL_API_BASE = "http://127.0.0.1:8000";
const ENV_API_BASE = import.meta.env.VITE_API_BASE || "";
const API_BASE = (ENV_API_BASE || (import.meta.env.PROD ? CLOUD_API_BASE : LOCAL_API_BASE)).replace(/\/$/, "");
const DEFAULT_USER = localStorage.getItem("movelab_username") || "CaarlsenKaybediyoo";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const PIECES = {K:"♔",Q:"♕",R:"♖",B:"♗",N:"♘",P:"♙",k:"♚",q:"♛",r:"♜",b:"♝",n:"♞",p:"♟"};

const EMPTY_POSITION = {
  ply: 0,
  move: "Başlangıç",
  fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  evalCp: 0,
  quality: "book",
  qualityLabel: "Başlangıç",
  played: "-",
  best: "e4 / d4",
  loss: 0,
  phase: "opening",
  advice: "Merkezi tut, taşlarını geliştir, şahını güvene al. Şimdilik plan bu kadar sade.",
  highlights: ["e4", "d4"],
  arrows: [],
  isAnalyzed: false,
};

const EMPTY_GAME = {
  id: null,
  title: "Henüz oyun seçilmedi",
  opening: "Yeni oyunları çek veya listeden bir oyun seç",
  timeClass: "ready",
  timeControl: "-",
  userAccuracy: null,
  opponentAccuracy: null,
  analysisStatus: {totalMoves: 0, analyzedMoves: 0},
};

const QUALITY = {
  brilliant: {label: "Brilliant", color: "#8b5cf6", soft: "#f3e8ff"},
  best: {label: "En iyi", color: "#16a34a", soft: "#dcfce7"},
  excellent: {label: "Mükemmel", color: "#0891b2", soft: "#cffafe"},
  good: {label: "İyi", color: "#2563eb", soft: "#dbeafe"},
  inaccuracy: {label: "Küçük hata", color: "#d97706", soft: "#fef3c7"},
  wrong: {label: "Sapma", color: "#e11d48", soft: "#ffe4e6"},
  mistake: {label: "Hata", color: "#ea580c", soft: "#ffedd5"},
  blunder: {label: "Blunder", color: "#dc2626", soft: "#fee2e2"},
  missed: {label: "Kaçan", color: "#be185d", soft: "#fce7f3"},
  book: {label: "Analiz yok", color: "#64748b", soft: "#f1f5f9"},
};

function qualityMeta(q) {
  return QUALITY[q] || QUALITY.book;
}

function formatAcc(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return `${Number(value).toFixed(1)}%`;
}

function formatEval(cp) {
  const value = Number(cp || 0) / 100;
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseFen(fen) {
  const boardPart = String(fen || "").split(" ")[0];
  return boardPart.split("/").slice(0, 8).map((row) => {
    const out = [];
    for (const ch of row) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < Number(ch); i += 1) out.push(null);
      } else out.push(ch);
    }
    while (out.length < 8) out.push(null);
    return out.slice(0, 8);
  });
}

function squareName(row, col) {
  return `${FILES[col]}${8 - row}`;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    headers: {"Content-Type": "application/json", ...(options.headers || {})},
    ...options,
  });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!response.ok) {
    const message = payload?.detail?.message || payload?.detail || payload?.message || text || `${response.status}`;
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }
  return payload;
}

function App() {
  const [tab, setTab] = useState("review");
  const [username, setUsername] = useState(DEFAULT_USER);
  const [games, setGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [review, setReview] = useState({game: EMPTY_GAME, positions: [EMPTY_POSITION]});
  const [coach, setCoach] = useState(null);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const game = review.game || EMPTY_GAME;
  const positions = review.positions?.length ? review.positions : [EMPTY_POSITION];
  const position = positions[clamp(index, 0, positions.length - 1)] || EMPTY_POSITION;
  const analyzed = game.analysisStatus?.analyzedMoves || 0;
  const total = game.analysisStatus?.totalMoves || Math.max(positions.length - 1, 0);
  const coverage = total ? Math.round((analyzed / total) * 100) : 0;

  async function loadAll(preferredId = selectedGameId) {
    try {
      const [gameList, coachSummary] = await Promise.all([
        request("/api/games?limit=180"),
        request(`/api/coach/summary?owner_username=${encodeURIComponent(username)}`).catch(() => null),
      ]);
      setGames(gameList || []);
      setCoach(coachSummary);
      const nextId = preferredId || gameList?.[0]?.id || null;
      if (nextId) {
        setSelectedGameId(nextId);
        await loadReview(nextId);
      }
      setMessage("");
    } catch (error) {
      setMessage(`Bağlantı kurulamadı: ${error.message}`);
    }
  }

  async function loadReview(gameId) {
    if (!gameId) {
      setReview({game: EMPTY_GAME, positions: [EMPTY_POSITION]});
      setIndex(0);
      return;
    }
    const data = await request(`/api/games/${gameId}/review`);
    setReview(data);
    setIndex(0);
  }

  async function runAction(label, fn) {
    setBusy(true);
    setMessage(label);
    try {
      const result = await fn();
      await loadAll(selectedGameId);
      setMessage(result?.message || "Tamamlandı.");
    } catch (error) {
      setMessage(`Hata: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  function saveUsername(value) {
    setUsername(value);
    localStorage.setItem("movelab_username", value);
  }

  async function syncNewGames({analyzeAfter = false} = {}) {
    return runAction("Yeni oyunlar çekiliyor…", async () => {
      const sync = await request("/api/import/chesscom", {
        method: "POST",
        body: JSON.stringify({
          username,
          owner_username: username,
          all_archives: true,
          new_only: true,
        }),
      });
      let analysis = null;
      if (analyzeAfter) {
        analysis = await request("/api/games/analyze-all", {
          method: "POST",
          body: JSON.stringify({owner_username: username, deep: true, force: false, max_games: 4, max_moves_per_game: 16}),
        });
      }
      return {
        message: `Yeni oyun: ${sync.imported_new || 0}. Atlanan eski oyun: ${sync.skipped_existing || 0}.${analysis ? ` Analiz edilen hamle: ${analysis.processedMoves || 0}.` : ""}`,
      };
    });
  }

  async function analyzeSelected(deep = true) {
    if (!selectedGameId) return;
    return runAction("Oyun analiz ediliyor…", async () => {
      const result = await request(`/api/games/${selectedGameId}/analyze`, {
        method: "POST",
        body: JSON.stringify({deep, force: deep, passes: deep ? 2 : 1, max_moves: deep ? 20 : 40}),
      });
      return {message: `Analiz tamamlandı. İşlenen hamle: ${result.processed || result.analyzed || 0}.`};
    });
  }

  async function analyzeAll() {
    return runAction("Tüm oyunlar parça parça derin analiz ediliyor…", async () => {
      const result = await request("/api/games/analyze-all", {
        method: "POST",
        body: JSON.stringify({owner_username: username, deep: true, force: false, max_games: 6, max_moves_per_game: 18}),
      });
      return {message: `Toplu analiz turu bitti. Oyun: ${(result.processedGames?.length || 0)}, hamle: ${result.processedMoves || 0}, kalan: ${result.remainingMoves || 0}.`};
    });
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const criticalCount = useMemo(() => positions.filter((p) => ["blunder", "mistake", "wrong", "missed"].includes(p.quality)).length, [positions]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon"><Sparkles size={20}/></div>
          <div>
            <div className="eyebrow">MoveLab Coach</div>
            <strong>Game Review</strong>
          </div>
        </div>
        <div className="userbox">
          <input value={username} onChange={(e) => saveUsername(e.target.value)} aria-label="Chess.com kullanıcı adı" />
          <button onClick={() => loadAll()} disabled={busy}><RefreshCw size={16}/> Yenile</button>
        </div>
      </header>

      <nav className="tabs" aria-label="Ana sekmeler">
        <button className={tab === "review" ? "active" : ""} onClick={() => setTab("review")}><Gauge size={16}/> Review</button>
        <button className={tab === "games" ? "active" : ""} onClick={() => setTab("games")}><Database size={16}/> Oyunlar</button>
        <button className={tab === "coach" ? "active" : ""} onClick={() => setTab("coach")}><Target size={16}/> Koç</button>
      </nav>

      {message && <div className="toast">{busy && <Loader2 className="spin" size={16}/>} {message}</div>}

      <main className="page">
        <section className="hero-grid">
          <Metric title="Ben" value={formatAcc(game.userAccuracy)} hint="accuracy" icon={Trophy}/>
          <Metric title="Rakip" value={formatAcc(game.opponentAccuracy)} hint="accuracy" icon={Gauge}/>
          <Metric title="Analiz" value={`${coverage}%`} hint={`${analyzed}/${total} hamle`} icon={BarChart3}/>
          <Metric title="Kritik" value={criticalCount} hint="çalışılacak an" icon={Target}/>
        </section>

        {tab === "review" && (
          <section className="review-layout">
            <div className="review-main">
              <Card className="game-head">
                <div>
                  <div className="eyebrow">Seçili oyun</div>
                  <h1>{game.title}</h1>
                  <p>{game.opening || "Açılış bilinmiyor"} · {game.timeClass || "?"} · {game.timeControl || "?"}</p>
                </div>
                <div className="head-actions">
                  <button className="primary" onClick={() => syncNewGames()} disabled={busy}>Yeni oyunları çek</button>
                  <button onClick={() => analyzeSelected(true)} disabled={busy || !selectedGameId}>Derin analiz</button>
                </div>
              </Card>

              <Card className="board-card">
                <ChessBoard position={position}/>
                <MoveNavigator index={index} total={positions.length} setIndex={setIndex}/>
              </Card>

              <Card className="notation-card">
                <div className="section-title">Hamleler</div>
                <Notation positions={positions} index={index} setIndex={setIndex}/>
              </Card>
            </div>

            <aside className="review-side">
              <CoachMove position={position}/>
              <Insights positions={positions} index={index} setIndex={setIndex}/>
            </aside>
          </section>
        )}

        {tab === "games" && (
          <section className="simple-grid">
            <Card className="action-card">
              <h2>Oyunları güncelle</h2>
              <p>Eski oyunları tekrar eklemez. Aynı oyun gelirse atlar; analizleri silmez.</p>
              <div className="button-row">
                <button className="primary" onClick={() => syncNewGames()} disabled={busy}>Sadece yeni oyunları çek</button>
                <button onClick={() => syncNewGames({analyzeAfter: true})} disabled={busy}>Yeni oyunları çek + analiz et</button>
                <button onClick={analyzeAll} disabled={busy}>Tüm oyunları derin analiz et</button>
              </div>
            </Card>
            <GameList games={games} selectedGameId={selectedGameId} onSelect={async (id) => {setSelectedGameId(id); await loadReview(id); setTab("review");}}/>
          </section>
        )}

        {tab === "coach" && (
          <CoachSummary coach={coach} analyzeAll={analyzeAll} busy={busy}/>
        )}
      </main>
    </div>
  );
}

function Card({children, className = ""}) {
  return <div className={`card ${className}`}>{children}</div>;
}

function Metric({title, value, hint, icon: Icon}) {
  return (
    <Card className="metric">
      <div className="metric-icon"><Icon size={18}/></div>
      <div>
        <div className="metric-value">{value}</div>
        <div className="metric-title">{title}</div>
        <div className="metric-hint">{hint}</div>
      </div>
    </Card>
  );
}

function ChessBoard({position}) {
  const board = parseFen(position.fen);
  const marks = new Set([...(position.highlights || [])]);
  for (const arrow of position.arrows || []) {
    if (arrow.from) marks.add(arrow.from);
    if (arrow.to) marks.add(arrow.to);
  }
  return (
    <div className="board-wrap">
      <div className="rank-labels">{[8,7,6,5,4,3,2,1].map((r) => <span key={r}>{r}</span>)}</div>
      <div className="board" aria-label="Satranç tahtası">
        {board.map((row, rowIndex) => row.map((piece, colIndex) => {
          const sq = squareName(rowIndex, colIndex);
          return (
            <div key={sq} className={`square ${(rowIndex + colIndex) % 2 ? "dark" : "light"}`}>
              {marks.has(sq) && <span className="mark"/>}
              {piece && <span className={`piece ${piece === piece.toUpperCase() ? "white-piece" : "black-piece"}`}>{PIECES[piece]}</span>}
            </div>
          );
        }))}
      </div>
      <div/>
      <div className="file-labels">{FILES.map((f) => <span key={f}>{f}</span>)}</div>
    </div>
  );
}

function MoveNavigator({index, total, setIndex}) {
  return (
    <div className="move-nav">
      <button onClick={() => setIndex((i) => clamp(i - 1, 0, total - 1))}><ChevronLeft size={16}/> Önceki</button>
      <span>{index} / {Math.max(total - 1, 0)}</span>
      <button onClick={() => setIndex((i) => clamp(i + 1, 0, total - 1))}>Sonraki <ChevronRight size={16}/></button>
    </div>
  );
}

function Notation({positions, index, setIndex}) {
  return (
    <div className="notation">
      {positions.map((pos, i) => {
        const meta = qualityMeta(pos.quality);
        return (
          <button key={`${pos.ply || i}-${i}`} className={i === index ? "active" : ""} style={{"--q": meta.color, "--soft": meta.soft}} onClick={() => setIndex(i)}>
            <span>{i}</span> {pos.played || pos.move}
          </button>
        );
      })}
    </div>
  );
}

function CoachMove({position}) {
  const meta = qualityMeta(position.quality);
  return (
    <Card className="coach-move">
      <div className="section-kicker">Koç notu</div>
      <div className="quality-pill" style={{"--q": meta.color, "--soft": meta.soft}}>{meta.label}</div>
      <h2>{position.move}</h2>
      <p>{position.advice}</p>
      <div className="move-facts">
        <span>Oynanan <b>{position.played || "-"}</b></span>
        <span>Öneri <b>{position.best || "-"}</b></span>
        <span>Kayıp <b>{Number(position.loss || 0).toFixed(1)} cp</b></span>
        <span>Eval <b>{formatEval(position.evalCp)}</b></span>
      </div>
    </Card>
  );
}

function Insights({positions, index, setIndex}) {
  return (
    <Card className="insights-card">
      <div className="section-title">Oyun akışı</div>
      <MomentumChart positions={positions} index={index} setIndex={setIndex}/>
      <MoveLossChart positions={positions} index={index} setIndex={setIndex}/>
    </Card>
  );
}

function MomentumChart({positions, index, setIndex}) {
  const data = positions.slice(1);
  const maxAbs = Math.max(250, ...data.map((p) => Math.abs(Number(p.evalCp || 0))));
  const width = 640;
  const height = 180;
  const pad = 22;
  const points = data.map((p, i) => {
    const x = pad + (i / Math.max(data.length - 1, 1)) * (width - pad * 2);
    const y = pad + ((maxAbs - Number(p.evalCp || 0)) / (maxAbs * 2)) * (height - pad * 2);
    return {x, y, p, i: i + 1};
  });
  const line = points.map((pt) => `${pt.x},${pt.y}`).join(" ");
  return (
    <div className="chart-block">
      <div className="chart-head"><span>Momentum</span><b>{formatEval(positions[index]?.evalCp)}</b></div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Momentum haritası">
        <line x1={pad} x2={width - pad} y1={height/2} y2={height/2} className="axis"/>
        <polyline points={line} className="momentum-line" fill="none"/>
        {points.map((pt) => {
          const meta = qualityMeta(pt.p.quality);
          return <circle key={pt.i} cx={pt.x} cy={pt.y} r={pt.i === index ? 6 : 4} fill={meta.color} onClick={() => setIndex(pt.i)}/>;
        })}
      </svg>
    </div>
  );
}

function MoveLossChart({positions, index, setIndex}) {
  const data = positions.slice(1);
  const maxLoss = Math.max(80, ...data.map((p) => Number(p.loss || 0)));
  return (
    <div className="chart-block">
      <div className="chart-head"><span>Hamle kalitesi</span><b>{Number(positions[index]?.loss || 0).toFixed(1)} cp</b></div>
      <div className="loss-bars">
        {data.map((p, i) => {
          const meta = qualityMeta(p.quality);
          const h = clamp((Number(p.loss || 0) / maxLoss) * 100, 8, 100);
          return <button key={i} className={index === i + 1 ? "active" : ""} title={`${i + 1}. ${p.played} · ${meta.label}`} onClick={() => setIndex(i + 1)} style={{"--h": `${h}%`, "--q": meta.color}}/>;
        })}
      </div>
    </div>
  );
}

function GameList({games, selectedGameId, onSelect}) {
  return (
    <Card className="game-list">
      <div className="section-title">Oyunlar</div>
      <div className="games-scroll">
        {games.length === 0 && <p className="muted">Henüz oyun yok. Önce yeni oyunları çek.</p>}
        {games.map((game) => (
          <button key={game.id} className={String(selectedGameId) === String(game.id) ? "selected" : ""} onClick={() => onSelect(game.id)}>
            <strong>{game.title}</strong>
            <span>{game.opening || "Açılış yok"}</span>
            <em>Ben {formatAcc(game.userAccuracy)} · Rakip {formatAcc(game.opponentAccuracy)}</em>
          </button>
        ))}
      </div>
    </Card>
  );
}

function CoachSummary({coach, analyzeAll, busy}) {
  const plan = coach?.studyPlan || [];
  const moments = coach?.criticalMoments || [];
  return (
    <section className="coach-layout">
      <Card className="coach-summary">
        <div className="section-kicker">Profesyonel koç özeti</div>
        <h1>{coach?.coachNote || "Veri toplandıkça sana net bir çalışma planı çıkaracağım."}</h1>
        <p>{coach?.encouragement || "Kusursuzluk değil, tekrar eden hatayı küçültme hedefindeyiz."}</p>
        <div className="result-grid">
          <Metric title="Win" value={coach?.wins ?? 0} hint="galibiyet" icon={Trophy}/>
          <Metric title="Lose" value={coach?.losses ?? 0} hint="mağlubiyet" icon={Target}/>
          <Metric title="Win rate" value={formatAcc(coach?.winRate)} hint="genel oran" icon={Gauge}/>
        </div>
        <button className="primary wide" onClick={analyzeAll} disabled={busy}>Tüm oyunları otomatik derin analiz et</button>
      </Card>
      <Card>
        <div className="section-title">Çalışma reçetesi</div>
        <div className="plan-list">
          {plan.map((item, i) => (
            <div key={i}>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
              <span>{item.duration}</span>
            </div>
          ))}
          {plan.length === 0 && <p className="muted">Derin analizden sonra reçete otomatik oluşacak.</p>}
        </div>
      </Card>
      <Card>
        <div className="section-title">Tekrar bakılacak anlar</div>
        <div className="moment-list">
          {moments.map((m, i) => (
            <div key={i}>
              <b>{m.move}</b><span>{qualityMeta(m.quality).label}</span><em>{m.lossCp} cp · {m.phase}</em>
            </div>
          ))}
          {moments.length === 0 && <p className="muted">Şimdilik kritik an listesi boş.</p>}
        </div>
      </Card>
    </section>
  );
}

createRoot(document.getElementById("root")).render(<App/>);
