# Coach Pro Kontrol Listesi

## Backend local

```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Kontrol:

```text
http://127.0.0.1:8000/api/health
http://127.0.0.1:8000/api/coach/summary
```

## Frontend local

```bash
cd frontend
npm install
npm run dev
```

## Özellik testi

1. Studio/Review'de `Sadece yeni oyunları çek`.
2. Aynı butona tekrar bas.
3. `skipped_existing` değerinin arttığını, eski analizlerin silinmediğini kontrol et.
4. `Tüm oyunları derin analiz et`.
5. `Profesyonel Koç Özeti` kartının win/loss/focus/study plan verdiğini kontrol et.
6. Momentum grafiğinde hamle seç.
7. Hamle analiz grafiğinde bar'a tıkla, tahta ilgili hamleye gitmeli.
