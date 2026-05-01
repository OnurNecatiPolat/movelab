# PostgreSQL Windows Kurulumu

MoveLab icin onerilen SQL server PostgreSQL 16 veya 17'dir.

## 1. Ne indirilmeli

- Resmi PostgreSQL Windows installer
- Istersen pgAdmin da kurulu gelsin

Indirme noktasi:

- [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)

## 2. Kurulum sirasinda ne secilmeli

Kurulum ekraninda su secimler yeterli:

- PostgreSQL Server
- Command Line Tools
- pgAdmin 4

Kurulum sirasinda:

- Port: `5432`
- Superuser: `postgres`
- Guclu bir sifre belirle ve not et

## 3. Yeni database ve uygulama kullanicisi olustur

Kurulum bitince `SQL Shell (psql)` veya pgAdmin ac.

`psql` ile en hizli akis:

```sql
CREATE USER movelab WITH PASSWORD 'ChangeThisPassword';
ALTER USER movelab CREATEDB;
CREATE DATABASE movelab OWNER movelab;
```

## 4. Proje `.env` dosyasini ayarla

`C:\MoveLabFresh\.env` dosyasina su satiri koy:

```text
MOVELAB_DATABASE_URL=postgresql+psycopg://movelab:ChangeThisPassword@127.0.0.1:5432/movelab
```

Istersen asagidaki satirlari da kullan:

```text
MOVELAB_CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
STOCKFISH_PATH=tools/stockfish/stockfish.exe
MOVELAB_BILLING_PROVIDER=manual
MOVELAB_BILLING_PORTAL_URL=
MOVELAB_BILLING_SUPPORT_EMAIL=billing@movelab.local
```

## 5. Baglantiyi test et

```powershell
cd C:\MoveLabFresh
powershell -ExecutionPolicy Bypass -File .\scripts\windows_check_backend.ps1
```

Dogruysa JSON cikisinda sunlari goreceksin:

- `"status": "ok"`
- `"backend": "postgresql"`

## 6. Uygulamayi baslat

Backend:

```powershell
cd C:\MoveLabFresh
powershell -ExecutionPolicy Bypass -File .\scripts\windows_run_backend.ps1
```

Frontend:

```powershell
cd C:\MoveLabFresh
powershell -ExecutionPolicy Bypass -File .\scripts\windows_run_frontend.ps1
```

## 7. Sonraki profesyonel adimlar

Local PostgreSQL tamamlandiktan sonra global tasimada en temiz yonler:

1. Managed PostgreSQL: Neon, Supabase, Railway Postgres, Render Postgres, AWS RDS
2. Backend deployment: Fly.io, Render, Railway, Azure App Service, AWS ECS
3. Frontend deployment: Vercel, Netlify, Cloudflare Pages
4. Secret management: production `MOVELAB_DATABASE_URL`, billing keys, session secrets
5. Domain + HTTPS + backup + monitoring

## 8. Not

SQLite fallback halen destekleniyor, ama piyasaya cikacak surum icin hedefin PostgreSQL olmali.
