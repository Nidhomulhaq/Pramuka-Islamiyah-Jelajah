# Jelajah Pramuka Islamiyah

Dashboard event tracking untuk regu Pramuka dengan tampilan publik, panitia pos, dan pusat kurasi.

## Fitur

- Live tracking regu
- Klasemen putra dan putri
- Dasbor panitia pos
- Dasbor pusat kurasi
- Simulasi scanner QR dan override manual
- Penyimpanan data via MongoDB Atlas dengan fallback ke file JSON lokal

## Local Development

```bash
npm install
npm start
```

Akses aplikasi di http://localhost:8000

## Environment Variables

Copy `.env.example` ke `.env` dan isi nilai MongoDB URL Anda.

```bash
copy .env.example .env
```

## Deploy ke Vercel

1. Push repo ke GitHub
2. Import project di Vercel
3. Set environment variables:
   - `MONGODB_URI`
   - `MONGODB_DB`
   - `MONGODB_COLLECTION`
4. Deploy

## Catatan

Jika `MONGODB_URI` belum tersedia, aplikasi tetap berjalan dengan data lokal di `data.json`.
