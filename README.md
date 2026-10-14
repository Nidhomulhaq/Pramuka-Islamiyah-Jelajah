# Jelajah Pramuka Islamiyah

Dashboard event tracking untuk regu Pramuka dengan tampilan publik, panitia pos, dan pusat kurasi.

## Fitur

- Live tracking regu
- Dasbor publik terpisah untuk kategori, klasemen, dan rekap nilai
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

Autentikasi panitia memerlukan `AUTH_ACCOUNTS` (JSON berisi tepat 2 akun `center` dan 4 akun `pos`) serta `AUTH_TOKEN_SECRET` (random secret minimal 32 karakter). Setiap akun harus memiliki username dan password unik/kuat. Jangan commit `.env` atau menyimpan credential di frontend.

## Deploy ke Vercel

1. Push repo ke GitHub
2. Import project di Vercel
3. Set environment variables:
   - `MONGODB_URI`
   - `MONGODB_DB`
   - `MONGODB_COLLECTION`
   - `AUTH_ACCOUNTS`
   - `AUTH_TOKEN_SECRET`
4. Deploy

Endpoint penilaian hanya menerima akun `pos`; endpoint persetujuan/revisi hanya menerima akun `center`.
Sesi login disimpan di browser lintas tab dan berlaku selama 12 jam, atau sampai panitia keluar secara manual.

## Catatan

Jika `MONGODB_URI` belum tersedia, aplikasi tetap berjalan dengan data lokal di `data.json`.
