# MoveLab Review Studio

MoveLab is a production-oriented chess review workspace. It imports PGN and Chess.com games, runs multi-pass Stockfish review, shows a cleaner momentum map with exact eval landmarks, ships with a dedicated auth drawer, and includes a billing surface that is ready for a real provider later.

## What changed

- PostgreSQL-first backend configuration via `MOVELAB_DATABASE_URL`
- SQLAlchemy data layer with server-ready models
- Separate auth panel for login/register/account state
- Stronger review workspace with variant mode, board actions, and clearer move quality surfaces
- Momentum card now shows exact eval focus, swing, white peak, and black peak
- Billing catalog and checkout-intent placeholders wired without locking you into a payment provider yet

## Stack

- Backend: FastAPI, SQLAlchemy, PostgreSQL-ready config, python-chess, Stockfish
- Frontend: React, Vite, framer-motion, lucide-react
- Local fallback database: `backend/data/movelab.sqlite`
- Recommended database for launch: PostgreSQL 16+

## Quick start

1. Copy `.env.example` to `.env`
2. If you want launch-grade local setup, install PostgreSQL and set `MOVELAB_DATABASE_URL`
3. Check backend:

```powershell
cd C:\MoveLabFresh
powershell -ExecutionPolicy Bypass -File .\scripts\windows_check_backend.ps1
```

4. Start backend:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows_run_backend.ps1
```

5. In a second terminal, start frontend:

```powershell
cd C:\MoveLabFresh
powershell -ExecutionPolicy Bypass -File .\scripts\windows_run_frontend.ps1
```

## URLs

- App: `http://127.0.0.1:5173`
- Backend health: `http://127.0.0.1:8000/api/health`
- API docs: `http://127.0.0.1:8000/docs`

## Cloud deploy

Cloud frontend, backend, PostgreSQL, Stockfish and APK API-base setup:

- [README_CLOUD_DEPLOY.md](README_CLOUD_DEPLOY.md)

## PostgreSQL setup

Windows step-by-step guidance lives here:

- [README_POSTGRESQL_WINDOWS.md](README_POSTGRESQL_WINDOWS.md)

The app will still run with SQLite if `MOVELAB_DATABASE_URL` is not set, but SQLite should be treated as a local fallback, not as the launch target.

## Stockfish

Recommended location:

```text
tools\stockfish\stockfish.exe
```

You can also set `STOCKFISH_PATH` in `.env`.

## Import workflows

Demo import:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows_import_demo.ps1
```

Chess.com sync:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows_sync_chesscom.ps1 -Username CaarlsenKaybediyoo -Archives 2
```

## Payment boundary

Billing pages, plan catalog, and checkout-intent placeholders are included.
Real payment methods, tax logic, invoicing, and provider credentials are intentionally left for your later integration step.
