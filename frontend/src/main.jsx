import React, { startTransition, useDeferredValue, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Database,
  Gauge,
  GitBranch,
  Import,
  Layers3,
  LineChart,
  Loader2,
  LogIn,
  LogOut,
  Menu,
  RefreshCw,
  Rocket,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
  WandSparkles,
  X,
} from "lucide-react";
import "./styles/app.css";

const CLOUD_API_BASE = "https://movelab-production-f81c.up.railway.app";
const LOCAL_API_BASE = "http://127.0.0.1:8000";
const ENV_API_BASE = import.meta.env.VITE_API_BASE || "";
const API_BASES = Array.from(new Set([
  ENV_API_BASE,
  import.meta.env.PROD ? CLOUD_API_BASE : LOCAL_API_BASE,
  CLOUD_API_BASE,
].map((base) => base.trim().replace(/\/$/, "")).filter(Boolean)));
const APP_VERSION = "0.8.0";
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];
const PIECES = {K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙", k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟"};

const PAGE_ITEMS = [
  {id: "review", label: "Review", icon: Gauge},
  {id: "studio", label: "Studio", icon: Layers3},
  {id: "billing", label: "Billing", icon: CreditCard},
  {id: "settings", label: "Settings", icon: Settings},
];

const EMPTY_POSITION = {
  moveId: null,
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
  label: "Başlangıç",
  advice: "Merkez kontrolü, hızlı gelişim ve şah güvenliği temel üçlü.",
  tactic: "Açılış prensipleri",
  plan: "Merkezi tut, hafif taşları geliştir, rok hazırlığını tamamla.",
  highlights: ["e4", "d4"],
  arrows: [],
  sideToMove: "white",
  isAnalyzed: false,
};

const EMPTY_GAME = {
  id: null,
  title: "Henüz oyun yok",
  opening: "Önce Chess.com senkronizasyonu veya PGN import kullan",
  timeClass: "workspace",
  timeControl: "ready",
  userAccuracy: null,
  opponentAccuracy: null,
  whiteAccuracy: null,
  blackAccuracy: null,
  userColor: null,
  analysisStatus: {totalMoves: 0, analyzedMoves: 0},
};

const EMPTY_REVIEW = {
  game: EMPTY_GAME,
  positions: [EMPTY_POSITION],
};

const NETWORK_ERROR_NEEDLES = [
  ["failed", "to", "fetch"].join(" "),
  "networkerror",
  "load failed",
  "connection",
];

const EMPTY_BILLING = {
  provider: "manual",
  portalUrl: null,
  supportEmail: "billing@movelab.local",
  plans: [],
  checkoutStatus: "placeholder",
  message: "Billing provider henüz bağlı değil.",
};

function tokenHeaders(token) {
  return token ? {Authorization: `Bearer ${token}`} : {};
}

class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

function errorMessage(payload, fallback = "İstek tamamlanamadı.") {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload;
  if (Array.isArray(payload.detail)) return payload.detail.map((item) => item.msg).join(" ");
  if (typeof payload.detail === "string") return payload.detail;
  if (payload.detail?.message) return payload.detail.message;
  if (payload.message) return payload.message;
  return fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function friendlyNetworkMessage(error) {
  const text = String(error?.message || "").toLowerCase();
  if (NETWORK_ERROR_NEEDLES.some((needle) => text.includes(needle))) {
    return "Bağlantı isteği tamamlanamadı. Backend URL ve Vercel ortam değişkenlerini kontrol et.";
  }
  return error?.message || "Backend bağlantısı kurulamadı.";
}

function isTransientStatus(status) {
  return [408, 425, 429, 500, 502, 503, 504].includes(Number(status));
}

function uiError(error, fallback = "İstek tamamlanamadı.") {
  if (error?.status === 0) return friendlyNetworkMessage(error);
  return error?.message || fallback;
}

function isNetworkApiError(error) {
  return error?.status === 0;
}

function apiUrls(pathOrUrl) {
  if (/^https?:\/\//i.test(pathOrUrl)) return [pathOrUrl];
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return API_BASES.map((base) => `${base}${path}`);
}

async function fetchWithRetry(pathOrUrl, options = {}, attempts = 3) {
  let lastError = null;
  let lastResponse = null;
  const urls = apiUrls(pathOrUrl);
  for (const url of urls) {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await fetch(url, {mode: "cors", cache: "no-store", ...options});
        if (!isTransientStatus(response.status)) return response;
        lastResponse = response;
      } catch (error) {
        lastError = error;
      }
      if (attempt < attempts) await sleep(500 * attempt);
    }
  }
  if (lastResponse) return lastResponse;
  throw new ApiError(friendlyNetworkMessage(lastError), 0, null);
}

async function getJson(path, token) {
  const response = await fetchWithRetry(path, {
    headers: tokenHeaders(token),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(errorMessage(payload, `${response.status} ${response.statusText}`), response.status, payload);
  }
  return response.json();
}

async function postJson(path, payload = {}, token) {
  const response = await fetchWithRetry(path, {
    method: "POST",
    headers: {"Content-Type": "application/json", ...tokenHeaders(token)},
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!response.ok) {
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    throw new ApiError(errorMessage(data, text || `${response.status}`), response.status, data);
  }
  return text ? JSON.parse(text) : {};
}

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function fmtAcc(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return `${Number(value).toFixed(1)}%`;
}

function numericAcc(value) {
  return value === null || value === undefined || Number.isNaN(Number(value)) ? 0 : Number(value);
}

function coveragePct(analyzed, total) {
  return total > 0 ? Math.round((Number(analyzed || 0) / total) * 100) : 0;
}

function evalText(cp) {
  const value = Number(cp || 0) / 100;
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}

function evalPct(cp, maxAbs) {
  const bounded = Math.max(-maxAbs, Math.min(maxAbs, Number(cp || 0)));
  return ((maxAbs - bounded) / (maxAbs * 2)) * 100;
}

function qLabel(q) {
  return ({
    brilliant: "Parlak fikir",
    best: "En iyi",
    excellent: "Mükemmel",
    good: "İyi",
    inaccuracy: "Küçük hata",
    wrong: "Ciddi sapma",
    mistake: "Hata",
    blunder: "Kritik hata",
    missed: "Kaçan fırsat",
    book: "Analiz yok",
    analysis: "Analiz",
  }[q] || q || "Analiz yok");
}

function parseFen(fen) {
  const rows = fen.split(" ")[0].split("/");
  return rows.map((row) => {
    const squares = [];
    for (const ch of row) {
      if (/[0-9]/.test(ch)) {
        for (let i = 0; i < Number(ch); i += 1) squares.push(null);
      } else {
        squares.push(ch);
      }
    }
    return squares;
  });
}

function squareName(row, col) {
  return `${FILES[col]}${8 - row}`;
}

function coord(square) {
  if (!square || square.length < 2) return null;
  const col = FILES.indexOf(square[0]);
  const row = 8 - Number(square[1]);
  if (col < 0 || row < 0 || row > 7) return null;
  return {row, col};
}

function clamp(x, min, max) {
  return Math.max(min, Math.min(max, x));
}

function useLocal(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);

  return [value, setValue];
}

function App() {
  const [page, setPage] = useState("review");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState("loading");
  const [systemStatus, setSystemStatus] = useState(null);
  const [platformStats, setPlatformStats] = useState({games: 0, moves: 0, analyses: 0});
  const [coachSummary, setCoachSummary] = useState(null);
  const [billingCatalog, setBillingCatalog] = useState(EMPTY_BILLING);
  const [games, setGames] = useState([]);
  const [gameId, setGameId] = useState(null);
  const [review, setReview] = useState(EMPTY_REVIEW);
  const [idx, setIdx] = useState(0);
  const [cmp, setCmp] = useState(0);
  const [free, setFree] = useState(false);
  const [freePos, setFreePos] = useState([]);
  const [freeIdx, setFreeIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(null);
  const [shadow, setShadow] = useState(false);
  const [message, setMessage] = useState("");
  const [token, setToken] = useLocal("movelab_token_v8", null);
  const [user, setUser] = useLocal("movelab_user_v8", null);
  const [syncForm, setSyncForm] = useState({
    username: user?.chesscomUsername || "",
    ownerUsername: user?.chesscomUsername || user?.username || "",
    allArchives: true,
    maxArchives: 12,
  });
  const [pgnForm, setPgnForm] = useState({ownerUsername: user?.username || "", url: "", pgn: ""});

  const positions = free ? freePos : review.positions;
  const active = free ? freeIdx : idx;
  const position = positions[Math.min(active, Math.max(positions.length - 1, 0))] || EMPTY_POSITION;
  const compare = positions[Math.min(cmp, Math.max(positions.length - 1, 0))] || EMPTY_POSITION;
  const game = review.game || EMPTY_GAME;

  async function loadHealth() {
    try {
      const health = await getJson("/api/health");
      setSystemStatus(health);
      setApiStatus("connected");

      const [overviewResult, billingResult, coachResult] = await Promise.allSettled([
        getJson("/api/platform/overview"),
        getJson("/api/billing/catalog"),
        getJson("/api/coach/summary"),
      ]);
      if (overviewResult.status === "fulfilled") setPlatformStats(overviewResult.value);
      if (billingResult.status === "fulfilled") setBillingCatalog(billingResult.value);
      if (coachResult.status === "fulfilled") setCoachSummary(coachResult.value);
    } catch (error) {
      setApiStatus("offline");
      if (!isNetworkApiError(error)) {
        setMessage(uiError(error, "Backend bağlantısı kurulamadı."));
      }
    }
  }

  async function loadGames() {
    try {
      const data = await getJson("/api/games");
      startTransition(() => {
        setGames(data);
        const nextGameId = data[0]?.id ?? null;
        setGameId((current) => current ?? nextGameId);
        if (!data.length) {
          setReview(EMPTY_REVIEW);
        }
      });
    } catch (error) {
      if (!isNetworkApiError(error)) {
        setMessage(uiError(error, "Oyunlar yüklenemedi."));
      }
    }
  }

  async function loadReview(nextGameId) {
    if (!nextGameId) {
      setReview(EMPTY_REVIEW);
      return;
    }

    try {
      const data = await getJson(`/api/games/${nextGameId}/review`);
      startTransition(() => {
        setReview(data);
        setIdx(0);
        setCmp(0);
        setFree(false);
        setFreePos([]);
        setFreeIdx(0);
      });
    } catch (error) {
      if (!isNetworkApiError(error)) {
        setMessage(uiError(error, "Review alınamadı."));
      }
    }
  }

  async function hydrateUser() {
    if (!token) return;
    try {
      const data = await getJson("/api/auth/me", token);
      setUser(data.user);
      setSyncForm((current) => ({
        ...current,
        username: current.username || data.user?.chesscomUsername || "",
        ownerUsername: current.ownerUsername || data.user?.chesscomUsername || data.user?.username || "",
      }));
      setPgnForm((current) => ({...current, ownerUsername: current.ownerUsername || data.user?.username || ""}));
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        setToken(null);
        setUser(null);
      } else {
        if (!isNetworkApiError(error)) {
          setMessage(uiError(error, "Oturum kontrolü geçici olarak doğrulanamadı."));
        }
      }
    }
  }

  async function refreshAll() {
    await Promise.all([loadHealth(), loadGames()]);
  }

  async function analyze(deep = false) {
    if (!gameId) {
      setMessage("Önce analiz edilecek bir oyun seç.");
      return;
    }

    setBusy(true);
    setAnalysisProgress({
      active: true,
      label: deep ? "Derin analiz hazırlanıyor" : "Hızlı analiz hazırlanıyor",
      percent: 0,
      analyzed: game.analysisStatus?.analyzedMoves || 0,
      total: game.analysisStatus?.totalMoves || 0,
    });
    setMessage(deep ? "Derin analiz yüzde 100'e kadar otomatik ilerliyor." : "Hızlı analiz başlatıldı.");

    try {
      let result = null;
      let guard = 0;
      do {
        result = await postJson(`/api/games/${gameId}/analyze`, {
          force: false,
          deep,
          passes: deep ? 2 : 1,
          depth: deep ? 14 : 10,
          time_limit: deep ? 0.35 : 0.22,
          max_moves: deep ? 8 : 24,
        });

        const percent = result.total ? Math.min(100, Math.round((result.analyzed / result.total) * 100)) : 100;
        setAnalysisProgress({
          active: true,
          label: deep ? "Derin analiz çalışıyor" : "Hızlı analiz çalışıyor",
          percent,
          analyzed: result.analyzed,
          total: result.total,
        });
        await Promise.all([loadReview(gameId), loadHealth()]);
        guard += 1;
      } while (deep && result?.remaining > 0 && guard < 80);

      setAnalysisProgress((current) => current ? {...current, percent: 100, label: "Analiz tamamlandı"} : null);
      setMessage(result?.remaining > 0 ? `${result.remaining} hamle daha kaldı; servis süre sınırına takılmamak için tekrar dene.` : "Analiz tamamlandı.");
    } catch (error) {
      setMessage(uiError(error, "Analiz sırasında hata oluştu."));
    } finally {
      setBusy(false);
      setTimeout(() => setAnalysisProgress(null), 900);
    }
  }


  async function analyzeAllGames() {
    setBusy(true);
    setMessage("Tüm oyunlar için derin analiz kuyruğu başladı. Railway süre sınırına takılmamak için parça parça ilerleyeceğim.");
    setAnalysisProgress({
      active: true,
      label: "Toplu derin analiz çalışıyor",
      percent: 0,
      analyzed: 0,
      total: 0,
    });

    try {
      let guard = 0;
      let result = null;
      do {
        result = await postJson("/api/games/analyze-all", {
          deep: true,
          passes: 2,
          depth: 14,
          time_limit: 0.42,
          max_games: 4,
          max_moves_per_game: 10,
          force: false,
        });
        guard += 1;
        const processed = result.processedMoves || 0;
        const remaining = result.remainingMoves || 0;
        const percent = processed + remaining > 0 ? Math.round((processed / (processed + remaining)) * 100) : 100;
        setAnalysisProgress({
          active: true,
          label: "Toplu derin analiz çalışıyor",
          percent: Math.min(99, percent),
          analyzed: processed,
          total: processed + remaining,
        });
        if (result.coachSummary) setCoachSummary(result.coachSummary);
        await Promise.all([loadGames(), loadHealth()]);
      } while (result?.remainingMoves > 0 && guard < 50);

      setAnalysisProgress((current) => current ? {...current, percent: 100, label: "Toplu analiz tamamlandı"} : null);
      setMessage(result?.remainingMoves > 0
        ? `${result.remainingMoves} hamle kaldı. Devam etmek için "Tüm oyunları derin analiz et" butonuna tekrar bas.`
        : "Tüm oyunlar derin analizden geçti. Koç raporunu güncelledim.");
    } catch (error) {
      setMessage(uiError(error, "Toplu derin analiz başarısız oldu."));
    } finally {
      setBusy(false);
      setTimeout(() => setAnalysisProgress(null), 1200);
    }
  }

  async function syncNewAndAnalyze() {
    if (!syncForm.username.trim()) {
      setMessage("Yeni oyunları çekmek için Chess.com kullanıcı adı gerekli.");
      return;
    }

    setBusy(true);
    setMessage("Sadece yeni oyunlar aranıyor. Eski oyunlara dokunmayacağım.");
    try {
      const result = await postJson("/api/import/chesscom", {
        username: syncForm.username.trim(),
        owner_username: syncForm.ownerUsername.trim() || syncForm.username.trim(),
        all_archives: Boolean(syncForm.allArchives),
        max_archives: syncForm.allArchives ? null : Number(syncForm.maxArchives || 12),
        new_only: true,
      });
      await Promise.all([loadGames(), loadHealth()]);
      setMessage(`${result.imported_new ?? result.imported ?? 0} yeni oyun eklendi; ${result.skipped_existing ?? 0} eski oyun atlandı. Şimdi otomatik derin analiz başlatılıyor.`);
      await analyzeAllGames();
    } catch (error) {
      setMessage(uiError(error, "Yeni oyun senkronizasyonu başarısız."));
    } finally {
      setBusy(false);
    }
  }

  async function handleMove(from, to) {
    if (!free) return;

    try {
      const result = await postJson("/api/analyze-move", {
        fen: position.fen,
        move_uci: `${from}${to}`,
        depth: 12,
        passes: 3,
      });

      const next = {
        ...result,
        move: `${freeIdx + 1}. ${result.played || `${from}${to}`}`,
        label: result.qualityLabel || result.quality,
        tactic: "Serbest analiz",
        plan: "Aday devamları kıyasla, sonra ana plana dön.",
        isAnalyzed: true,
      };

      setFreePos((current) => [...current.slice(0, freeIdx + 1), next]);
      setFreeIdx((current) => current + 1);
    } catch (error) {
      setMessage(uiError(error, "Hamle analiz edilemedi."));
    }
  }

  async function syncChesscom() {
    if (!syncForm.username.trim()) {
      setMessage("Chess.com kullanıcı adı gerekli.");
      return;
    }

    setBusy(true);
    try {
      const result = await postJson("/api/import/chesscom", {
        username: syncForm.username.trim(),
        owner_username: syncForm.ownerUsername.trim() || syncForm.username.trim(),
        all_archives: Boolean(syncForm.allArchives),
        max_archives: syncForm.allArchives ? null : Number(syncForm.maxArchives || 12),
        new_only: true,
      });
      await refreshAll();
      setMessage(`${result.imported_new ?? result.imported} yeni oyun eklendi. ${result.skipped_existing ?? 0} eski oyun atlandı. ${result.archives_checked} arşiv tarandı${result.failed_count ? `, ${result.failed_count} oyun raporlandı.` : "."}`);
    } catch (error) {
      setMessage(uiError(error, "Chess.com senkronizasyonu başarısız."));
    } finally {
      setBusy(false);
    }
  }

  async function importPgn() {
    const ownerUsername = pgnForm.ownerUsername.trim() || user?.username || "guest";
    if (!pgnForm.pgn.trim()) {
      setMessage("PGN import için PGN metni gerekli.");
      return;
    }

    setBusy(true);
    try {
      const result = await postJson("/api/import/pgn", {
        owner_username: ownerUsername,
        pgn: pgnForm.pgn,
        url: pgnForm.url.trim() || null,
      });
      await refreshAll();
      setGameId(result.gameId);
      await loadReview(result.gameId);
      setPgnForm((current) => ({...current, pgn: "", url: ""}));
      setMessage(`PGN başarıyla içe alındı. ${result.moves} hamle işlendi.`);
      setPage("review");
    } catch (error) {
      setMessage(uiError(error, "PGN import başarısız."));
    } finally {
      setBusy(false);
    }
  }

  async function requestCheckout(planId) {
    try {
      const result = await postJson("/api/billing/checkout-intent", {plan_id: planId, seats: 1});
      setMessage(result.message);
    } catch (error) {
      setMessage(uiError(error, "Checkout intent oluşturulamadı."));
    }
  }

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    hydrateUser();
  }, [token]);

  useEffect(() => {
    loadReview(gameId);
  }, [gameId]);

  useEffect(() => {
    if (user?.chesscomUsername) {
      setSyncForm((current) => ({
        ...current,
        username: current.username || user.chesscomUsername,
        ownerUsername: current.ownerUsername || user.chesscomUsername,
      }));
    }
    if (user?.username) {
      setPgnForm((current) => ({...current, ownerUsername: current.ownerUsername || user.username}));
    }
  }, [user]);

  return (
    <div className="app-bg">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.button
            type="button"
            className="backdrop"
            onClick={() => setSidebarOpen(false)}
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
          />
        )}
      </AnimatePresence>

      <aside className={cx("sidebar", sidebarOpen && "open")}>
        <div className="logo sidebar-head">
          <div className="logo-lockup">
            <div className="logo-icon"><Sparkles size={20} /></div>
            <div>
              <strong>MoveLab</strong>
              <div className="small">Review Studio {APP_VERSION}</div>
            </div>
          </div>
          <Button cls="btn-icon btn-ghost" onClick={() => setSidebarOpen(false)} title="Menüyü kapat">
            <X size={18} />
          </Button>
        </div>

        <Card cls="card-pad profile-card">
          <div className="eyebrow">Workspace status</div>
          <div className="profile-row">
            <div>
              <div className="profile-name">{user?.displayName || "Guest mode"}</div>
              <div className="small">{user?.chesscomUsername ? `@${user.chesscomUsername}` : "Auth panel ile giriş yapılabilir"}</div>
            </div>
            <Badge cls={apiStatus === "connected" ? "quality-best" : "quality-wrong"}>
              {apiStatus === "connected" ? "Online" : apiStatus === "loading" ? "Loading" : "Offline"}
            </Badge>
          </div>
          <div className="profile-meta">
            <span>{platformStats.games} oyun</span>
            <span>{platformStats.analyses} analiz</span>
          </div>
        </Card>

        <nav className="nav">
          {PAGE_ITEMS.map(({id, label, icon: Icon}) => (
            <button
              key={id}
              type="button"
              className={page === id ? "active" : ""}
              onClick={() => {
                setPage(id);
                setSidebarOpen(false);
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        <Card cls="card-pad sidebar-cta">
          <div className="eyebrow">Product direction</div>
          <strong>Import · Review · Billing-ready · Global deploy</strong>
          <p className="small">Bu sürüm PostgreSQL ve billing provider entegrasyonuna hazır omurga ile geliyor.</p>
        </Card>
      </aside>

      <main className="main">
        <header className="header">
          <div className="header-left">
            <Button cls="btn-white mobile-only" onClick={() => setSidebarOpen(true)} title="Menüyü aç">
              <Menu size={18} />
            </Button>
            <div>
              <div className="small">Professional chess review workspace</div>
              <div className="header-title">MoveLab Review Studio</div>
            </div>
          </div>

          <div className="header-right">
            <Badge>Database {systemStatus?.database?.backend || "-"}</Badge>
            <Badge>Engine {systemStatus?.stockfish?.available ? "Ready" : "Missing"}</Badge>
            {user ? (
              <Button cls="btn-dark" onClick={() => setAuthOpen(true)} title="Hesap panelini aç">
                <User size={16} />
                {user.displayName}
              </Button>
            ) : (
              <Button cls="btn-dark" onClick={() => setAuthOpen(true)} title="Giriş panelini aç">
                <LogIn size={16} />
                Giriş yap
              </Button>
            )}
          </div>
        </header>

        <div className="content">
          {message && (
            <motion.div
              className="card card-pad notice"
              initial={{opacity: 0, y: -8}}
              animate={{opacity: 1, y: 0}}
            >
              {message}
            </motion.div>
          )}

          {page === "review" && (
            <ReviewPage
              game={game}
              games={games}
              gameId={gameId}
              setGameId={setGameId}
              analyze={analyze}
              busy={busy}
              analysisProgress={analysisProgress}
              positions={positions}
              reviewPositions={review.positions}
              pos={position}
              compare={compare}
              active={active}
              idx={idx}
              setIdx={setIdx}
              cmp={cmp}
              setCmp={setCmp}
              free={free}
              setFree={setFree}
              freePos={freePos}
              setFreePos={setFreePos}
              freeIdx={freeIdx}
              setFreeIdx={setFreeIdx}
              shadow={shadow}
              setShadow={setShadow}
              handleMove={handleMove}
              hasGames={games.length > 0}
              setPage={setPage}
              coachSummary={coachSummary}
            />
          )}

          {page === "studio" && (
            <StudioPage
              systemStatus={systemStatus}
              platformStats={platformStats}
              busy={busy}
              syncForm={syncForm}
              setSyncForm={setSyncForm}
              pgnForm={pgnForm}
              setPgnForm={setPgnForm}
              syncChesscom={syncChesscom}
              importPgn={importPgn}
              syncNewAndAnalyze={syncNewAndAnalyze}
              analyzeAllGames={analyzeAllGames}
              coachSummary={coachSummary}
            />
          )}

          {page === "billing" && (
            <BillingPage
              catalog={billingCatalog}
              requestCheckout={requestCheckout}
            />
          )}

          {page === "settings" && (
            <SettingsPage
              user={user}
              systemStatus={systemStatus}
              token={token}
              setAuthOpen={setAuthOpen}
            />
          )}
        </div>
      </main>

      <AuthDrawer
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        token={token}
        setToken={setToken}
        user={user}
        setUser={setUser}
        setMessage={setMessage}
      />
    </div>
  );
}

function ReviewPage(props) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const {
    game, games, gameId, setGameId, analyze, busy, analysisProgress,
    positions, reviewPositions, pos, compare, active,
    idx, setIdx, cmp, setCmp, free, setFree, freePos,
    setFreePos, freeIdx, setFreeIdx, shadow, setShadow,
    handleMove, hasGames, setPage, coachSummary,
  } = props;

  const analyzed = game.analysisStatus?.analyzedMoves ?? positions.filter((item) => item.isAnalyzed).length;
  const total = game.analysisStatus?.totalMoves ?? Math.max(0, positions.length - 1);
  const coverage = coveragePct(analyzed, total);

  return (
    <div className="page-grid review-page">
      <div className="stats">
        <Stat icon={Gauge} label="Beyaz doğruluk" value={fmtAcc(game.whiteAccuracy)} tone="cyan" />
        <Stat icon={BarChart3} label="Siyah doğruluk" value={fmtAcc(game.blackAccuracy)} tone="amber" />
        <Stat icon={Database} label="Oyun havuzu" value={`${games.length}`} tone="teal" />
        <Stat icon={ShieldCheck} label="Analiz kapsaması" value={`${coverage}%`} tone="lime" />
        <Stat icon={GitBranch} label="Çalışma modu" value={free ? "Varyant" : "Ana hat"} tone="rose" />
      </div>

      {coachSummary && <CoachSummaryPanel summary={coachSummary} />}

      <Card cls="card-pad hero-card">
        <div className="hero-grid">
          <div>
            <div className="eyebrow">Review center</div>
            <h1 className="title">{game.title}</h1>
            <p className="hero-copy">{game.opening || "Açılış bilgisi yok"} · {game.timeClass || "-"} · {game.timeControl || "-"}</p>
            <div className="hero-badges">
              <Badge>Beyaz {fmtAcc(game.whiteAccuracy)}</Badge>
              <Badge>Siyah {fmtAcc(game.blackAccuracy)}</Badge>
              <Badge>Kapsam {analyzed}/{total}</Badge>
              <Badge>{game.result || "Sonuç yok"}</Badge>
            </div>
          </div>

          <div className="hero-actions">
            <select value={gameId || ""} onChange={(event) => setGameId(Number(event.target.value) || null)}>
              {!games.length && <option value="">Henüz oyun yok</option>}
              {games.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} · Beyaz {fmtAcc(item.whiteAccuracy)} · Siyah {fmtAcc(item.blackAccuracy)}
                </option>
              ))}
            </select>

            <div className="action-grid">
              <Button cls="btn-emerald" disabled={busy || !hasGames} onClick={() => analyze(false)} title="Seçili oyunu analiz et">
                {busy ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
                Hızlı analiz
              </Button>
              <Button cls="btn-violet" disabled={busy || !hasGames} onClick={() => analyze(true)} title="Derin analiz çalıştır">
                {busy && analysisProgress?.active ? <Loader2 size={16} className="spin" /> : <WandSparkles size={16} />}
                Derin parti
              </Button>
              <Button
                cls="btn-dark"
                disabled={!hasGames}
                onClick={() => {
                  setFree(true);
                  setFreePos([{...pos, move: `${pos.move} · Varyant kökü`}]);
                  setFreeIdx(0);
                }}
                title="Serbest varyant aç"
              >
                <GitBranch size={16} />
                Varyant aç
              </Button>
              <Button cls="btn-white" onClick={() => setDetailsOpen(true)} title="Review detaylarini ac">
                <Menu size={16} />
                Detaylar
              </Button>
            </div>

            {!hasGames && (
              <div className="empty-inline">
                Bu workspace henüz boş. Oyun eklemek için Studio sekmesine geç.
                <button type="button" className="text-link" onClick={() => setPage("studio")}>
                  Studio aç
                </button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {analysisProgress?.active && <AnalysisProgress progress={analysisProgress} />}

      <AccuracyPanel game={game} analyzed={analyzed} total={total} />

      <div className="review-layout">
        <div className="board-column">
          <Board position={pos} free={free} onMove={handleMove} />

          <Card cls="card-pad board-status">
            <div className="board-status-top">
              <div>
                <Badge cls={`quality-${pos.quality || "book"}`}>{qLabel(pos.quality)}</Badge>
                <strong>{pos.move}</strong>
                <div className="small">{pos.label}</div>
              </div>
              <div className="step-actions">
                <Button cls="btn-white" onClick={() => free ? setFreeIdx((current) => Math.max(0, current - 1)) : setIdx((current) => Math.max(0, current - 1))} title="Önceki hamle">
                  <ChevronLeft size={16} />
                </Button>
                <Button cls="btn-white" onClick={() => free ? setFreeIdx((current) => Math.min(freePos.length - 1, current + 1)) : setIdx((current) => Math.min(reviewPositions.length - 1, current + 1))} title="Sonraki hamle">
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
            <EvalBar cp={pos.evalCp} />
          </Card>

          <Momentum positions={reviewPositions} active={idx} onSelect={(next) => { setFree(false); setIdx(next); setCmp(next); }} />
          <MoveQualityChart positions={reviewPositions} active={idx} onSelect={(next) => { setFree(false); setIdx(next); setCmp(next); }} />

          {free && (
            <Card cls="card-pad">
              <div className="split-head">
                <div>
                  <strong>Varyant aktif</strong>
                  <div className="small">Serbest analiz hattı ana oyundan bağımsız ilerliyor.</div>
                </div>
                <Button cls="btn-white" onClick={() => setFree(false)} title="Ana oyuna dön">
                  <ArrowRight size={16} />
                  Ana hatta dön
                </Button>
              </div>
            </Card>
          )}
        </div>

        <aside className="side-column review-side">
          <Coach pos={pos} compare={compare} shadow={shadow} setShadow={setShadow} />
          <Notation
            positions={positions}
            active={active}
            onSelect={(next) => {
              if (free) setFreeIdx(next);
              else setIdx(next);
            }}
            cmp={cmp}
            setCmp={setCmp}
          />
          <MoveDNA pos={pos} />
          <RootCause pos={pos} />
          <FocusQueue
            positions={reviewPositions}
            onSelect={(next) => {
              setFree(false);
              setIdx(next);
              setCmp(next);
            }}
          />
        </aside>
      </div>

      <ReviewDetailsDrawer
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        stats={{
          whiteAccuracy: game.whiteAccuracy,
          blackAccuracy: game.blackAccuracy,
          games: games.length,
          analyzed,
          total,
          mode: free ? "Varyant" : "Ana hat",
        }}
        positions={positions}
        reviewPositions={reviewPositions}
        active={active}
        onSelect={(next) => {
          if (free) setFreeIdx(next);
          else setIdx(next);
          setDetailsOpen(false);
        }}
        cmp={cmp}
        setCmp={setCmp}
        pos={pos}
        compare={compare}
        shadow={shadow}
        setShadow={setShadow}
        openPosition={(next) => {
          setFree(false);
          setIdx(next);
          setCmp(next);
          setDetailsOpen(false);
        }}
      />
    </div>
  );
}


function CoachSummaryPanel({summary}) {
  if (!summary) return null;
  const total = Number(summary.wins || 0) + Number(summary.losses || 0) + Number(summary.draws || 0);
  return (
    <Card cls="card-pad coach-summary-card">
      <div className="split-head">
        <div>
          <div className="eyebrow">Profesyonel koç özeti</div>
          <strong>Genel performans ve çalışma reçetesi</strong>
        </div>
        <Badge>{total ? `${summary.winRate ?? 0}% win` : "Analiz bekliyor"}</Badge>
      </div>

      <div className="coach-summary-grid">
        <div className="coach-score-tile win">
          <span>Win</span>
          <strong>{summary.wins || 0}</strong>
        </div>
        <div className="coach-score-tile loss">
          <span>Lose</span>
          <strong>{summary.losses || 0}</strong>
        </div>
        <div className="coach-score-tile draw">
          <span>Draw</span>
          <strong>{summary.draws || 0}</strong>
        </div>
      </div>

      <div className="coach-note">
        <p>{summary.coachNote}</p>
        <p>{summary.encouragement}</p>
      </div>

      <div className="study-plan-grid">
        {(summary.studyPlan || []).map((item) => (
          <div key={`${item.title}-${item.duration}`} className="study-plan-card">
            <span>{item.duration}</span>
            <strong>{item.title}</strong>
            <p>{item.text}</p>
          </div>
        ))}
      </div>

      {!!summary.criticalMoments?.length && (
        <div className="critical-list">
          <div className="small">Öncelikli tekrar pozisyonları</div>
          {summary.criticalMoments.slice(0, 4).map((item) => (
            <div key={`${item.gameId}-${item.moveId}`} className="critical-item">
              <span>{item.move}</span>
              <strong>{qLabel(item.quality)} · {(item.lossCp / 100).toFixed(2)} piyon</strong>
              <small>{item.title}</small>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function AccuracyPanel({game, analyzed, total}) {
  const coverage = coveragePct(analyzed, total);
  const white = numericAcc(game.whiteAccuracy);
  const black = numericAcc(game.blackAccuracy);
  const leader = white === black ? "Denge" : white > black ? "Beyaz daha temiz oynadı" : "Siyah daha temiz oynadı";

  return (
    <Card cls="card-pad accuracy-panel">
      <div className="split-head">
        <div>
          <div className="eyebrow">Doğruluk analizi</div>
          <strong>{leader}</strong>
        </div>
        <Badge>{coverage}% kapsam</Badge>
      </div>
      <div className="accuracy-grid">
        <AccuracyMeter label="Beyaz" value={game.whiteAccuracy} tone="white" />
        <AccuracyMeter label="Siyah" value={game.blackAccuracy} tone="black" />
        <div className="analysis-progress">
          <div className="small">Analizlenen hamle</div>
          <strong>{analyzed}/{total}</strong>
          <div className="metric-track">
            <div className="metric-fill" style={{width: `${coverage}%`}} />
          </div>
        </div>
      </div>
    </Card>
  );
}

function AnalysisProgress({progress}) {
  const percent = Math.max(0, Math.min(100, Number(progress.percent || 0)));
  return (
    <Card cls="card-pad analysis-progress-card">
      <div className="analysis-orbit" aria-hidden="true">
        <div />
      </div>
      <div className="analysis-progress-copy">
        <div className="eyebrow">Engine queue</div>
        <strong>{progress.label}</strong>
        <div className="small">{progress.analyzed || 0}/{progress.total || 0} hamle derinlik kontrolünden geçti</div>
        <div className="metric-track">
          <div className="metric-fill" style={{width: `${percent}%`}} />
        </div>
      </div>
      <div className="analysis-percent">{percent}%</div>
    </Card>
  );
}

function AccuracyMeter({label, value, tone}) {
  const width = Math.max(0, Math.min(100, numericAcc(value)));
  return (
    <div className={cx("accuracy-meter", `accuracy-${tone}`)}>
      <div className="settings-line">
        <span>{label}</span>
        <strong>{fmtAcc(value)}</strong>
      </div>
      <div className="metric-track">
        <div className="metric-fill" style={{width: `${width}%`}} />
      </div>
    </div>
  );
}

function ReviewDetailsDrawer({
  open,
  onClose,
  stats,
  positions,
  reviewPositions,
  active,
  onSelect,
  cmp,
  setCmp,
  pos,
  compare,
  shadow,
  setShadow,
  openPosition,
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            className="backdrop"
            onClick={onClose}
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
          />
          <motion.aside
            className="details-drawer"
            initial={{x: 460}}
            animate={{x: 0}}
            exit={{x: 460}}
            transition={{type: "spring", stiffness: 280, damping: 28}}
          >
            <div className="drawer-head">
              <div>
                <div className="eyebrow">Review details</div>
                <strong>Detay paneli</strong>
              </div>
              <Button cls="btn-icon btn-white" onClick={onClose} title="Detaylari kapat">
                <X size={16} />
              </Button>
            </div>

            <div className="details-stack">
              <div className="stats details-stats">
                <Stat icon={Gauge} label="Beyaz dogruluk" value={fmtAcc(stats.whiteAccuracy)} tone="teal" />
                <Stat icon={BarChart3} label="Siyah dogruluk" value={fmtAcc(stats.blackAccuracy)} tone="amber" />
                <Stat icon={Database} label="Oyun havuzu" value={`${stats.games}`} tone="brown" />
                <Stat icon={ShieldCheck} label="Analiz kapsami" value={`${coveragePct(stats.analyzed, stats.total)}%`} tone="lime" />
                <Stat icon={GitBranch} label="Calisma modu" value={stats.mode} tone="blue" />
              </div>
              <Notation positions={positions} active={active} onSelect={onSelect} cmp={cmp} setCmp={setCmp} />
              <Coach pos={pos} compare={compare} shadow={shadow} setShadow={setShadow} />
              <MoveDNA pos={pos} />
              <RootCause pos={pos} />
              <FocusQueue positions={reviewPositions} onSelect={openPosition} />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function StudioPage({systemStatus, platformStats, busy, syncForm, setSyncForm, pgnForm, setPgnForm, syncChesscom, importPgn, syncNewAndAnalyze, analyzeAllGames, coachSummary}) {
  return (
    <div className="page-grid">
      <Card cls="card-pad section-header">
        <div className="eyebrow">Operations workspace</div>
        <h1 className="title">Import, health ve product ideas</h1>
        <p className="hero-copy">Buradan canlı oyun akışını besleyebilir, platform sağlığını görebilir ve ürün fikirlerini gerçek ekrana bağlayabilirsin.</p>
      </Card>

      <div className="studio-grid">
        <Card cls="card-pad">
          <div className="split-head">
            <div>
              <div className="eyebrow">Chess.com sync</div>
              <strong>Arşivden toplu içe aktarım</strong>
            </div>
            <Import size={18} />
          </div>
          <label className="field-label">Kullanıcı adı</label>
          <input value={syncForm.username} onChange={(event) => setSyncForm({...syncForm, username: event.target.value})} placeholder="Chess.com kullanıcı adı" />
          <label className="field-label">Doğruluk eşleşmesi</label>
          <input value={syncForm.ownerUsername} onChange={(event) => setSyncForm({...syncForm, ownerUsername: event.target.value})} placeholder="hangi hesabın rengi/doğruluğu izlensin?" />
          <label className="check-line">
            <input type="checkbox" checked={syncForm.allArchives} onChange={(event) => setSyncForm({...syncForm, allArchives: event.target.checked})} />
            Tüm Chess.com arşivlerini çek
          </label>
          {!syncForm.allArchives && (
            <>
              <label className="field-label">Son arşiv sayısı</label>
              <input type="number" min="1" max="600" value={syncForm.maxArchives} onChange={(event) => setSyncForm({...syncForm, maxArchives: event.target.value})} />
            </>
          )}
          <div className="spacer-12" />
          <div className="action-stack">
            <Button cls="btn-dark" disabled={busy} onClick={syncChesscom} title="Sadece yeni oyunları içe aktar">
              {busy ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              Sadece yeni oyunları çek
            </Button>
            <Button cls="btn-emerald" disabled={busy} onClick={syncNewAndAnalyze} title="Yeni oyunları ekle ve otomatik derin analiz başlat">
              <WandSparkles size={16} />
              Yeni oyunları çek + derin analiz et
            </Button>
            <Button cls="btn-violet" disabled={busy} onClick={analyzeAllGames} title="Tüm oyun havuzunu derin analiz kuyruğuna al">
              <LineChart size={16} />
              Tüm oyunları derin analiz et
            </Button>
          </div>
        </Card>

        <Card cls="card-pad">
          <div className="split-head">
            <div>
              <div className="eyebrow">PGN import</div>
              <strong>Doğrudan dosya veya maç yapıştır</strong>
            </div>
            <Upload size={18} />
          </div>
          <label className="field-label">Sahip kullanıcı adı</label>
          <input value={pgnForm.ownerUsername} onChange={(event) => setPgnForm({...pgnForm, ownerUsername: event.target.value})} placeholder="oyunu kimin adına işleyecek?" />
          <label className="field-label">Maç URL</label>
          <input value={pgnForm.url} onChange={(event) => setPgnForm({...pgnForm, url: event.target.value})} placeholder="opsiyonel maç linki" />
          <label className="field-label">PGN</label>
          <textarea value={pgnForm.pgn} onChange={(event) => setPgnForm({...pgnForm, pgn: event.target.value})} placeholder="[Event ...]" rows={12} />
          <div className="spacer-12" />
          <Button cls="btn-emerald" disabled={busy} onClick={importPgn} title="PGN içe aktar">
            {busy ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
            PGN içe aktar
          </Button>
        </Card>
      </div>

      <div className="stats">
        <Stat icon={Database} label="Oyun" value={`${platformStats.games}`} tone="cyan" />
        <Stat icon={GitBranch} label="Hamle" value={`${platformStats.moves}`} tone="rose" />
        <Stat icon={LineChart} label="Analiz" value={`${platformStats.analyses}`} tone="lime" />
        <Stat icon={ShieldCheck} label="Database" value={systemStatus?.database?.backend || "-"} tone="amber" />
        <Stat icon={Activity} label="Engine" value={systemStatus?.stockfish?.available ? "Ready" : "Missing"} tone="teal" />
      </div>

      {coachSummary && <CoachSummaryPanel summary={coachSummary} />}

      <div className="idea-grid">
        <IdeaCard
          icon={Rocket}
          title="Opening drift radar"
          text="Oyuncunun repertuvar dışına çıktığı anları renk katmanlı timeline ile işaretle."
        />
        <IdeaCard
          icon={BookOpen}
          title="Pattern vault"
          text="Kaçan fırsat ve kritik hata pozisyonlarını otomatik tekrar paketi olarak kilitle."
        />
        <IdeaCard
          icon={WandSparkles}
          title="Coach brief"
          text="Her maç için üç cümlelik executive summary üret: tempo, kalite, turning point."
        />
        <IdeaCard
          icon={BarChart3}
          title="Team review lane"
          text="Koç, öğrenci ve kulüp için filtrelenebilir review kuyruklarıyla çok oyunculu mod kur."
        />
      </div>
    </div>
  );
}

function BillingPage({catalog, requestCheckout}) {
  return (
    <div className="page-grid">
      <Card cls="card-pad section-header billing-header">
        <div className="eyebrow">Donation surface</div>
        <h1 className="title">Bağış alanı hazır, IBAN bekliyor</h1>
        <p className="hero-copy">{catalog.message}</p>
        <div className="hero-badges">
          <Badge>Provider {catalog.provider}</Badge>
          <Badge>Support {catalog.supportEmail}</Badge>
          <Badge>Tahsilat pasif</Badge>
        </div>
      </Card>

      <div className="billing-grid">
        {catalog.plans.map((plan) => (
          <Card key={plan.id} cls="card-pad pricing-card">
            <div className="eyebrow">{plan.audience}</div>
            <h3>{plan.name}</h3>
            <div className="price-line">{plan.priceLabel}</div>
            <ul className="feature-list">
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <Button cls="btn-dark" onClick={() => requestCheckout(plan.id)} title={`${plan.name} planı için checkout hazırlığı`}>
              <CreditCard size={16} />
              Bağış bilgisi bekleniyor
            </Button>
          </Card>
        ))}
      </div>

      <Card cls="card-pad">
        <div className="split-head">
          <div>
            <div className="eyebrow">Implementation boundary</div>
            <strong>IBAN verilene kadar ödeme alanı pasif</strong>
          </div>
          <ShieldCheck size={18} />
        </div>
        <p className="small">
          Bu ekran bağış niyeti için hazırlandı. IBAN bilgisi verilene kadar kart, checkout, abonelik veya tahsilat akışı çalışmaz.
        </p>
      </Card>
    </div>
  );
}

function SettingsPage({user, systemStatus, token, setAuthOpen}) {
  return (
    <div className="page-grid">
      <Card cls="card-pad section-header">
        <div className="eyebrow">Platform settings</div>
        <h1 className="title">Runtime, account ve deployment hazırlığı</h1>
        <p className="hero-copy">Yerelden globale geçiş için sağlık durumu ve çalışma ortamı burada toplanıyor.</p>
      </Card>

      <div className="settings-grid">
        <Card cls="card-pad">
          <div className="split-head">
            <strong>Hesap</strong>
            <User size={18} />
          </div>
          {user ? (
            <>
              <div className="settings-line"><span>Ad</span><strong>{user.displayName}</strong></div>
              <div className="settings-line"><span>Kullanıcı adı</span><strong>@{user.username}</strong></div>
              <div className="settings-line"><span>Chess.com</span><strong>{user.chesscomUsername || "-"}</strong></div>
              <div className="settings-line"><span>Session</span><strong>{token ? "Active" : "Missing"}</strong></div>
            </>
          ) : (
            <>
              <p className="small">Henüz giriş yapılmadı. Ayrı auth paneli üzerinden kayıt veya giriş yapabilirsin.</p>
              <Button cls="btn-dark" onClick={() => setAuthOpen(true)} title="Auth panelini aç">
                <LogIn size={16} />
                Auth paneli aç
              </Button>
            </>
          )}
        </Card>

        <Card cls="card-pad">
          <div className="split-head">
            <strong>Backend sağlığı</strong>
            <Activity size={18} />
          </div>
          <div className="settings-line"><span>App</span><strong>{systemStatus?.app || "-"}</strong></div>
          <div className="settings-line"><span>Version</span><strong>{systemStatus?.version || "-"}</strong></div>
          <div className="settings-line"><span>Database backend</span><strong>{systemStatus?.database?.backend || "-"}</strong></div>
          <div className="settings-line"><span>Database URL</span><strong className="mono">{systemStatus?.database?.url || "-"}</strong></div>
          <div className="settings-line"><span>Stockfish</span><strong>{systemStatus?.stockfish?.available ? "Hazır" : "Eksik"}</strong></div>
          <div className="settings-line"><span>Engine path</span><strong className="mono">{systemStatus?.stockfish?.path || "-"}</strong></div>
        </Card>
      </div>
    </div>
  );
}

function AuthDrawer({open, onClose, token, setToken, user, setUser, setMessage}) {
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    username: "",
    displayName: "",
    password: "",
    chesscomUsername: "",
    email: "",
  });

  async function submit() {
    if (!form.username.trim() || !form.password) {
      setError("Kullanıcı adı ve şifre gerekli.");
      return;
    }

    if (mode === "register" && form.password.length < 8) {
      setError("Şifre en az 8 karakter olmalı.");
      return;
    }

    setBusy(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload = mode === "login"
        ? {username: form.username.trim(), password: form.password}
        : {
          username: form.username.trim(),
          display_name: form.displayName.trim(),
          password: form.password,
          chesscom_username: form.chesscomUsername.trim() || null,
          email: form.email.trim() || null,
        };

      const data = await postJson(endpoint, payload);
      setToken(data.token);
      setUser(data.user);
      setError("");
      setMessage(mode === "login" ? "Giriş başarılı." : "Hesap oluşturuldu.");
      onClose();
    } catch (submitError) {
      setError(uiError(submitError, "Giriş isteği tamamlanamadı."));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    try {
      await postJson("/api/auth/logout", {}, token);
    } catch {}
    setToken(null);
    setUser(null);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            className="backdrop"
            onClick={onClose}
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
          />
          <motion.aside
            className="auth-drawer"
            initial={{x: 420}}
            animate={{x: 0}}
            exit={{x: 420}}
            transition={{type: "spring", stiffness: 280, damping: 28}}
          >
            <div className="drawer-head">
              <div>
                <div className="eyebrow">Identity panel</div>
                <strong>{user ? "Hesap paneli" : mode === "login" ? "Giriş yap" : "Kayıt oluştur"}</strong>
              </div>
              <Button cls="btn-white" onClick={onClose} title="Paneli kapat">
                <X size={16} />
              </Button>
            </div>

            {user ? (
              <div className="drawer-stack">
                <Card cls="card-pad">
                  <div className="settings-line"><span>Ad</span><strong>{user.displayName}</strong></div>
                  <div className="settings-line"><span>Kullanıcı</span><strong>@{user.username}</strong></div>
                  <div className="settings-line"><span>Chess.com</span><strong>{user.chesscomUsername || "-"}</strong></div>
                  <div className="settings-line"><span>E-posta</span><strong>{user.email || "-"}</strong></div>
                </Card>
                <Button cls="btn-dark" onClick={signOut} title="Çıkış yap">
                  <LogOut size={16} />
                  Çıkış yap
                </Button>
              </div>
            ) : (
              <div className="drawer-stack">
                <div className="mode-toggle">
                  <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Giriş</button>
                  <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Kayıt</button>
                </div>

                {mode === "register" && (
                  <>
                    <label className="field-label">Görünen ad</label>
                    <input value={form.displayName} onChange={(event) => setForm({...form, displayName: event.target.value})} placeholder="Onur Y." />
                  </>
                )}

                <label className="field-label">Kullanıcı adı</label>
                <input value={form.username} onChange={(event) => setForm({...form, username: event.target.value})} placeholder="onur" />

                <label className="field-label">Şifre</label>
                <input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={form.password} onChange={(event) => setForm({...form, password: event.target.value})} placeholder="En az 8 karakter" />

                {mode === "register" && (
                  <>
                    <label className="field-label">Chess.com kullanıcı adı</label>
                    <input value={form.chesscomUsername} onChange={(event) => setForm({...form, chesscomUsername: event.target.value})} placeholder="CaarlsenKaybediyoo" />
                    <label className="field-label">E-posta</label>
                    <input value={form.email} onChange={(event) => setForm({...form, email: event.target.value})} placeholder="ad@alan.com" />
                  </>
                )}

                {error && <div className="error-box">{error}</div>}

                <Button cls="btn-dark" onClick={submit} disabled={busy} title="Formu gönder">
                  {busy ? <Loader2 size={16} className="spin" /> : <LogIn size={16} />}
                  {mode === "login" ? "Giriş yap" : "Hesap oluştur"}
                </Button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Stat({icon: Icon, label, value, tone = "cyan"}) {
  return (
    <Card cls="card-pad stat-card">
      <div className={cx("stat-icon", `tone-${tone}`)}><Icon size={18} /></div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="small">{label}</div>
      </div>
    </Card>
  );
}

function Board({position, free, onMove}) {
  const [selected, setSelected] = useState(null);
  const board = parseFen(position.fen);
  const highlights = new Set(position.highlights || []);

  return (
    <div className="board-shell">
      <div className="board-wrap">
        <div className="ranks">{RANKS.map((rank) => <span key={rank}>{rank}</span>)}</div>
        <div className="board">
          {board.flatMap((row, rowIndex) => row.map((piece, colIndex) => {
            const square = squareName(rowIndex, colIndex);
            return (
              <div
                key={square}
                className={cx(
                  "square",
                  (rowIndex + colIndex) % 2 === 0 ? "light" : "dark",
                  selected === square && "selected-square",
                )}
                role="button"
                tabIndex={free ? 0 : -1}
                onClick={() => {
                  if (!free) return;
                  if (!selected && piece) {
                    setSelected(square);
                    return;
                  }
                  if (selected) {
                    if (selected !== square) onMove(selected, square);
                    setSelected(null);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setSelected(null);
                }}
                onDragOver={(event) => free && event.preventDefault()}
                onDrop={(event) => {
                  if (!free) return;
                  event.preventDefault();
                  const from = event.dataTransfer.getData("text/plain");
                  if (from) onMove(from, square);
                  setSelected(null);
                }}
              >
                {highlights.has(square) && <div className="highlight" />}
                {piece && (
                  <span
                    draggable={free}
                    onDragStart={(event) => free && event.dataTransfer.setData("text/plain", square)}
                    className="piece"
                  >
                    {PIECES[piece]}
                  </span>
                )}
              </div>
            );
          }))}
          <Arrows arrows={position.arrows || []} />
        </div>
        <div />
        <div className="files">{FILES.map((file) => <span key={file}>{file}</span>)}</div>
      </div>
    </div>
  );
}

function Arrows({arrows}) {
  return (
    <svg className="arrow-layer" viewBox="0 0 800 800">
      <defs>
        <marker id="arrow-head" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="context-stroke" />
        </marker>
      </defs>
      {arrows.filter(Boolean).map((arrow, index) => {
        const start = coord(arrow.from);
        const end = coord(arrow.to);
        if (!start || !end) return null;

        const x1 = start.col * 100 + 50;
        const y1 = start.row * 100 + 50;
        const x2 = end.col * 100 + 50;
        const y2 = end.row * 100 + 50;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        const sx = x1 + dx / distance * 22;
        const sy = y1 + dy / distance * 22;
        const ex = x2 - dx / distance * 30;
        const ey = y2 - dy / distance * 30;

        const color = arrow.tone === "danger"
          ? "rgba(225, 29, 72, .88)"
          : arrow.tone === "idea"
            ? "rgba(37, 99, 235, .88)"
            : arrow.tone === "attack"
              ? "rgba(245, 158, 11, .90)"
              : "rgba(8, 145, 178, .92)";

        return (
          <g key={index}>
            <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={color} strokeWidth="14" strokeLinecap="round" markerEnd="url(#arrow-head)" />
            <circle cx={sx} cy={sy} r="5" fill={color} />
          </g>
        );
      })}
    </svg>
  );
}

function EvalBar({cp}) {
  const maxAbs = 700;
  return (
    <div className="eval-shell">
      <div className="eval-labels">
        <span>White +</span>
        <span>Black +</span>
      </div>
      <div className="evalbar">
        <div className="evaltick" style={{top: `${evalPct(cp, maxAbs)}%`}} />
      </div>
      <Badge>{evalText(cp)}</Badge>
    </div>
  );
}

function moveSide(index) {
  if (index <= 0) return "Başlangıç";
  return index % 2 === 1 ? "Beyaz" : "Siyah";
}

function Notation({positions, active, onSelect, cmp, setCmp}) {
  const [query, setQuery] = useState("");
  const [qualityFilter, setQualityFilter] = useState("all");
  const deferredQuery = useDeferredValue(query);

  const qualities = Array.from(new Set(positions.map((position) => position.quality || "book")));
  const rows = positions
    .map((position, index) => ({position, index}))
    .filter(({position}) => qualityFilter === "all" || position.quality === qualityFilter)
    .filter(({position}) => {
      const haystack = `${position.move} ${position.played} ${position.label}`.toLowerCase();
      return haystack.includes(deferredQuery.trim().toLowerCase());
    });

  return (
    <Card cls="card-pad">
      <div className="split-head">
        <strong>Notation</strong>
        <Badge>{rows.length} satır</Badge>
      </div>
      <div className="notation-filters">
        <div className="search-shell">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Hamle, kalite veya etiket ara" />
        </div>
        <select value={qualityFilter} onChange={(event) => setQualityFilter(event.target.value)}>
          <option value="all">Tümü</option>
          {qualities.map((quality) => (
            <option key={quality} value={quality}>{qLabel(quality)}</option>
          ))}
        </select>
      </div>
      <div className="notation">
        {rows.map(({position, index}) => (
          <button
            key={`${position.ply || index}-${index}`}
            type="button"
            className={cx("move-token", `quality-${position.quality || "book"}`, active === index && "active-token")}
            onClick={() => onSelect(index)}
          >
            <span className="move-index">{index === 0 ? "0" : `${Math.ceil(index / 2)}${index % 2 === 0 ? "..." : "."}`}</span>
            <span className="move-main">
              <b>{position.played || position.move}</b>
              <small>{moveSide(index)} · {qLabel(position.quality)} · {evalText(position.evalCp)}</small>
            </span>
            <span className={cmp === index ? "compare-pill active" : "compare-pill"} onClick={(event) => { event.stopPropagation(); setCmp(index); }}>
              cmp
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}


function coachInsights(pos, delta) {
  const loss = Number(pos.loss || 0);
  const played = pos.played || "-";
  const best = pos.best || "-";
  const quality = pos.quality || "analysis";
  const evalPhrase = delta >= 0
    ? `seçili kıyas noktasına göre ${(delta / 100).toFixed(2)} piyon daha rahat görünüyorsun`
    : `seçili kıyas noktasına göre ${Math.abs(delta / 100).toFixed(2)} piyonluk baskı kaybı var`;

  const qualityVoice = {
    brilliant: "Burada yaratıcı bir fikir var. Bunu 'şans eseri güzel hamle' diye geçme; hamlen forcing olduğu için rakibi karar vermeye zorluyor.",
    best: "Bu hamle sade ve olgun. Gereksiz atraksiyon yok; pozisyon ne istiyorsa onu yapmışsın.",
    excellent: "Güçlü karar. Taşların uyumu ve plan devamlılığı korunuyor.",
    good: "Hamle oynanabilir. Bir sonraki seviyeye çıkmak için burada ikinci adayı da tartmanı isterdim.",
    inaccuracy: "Bu küçük bir tempo/koordinasyon kaybı. Büyük sorun değil; tekrar eden bir alışkanlıksa puan kaçırır.",
    wrong: "Burada planın yönü biraz kaymış. Pozisyonu hemen çöpe atmıyor ama seni savunma moduna itebilir.",
    mistake: "Bu hamle kritik bir karar kalitesi kaybı yaratıyor. Panik yok; bu tip hatalar net kontrol listesiyle azalır.",
    blunder: "Burada taktik güvenlik alarmı çalıyor. Önce şah çekme, alma ve tehditleri kontrol etmeliydin.",
    missed: "Burada fırsat vardı. İyi haber: pozisyona ulaşmışsın; şimdi o avantajı dönüştürmeyi çalışacağız.",
  }[quality] || "Bu pozisyon için motor verisini insan diliyle sadeleştiriyorum.";

  const prescription = quality === "blunder" || loss >= 220
    ? "Bir sonraki 10 oyunda her hamleden önce CCT kontrolü yap: şah çekme, alma, tehdit."
    : quality === "mistake" || loss >= 110
      ? "Aday hamle disiplinine odaklan: ilk fikri değil, en az üç adayı masaya koy."
      : quality === "missed"
        ? "Avantajlı pozisyonlarda en aktif taşını ve forcing hamleleri önce ara."
        : quality === "inaccuracy"
          ? "Küçük tempo kayıplarını azalt: gelişim, merkez ve şah güvenliği üçlüsünü bozma."
          : "Bu karar modelini sakla: sade plan, düşük risk, net amaç.";

  return [
    ["Koç yorumu", qualityVoice],
    ["Oynanan hamle", `${played} hamlesinin ana etkisi: ${pos.advice || "pozisyonun dengesini değiştiriyor."}`],
    ["Daha temiz aday", best && best !== "-" ? `${best} fikrini ayrıca incele; burada motorun önerisi sana planın en sade yolunu gösteriyor.` : "Bu pozisyonda net bir alternatif verisi yok."],
    ["Kıyas", `${evalPhrase}.`],
    ["Çalışma reçetesi", prescription],
  ];
}


function Coach({pos, compare, shadow, setShadow}) {
  const delta = Number(pos.evalCp || 0) - Number(compare.evalCp || 0);
  const insights = coachInsights(pos, delta);
  return (
    <Card cls="card-pad coach-card">
      <div className="split-head">
        <div>
          <div className="eyebrow">Move coach</div>
          <strong>Hamle kararı ve gelişim notu</strong>
        </div>
        <Badge cls={`quality-${pos.quality || "book"}`}>{qLabel(pos.quality)}</Badge>
      </div>
      <div className="panel-black coach-hero">
        <div className="small">Koç teşhisi</div>
        <p>{shadow ? "Shadow mode açık. Önce kendi aday hamleni belirle, sonra koç yorumunu aç." : pos.advice}</p>
      </div>
      <div className="coach-steps">
        {insights.map(([label, text]) => (
          <div key={label} className="coach-step">
            <span>{label}</span>
            <strong>{shadow && (label === "Oynanan hamle" || label === "Daha güçlü fikir") ? "Gizli" : text}</strong>
          </div>
        ))}
      </div>
      <Button cls="btn-violet" onClick={() => setShadow((current) => !current)} title="Shadow review modunu değiştir">
        {shadow ? "Normal göster" : "Hamleyi gizle"}
      </Button>
    </Card>
  );
}

function Info({label, value}) {
  return (
    <div className="info-card">
      <div className="small">{label}</div>
      <strong>{value || "-"}</strong>
    </div>
  );
}

function Momentum({positions, active, onSelect}) {
  const [hovered, setHovered] = useState(active);
  const values = positions.map((position) => Number(position.evalCp || 0));
  const maxAbs = Math.max(300, Math.min(900, Math.ceil(Math.max(...values.map((value) => Math.abs(value)), 0) / 100) * 100));
  const gridValues = [maxAbs, maxAbs / 2, 0, -maxAbs / 2, -maxAbs];
  const n = Math.max(1, positions.length - 1);

  const points = positions.map((position, index) => {
    const x = 42 + (index / n) * 918;
    const y = 24 + evalPct(position.evalCp, maxAbs) * 1.12;
    return {x, y, position, index};
  });

  const focusPoint = points.find((point) => point.index === hovered) || points.find((point) => point.index === active) || points[0];
  const whitePeak = positions.reduce((best, position) => Number(position.evalCp || 0) > Number(best.evalCp || 0) ? position : best, positions[0]);
  const blackPeak = positions.reduce((best, position) => Number(position.evalCp || 0) < Number(best.evalCp || 0) ? position : best, positions[0]);
  const previousPoint = focusPoint && focusPoint.index > 0 ? positions[focusPoint.index - 1] : null;
  const swing = previousPoint ? Number(focusPoint.position.evalCp || 0) - Number(previousPoint.evalCp || 0) : 0;

  return (
    <Card cls="card-pad">
      <div className="split-head">
        <div>
          <strong>Momentum map</strong>
          <div className="small">Y ekseni tam eval değerini gösterir; sıfır çizgisi ayrı işaretlidir.</div>
        </div>
        {focusPoint && <Badge>{focusPoint.position.move} · {evalText(focusPoint.position.evalCp)}</Badge>}
      </div>
      <div className="momentum-shell">
        <svg viewBox="0 0 1000 170" className="momentum-chart">
          <defs>
            <linearGradient id="momentum-gradient" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="55%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          {gridValues.map((grid) => {
            const y = 24 + evalPct(grid, maxAbs) * 1.12;
            return (
              <g key={grid}>
                <line x1="42" x2="960" y1={y} y2={y} className={grid === 0 ? "gridline-zero" : "gridline"} />
                <text x="8" y={y + 4} className="axis-label">{`${grid > 0 ? "+" : ""}${(grid / 100).toFixed(1)}`}</text>
              </g>
            );
          })}
          <polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" className="momentum-line" stroke="url(#momentum-gradient)" />
          {points.map((point) => (
            <circle
              key={point.index}
              cx={point.x}
              cy={point.y}
              r={point.index === active ? 8 : hovered === point.index ? 7 : 5}
              className={point.index === active ? "momentum-dot active" : "momentum-dot"}
              onMouseEnter={() => setHovered(point.index)}
              onMouseLeave={() => setHovered(active)}
              onClick={() => onSelect(point.index)}
            />
          ))}
        </svg>
        {focusPoint && (
          <div className="momentum-meta">
            <div className="small">Odak pozisyon</div>
            <strong>{focusPoint.position.move}</strong>
            <div className="settings-line"><span>Eval</span><strong>{evalText(focusPoint.position.evalCp)}</strong></div>
            <div className="settings-line"><span>Salinim</span><strong>{previousPoint ? evalText(swing) : "0.0"}</strong></div>
            <div className="settings-line"><span>Kalite</span><strong>{qLabel(focusPoint.position.quality)}</strong></div>
          </div>
        )}
      </div>
      <div className="momentum-stats">
        <div className="momentum-stat">
          <span className="small">Beyaz zirve</span>
          <strong>{evalText(whitePeak.evalCp)}</strong>
          <span className="tiny">{whitePeak.move}</span>
        </div>
        <div className="momentum-stat">
          <span className="small">Siyah zirve</span>
          <strong>{evalText(blackPeak.evalCp)}</strong>
          <span className="tiny">{blackPeak.move}</span>
        </div>
        <div className="momentum-stat">
          <span className="small">Seçili swing</span>
          <strong>{previousPoint ? evalText(swing) : "0.0"}</strong>
          <span className="tiny">{focusPoint?.position?.move || "-"}</span>
        </div>
      </div>
    </Card>
  );
}


function MoveQualityChart({positions, active, onSelect}) {
  const rows = positions
    .map((position, index) => ({
      position,
      index,
      loss: Math.min(360, Number(position.loss || 0)),
      quality: position.quality || "book",
    }))
    .filter((item) => item.index > 0);

  const maxLoss = Math.max(60, ...rows.map((item) => item.loss));
  const buckets = rows.reduce((acc, item) => {
    acc[item.quality] = (acc[item.quality] || 0) + 1;
    return acc;
  }, {});

  return (
    <Card cls="card-pad move-quality-card">
      <div className="split-head">
        <div>
          <strong>Hamle analiz grafiği</strong>
          <div className="small">Her bar centipawn kaybını ve karar kalitesini gösterir. Tıklayınca tahta o hamleye gider.</div>
        </div>
        <Badge>{rows.length} hamle</Badge>
      </div>

      <div className="quality-buckets">
        {Object.entries(buckets).map(([quality, count]) => (
          <span key={quality} className={`quality-chip quality-${quality}`}>{qLabel(quality)} · {count}</span>
        ))}
      </div>

      <div className="loss-timeline">
        {rows.map(({position, index, loss, quality}) => {
          const height = 14 + (loss / maxLoss) * 92;
          return (
            <button
              key={`${position.ply || index}-${index}`}
              type="button"
              className={cx("loss-bar", `loss-${quality}`, active === index && "active")}
              style={{height: `${height}px`}}
              title={`${position.move} · ${qLabel(quality)} · ${(Number(position.loss || 0) / 100).toFixed(2)} piyon`}
              onClick={() => onSelect(index)}
            >
              <span>{index}</span>
            </button>
          );
        })}
      </div>

      <div className="chart-legend">
        <span><i className="legend-good" /> Sağlıklı karar</span>
        <span><i className="legend-warning" /> Çalışılacak karar</span>
        <span><i className="legend-danger" /> Kritik kırılma</span>
      </div>
    </Card>
  );
}

function MoveDNA({pos}) {
  const loss = Number(pos.loss || 0);
  const risk = {
    blunder: 100,
    mistake: 82,
    wrong: 72,
    missed: 64,
    inaccuracy: 45,
    good: 20,
    excellent: 8,
    best: 3,
    brilliant: 0,
  }[pos.quality] || 25;

  const metrics = [
    ["Hesap", clamp(100 - risk + loss * 0.12, 6, 96)],
    ["Güvenlik", clamp(88 - risk * 0.55, 6, 95)],
    ["Plan", clamp(72 - loss * 0.12, 10, 94)],
    ["İnisiyatif", clamp(58 + Number(pos.evalCp || 0) / 10 - risk * 0.18, 8, 96)],
  ];

  return (
    <Card cls="card-pad">
      <strong>Hamle DNA</strong>
      {metrics.map(([label, value]) => (
        <div key={label} className="metric-row">
          <div className="small metric-head">
            <span>{label}</span>
            <span>{Math.round(value)}</span>
          </div>
          <div className="metric-track">
            <div className="metric-fill" style={{width: `${value}%`}} />
          </div>
        </div>
      ))}
    </Card>
  );
}

function RootCause({pos}) {
  let title = "Karar kalitesi stabil";
  let text = "Bu pozisyonu tekrar havuzunda referans örnek olarak tut.";

  if (pos.quality === "blunder" || Number(pos.loss) >= 220) {
    title = "Taktik güvenlik açığı";
    text = "Şah çekme, alma ve tehdit zincirini oynanmadan önce zorunlu kontrol listesine bağla.";
  } else if (pos.phase === "opening" && Number(pos.loss) >= 60) {
    title = "Açılış koordinasyon sapması";
    text = "Merkez, gelişim ve rok tamamlanmadan erken hücum başlatılmış görünüyor.";
  } else if (pos.quality === "missed") {
    title = "Fırsat dönüştürme problemi";
    text = "Avantajlı pozisyonda en kuvvetli devamı seçmeden güvenli hatta dönülmüş.";
  }

  return (
    <Card cls="card-pad">
      <strong>Kök neden radarı</strong>
      <div className="cause-box">
        <b>{title}</b>
        <p>{text}</p>
      </div>
    </Card>
  );
}

function FocusQueue({positions, onSelect}) {
  const score = (position) => ({
    blunder: 100,
    mistake: 82,
    wrong: 72,
    missed: 64,
    inaccuracy: 45,
  }[position.quality] || 15) + Number(position.loss || 0) / 4;

  const queue = positions
    .map((position, index) => ({position, index, score: score(position)}))
    .filter((item) => item.index > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 4);

  return (
    <Card cls="card-pad">
      <div className="split-head">
        <strong>Bugünün 4 pozisyonu</strong>
        <Badge>{queue.length}</Badge>
      </div>
      <div className="queue-grid">
        {queue.map((item, order) => (
          <button key={item.index} type="button" className="queue-item" onClick={() => onSelect(item.index)}>
            <span>{order + 1}. {item.position.move}</span>
            <strong>{qLabel(item.position.quality)}</strong>
          </button>
        ))}
      </div>
    </Card>
  );
}

function IdeaCard({icon: Icon, title, text}) {
  return (
    <Card cls="card-pad idea-card">
      <div className="idea-icon"><Icon size={18} /></div>
      <strong>{title}</strong>
      <p className="small">{text}</p>
    </Card>
  );
}

function Card({children, cls = ""}) {
  return <div className={`card ${cls}`}>{children}</div>;
}

function Button({children, onClick, cls = "", disabled, title, type = "button"}) {
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`btn ${cls}`} title={title} aria-label={title}>
      {children}
    </button>
  );
}

function Badge({children, cls = ""}) {
  return <span className={`badge ${cls}`}>{children}</span>;
}

createRoot(document.getElementById("root")).render(<App />);
