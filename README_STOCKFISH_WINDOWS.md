# Stockfish Windows Notları

MoveLab, Stockfish'i aşağıdaki sırayla arar:

1. `STOCKFISH_PATH` ortam değişkeni
2. Sistem `PATH` içindeki `stockfish` veya `stockfish.exe`
3. `tools\stockfish\stockfish.exe`
4. Yaygın Windows kurulum yolları

Önerilen yerel kurulum:

```text
C:\MoveLabFresh\tools\stockfish\stockfish.exe
```

Kontrol komutu:

```powershell
cd C:\MoveLabFresh
powershell -ExecutionPolicy Bypass -File .\scripts\windows_find_stockfish.ps1
```

Geçici ortam değişkeni:

```powershell
$env:STOCKFISH_PATH = "C:\tam\yol\stockfish.exe"
```

Kalıcı proje ayarı için `.env.example` dosyasını `.env` olarak kopyalayıp `STOCKFISH_PATH` değerini düzenle.
