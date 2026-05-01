# MoveLab Coach Pro Update — GitHub / Vercel / Railway Entegrasyonu

Bu paket mevcut kod tabanına uygulanacak kaynak güncellemedir. Bağlantı mimarisi korunur:

- Frontend: Vercel
- Backend: Railway
- Repository: GitHub

## 1. Lokal repoya kopyala

```bash
cd /path/to/movelab
cp -R /path/to/MoveLab_coach_pro_update/backend/app ./backend/
cp -R /path/to/MoveLab_coach_pro_update/frontend/src ./frontend/
cp /path/to/MoveLab_coach_pro_update/backend/requirements.txt ./backend/requirements.txt
```

## 2. Test

Backend:

```bash
cd backend
python -m compileall app scripts
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run build
```

## 3. GitHub'a gönder

```bash
git checkout -b coach-pro-update
git add backend frontend INTEGRATION_DEPLOY.md
git commit -m "Add coach pro summary, new-game sync, batch deep analysis, and polished charts"
git push origin coach-pro-update
```

Sonra GitHub'da Pull Request açıp main branch'e merge et.

## 4. Railway backend

Railway değişkenlerini bozma. Kritik env:

```text
DATABASE_URL
STOCKFISH_PATH
ALLOWED_ORIGINS
CHESSCOM_USER_AGENT
```

Deploy otomatik değilse Railway panelinden redeploy çalıştır.

Yeni endpoint'ler:

```text
POST /api/import/chesscom       # new_only varsayılan true
POST /api/games/analyze-all     # parça parça tüm oyunları derin analiz eder
GET  /api/coach/summary         # win/loss ve çalışma reçetesi
```

## 5. Vercel frontend

Vercel env değişkeni korunmalı:

```text
VITE_API_BASE=https://movelab-production-f81c.up.railway.app
```

Deploy otomatik değilse Vercel'de redeploy çalıştır.

## 6. Kullanım akışı

1. Studio > Sadece yeni oyunları çek
2. Studio > Yeni oyunları çek + derin analiz et
3. Review > Koç özeti, win/lose, çalışma reçetesi
4. Momentum map ve hamle analiz grafiği üzerinden kritik hamlelere tıkla

## Not

Railway request timeout riskini azaltmak için toplu analiz parça parça çalışır. Kalan hamle varsa butona tekrar basmak devam ettirir; eski analizler silinmez.
