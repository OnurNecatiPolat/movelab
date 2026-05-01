# MoveLab Coach Pro — Uygula / Push / Deploy

Bu paket, yüklediğin mevcut MoveLab kaynağının üstüne şu değişiklikler uygulanmış halidir:

- İnsansı koç dili
- Sadece yeni oyunları çekme
- Eski oyunları tekrar import edip analizleri silmeme
- Yeni oyunları çek + derin analiz akışı
- Tüm oyunları parça parça derin analiz endpoint'i
- Win / lose / draw / win-rate koç özeti
- Çalışma reçetesi ve kritik pozisyon listesi
- Momentum haritası ve hamle analiz grafiği iyileştirmeleri

## Benim doğrudan yapamadığım tek kısım

GitHub, Vercel ve Railway hesabına senin adına login olup push/redeploy yapamam. Bu paket ise doğrudan push'a hazırdır.

## En temiz entegrasyon

Yerel repo klasöründe:

```bash
cd /path/to/movelab
```

Bu paketten gelen dosyaları repo içine kopyala veya bu paketi direkt repo olarak kullan.

Sonra:

```bash
git status
git checkout -b coach-pro-update
git add backend frontend README.md INTEGRATION_DEPLOY.md DEPLOY_COACH_PRO_NOW.md VERSION.txt railway.toml .env.example .gitignore
git commit -m "Add Coach Pro review, new-game sync, batch deep analysis, and polished charts"
git push origin coach-pro-update
```

GitHub'da PR açıp main'e merge et.

Eğer Vercel ve Railway GitHub'a bağlıysa merge/push sonrası deploy zinciri otomatik çalışır.

## Vercel env

Frontend için mevcut bağlantıyı koru:

```text
VITE_API_BASE=https://movelab-production-f81c.up.railway.app
```

## Railway env

Backend için en az şunlar kalsın:

```text
DATABASE_URL
STOCKFISH_PATH
ALLOWED_ORIGINS
CHESSCOM_USER_AGENT
```

## Yeni API endpointleri

```text
POST /api/import/chesscom
POST /api/games/analyze-all
GET  /api/coach/summary
```

## Frontend'deki yeni akış

Studio / Review tarafında:

```text
Sadece yeni oyunları çek
Yeni oyunları çek + derin analiz et
Tüm oyunları derin analiz et
Profesyonel Koç Özeti
Momentum Map
Hamle Analiz Grafiği
```
