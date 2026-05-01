# MoveLab Cloud Deploy

Bu rehber authorization/giris provider entegrasyonu ve odeme provider entegrasyonu disindaki cloud gecisini kapsar.

Hedef mimari:

```text
Web Frontend  ->  Backend API  ->  PostgreSQL
APK           ->  Backend API  ->  Stockfish
```

## 1. Backend API

Onerilen ilk yol: Railway.

Backend klasoru cloud deploy icin hazirlandi:

- `backend/Dockerfile`
- `backend/railway.toml`
- `backend/render.yaml`

Railway ayarlari:

```text
Root Directory: backend
Builder: Dockerfile
Healthcheck: /api/health
```

Gerekli environment variables:

```text
MOVELAB_DATABASE_URL=postgresql+psycopg://...
MOVELAB_CORS_ORIGINS=https://movelab.app,https://www.movelab.app,https://localhost,capacitor://localhost
STOCKFISH_PATH=/usr/games/stockfish
CHESSCOM_USER_AGENT=MoveLab/0.8 cloud-training-app contact: support@movelab.app
MOVELAB_DEPTH=12
MOVELAB_DEEP_DEPTH=16
MOVELAB_ENGINE_TIME=0.45
MOVELAB_DEEP_ENGINE_TIME=0.80
```

Railway backend servisine root `.env.example` dosyasini topluca import etme. O dosyada local Windows gelistirme degerleri vardir; Railway'de `127.0.0.1`, `tools/stockfish/stockfish.exe` veya `VITE_API_BASE` backend variable'i olarak kalmamalidir.

Backend public URL ornegi:

```text
https://movelab-api.up.railway.app
```

Deploy sonrasi kontrol:

```text
https://movelab-api.up.railway.app/api/health
```

## 2. PostgreSQL

Railway Postgres, Neon, Supabase veya Render PostgreSQL kullanabilirsin.

Backend sadece su degere ihtiyac duyar:

```text
MOVELAB_DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:PORT/DB
```

## 3. Frontend Web

Frontend klasoru Vercel ve Netlify icin hazirlandi:

- `frontend/vercel.json`
- `frontend/netlify.toml`
- `frontend/.env.production.example`

Vercel ayarlari:

```text
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
Environment: VITE_API_BASE=https://movelab-api.up.railway.app
```

Netlify ayarlari:

```text
Base directory: frontend
Build command: npm run build
Publish directory: frontend/dist
Environment: VITE_API_BASE=https://movelab-api.up.railway.app
```

## 4. APK Global API

Backend cloud URL hazir oldugunda APK'yi artik yerel IP ile degil HTTPS API ile uret:

```powershell
cd C:\MoveLabFresh
powershell -ExecutionPolicy Bypass -File .\scripts\windows_build_apk_cloud.ps1 -ApiBase "https://movelab-api.up.railway.app"
```

APK yolu:

```text
C:\MoveLabFresh\frontend\android\app\build\outputs\apk\debug\app-debug.apk
```

## 5. Kapsam Disi Birakilanlar

Bu paket su entegrasyonlari bilerek yapmaz:

- OAuth / Google / Apple / Chess.com giris entegrasyonu
- Odeme provider entegrasyonu
- Kart, vergi, fatura, abonelik tahsilati

Mevcut local hesap sistemi ve billing placeholder ekranlari korunur.

## 6. Yayina Hazirlik Kontrol Listesi

1. Backend deploy edildi.
2. `/api/health` `status: ok` donuyor.
3. Database backend `postgresql` gorunuyor.
4. Stockfish `available: true` gorunuyor.
5. Frontend `VITE_API_BASE` cloud API'yi gosteriyor.
6. `MOVELAB_CORS_ORIGINS` frontend domainini ve Capacitor originlerini iceriyor.
7. APK HTTPS API ile yeniden build edildi.
