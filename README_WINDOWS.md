# MoveLab Windows Kurulumu

## 1. `.env` olustur

`.env.example` dosyasini `.env` olarak kopyala. Uretim benzeri yerel kurulum icin once PostgreSQL tarafini ayarlaman tavsiye edilir.

En kritik ayar:

```text
MOVELAB_DATABASE_URL=postgresql+psycopg://movelab:ChangeThisPassword@127.0.0.1:5432/movelab
```

Detayli PostgreSQL kurulum adimlari:

- [README_POSTGRESQL_WINDOWS.md](README_POSTGRESQL_WINDOWS.md)

## 2. Backend kontrolu

```powershell
cd C:\MoveLabFresh
powershell -ExecutionPolicy Bypass -File .\scripts\windows_check_backend.ps1
```

Bu komut sanal ortami hazirlar, Python paketlerini kurar, database baglantisini dener ve Stockfish durumunu raporlar.

## 3. Backend'i baslat

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows_run_backend.ps1
```

Backend:

```text
http://127.0.0.1:8000
```

## 4. Frontend'i baslat

Ayri bir PowerShell penceresinde:

```powershell
cd C:\MoveLabFresh
powershell -ExecutionPolicy Bypass -File .\scripts\windows_run_frontend.ps1
```

Frontend:

```text
http://127.0.0.1:5173
```

## 5. Opsiyonel veri importu

Demo oyun:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows_import_demo.ps1
```

Chess.com arsiv sync:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows_sync_chesscom.ps1 -Username CaarlsenKaybediyoo -Archives 2
```

## 6. Stockfish

Onerilen konum:

```text
C:\MoveLabFresh\tools\stockfish\stockfish.exe
```

Kontrol:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows_find_stockfish.ps1
```

Farkli bir konum kullanacaksan `.env` icinde `STOCKFISH_PATH` ayarla.
