# MoveLab Clean Mobile UI Fix

Bu paket, Coach Pro sürümünün arayüzünü sadeleştirir ve mobil uyumlu hale getirir.

## Ne değişti?

- Auth / billing / karmaşık dashboard panelleri ana arayüzden kaldırıldı.
- Ana navigasyon üç sekmeye indirildi: Review, Oyunlar, Koç.
- Review ekranı sadeleştirildi: oyun başlığı, tahta, notasyon, koç notu, grafikler.
- Momentum haritası ve hamle kalitesi grafiği üst tarafa, okunur bir kart içine alındı.
- Mobilde tek kolon düzeni kullanıldı.
- Koç tavsiyeleri kısaltıldı, daha insansı ve daha uygulanabilir hale getirildi.
- “Sadece yeni oyunları çek” butonu korundu.
- “Yeni oyunları çek + analiz et” ve “Tüm oyunları derin analiz et” akışları korundu.
- Backend endpointleri değiştirilmedi; Vercel/Railway bağlantısı kırılmaz.

## Uygulama

Mevcut repo klasöründe:

```powershell
cd C:\MoveLabRepo
git checkout -B clean-mobile-ui-fix
```

Bu paketin içeriğini repo üzerine kopyala. Sonra:

```powershell
git add backend frontend CLEAN_UI_FIX_README.md
git commit -m "Simplify review UI and improve human coach advice"
git push -u origin clean-mobile-ui-fix
```

GitHub'da PR aç:

```text
base: main
compare: clean-mobile-ui-fix
```

Önce preview deploy test et, sonra merge et.

## Kontrol

- Frontend açılıyor mu?
- Mobilde taş/tahta oranı düzgün mü?
- Review sekmesinde grafikler yukarıda mı?
- Koç notları kısa ve insansı mı?
- Yeni oyunları çek butonu eski oyunları çoğaltmadan çalışıyor mu?
