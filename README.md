# Jelajah Pramuka Islamiyah

Dashboard event tracking untuk regu Pramuka dengan tampilan publik, panitia pos, dan pusat kurasi.

## Fitur

- Live tracking regu
- Dasbor publik terpisah untuk kategori, klasemen, dan rekap nilai
- Klasemen putra dan putri
- Dasbor panitia pos
- Dasbor pusat kurasi
- Pemindaian QR regu dengan kamera pada dasbor panitia pos
- QR regu yang hanya dapat ditampilkan dan dicetak oleh pusat kurasi
- Reset seluruh nilai dan riwayat uji coba khusus untuk pusat kurasi
- Checkpoint perjalanan regu berurutan dari check-in/check-out Pos 1 sampai finish
- Penyimpanan data persisten di MongoDB Atlas

## Local Development

```bash
npm install
npm start
```

Akses aplikasi di http://localhost:8000

## Environment Variables

Copy `.env.example` ke `.env` dan isi nilai MongoDB URL Anda. MongoDB wajib tersedia; aplikasi tidak menggunakan file lokal sebagai fallback.

```bash
copy .env.example .env
```

Autentikasi panitia memerlukan `AUTH_ACCOUNTS` (JSON berisi tepat 2 akun `center` dan 4 akun `pos`) serta `AUTH_TOKEN_SECRET` (random secret minimal 32 karakter). Akun pos harus ditugaskan ke pos yang berbeda menggunakan properti `pos` bernilai 1-4 atau username seperti `pos-1`; akun hanya dapat mengisi nilai dan checkpoint pada pos penugasannya. Setiap akun harus memiliki username dan password unik/kuat. Jangan commit `.env` atau menyimpan credential di frontend.

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

Endpoint penilaian dan checkpoint hanya menerima akun `pos`; endpoint persetujuan/revisi, pengelolaan nama regu dan anggota (`PATCH /api/teams/details`), QR regu, dan reset hanya menerima akun `center`. Nama dan daftar anggota regu dapat dilihat semua pengunjung dari menu Daftar Regu, tetapi hanya akun pusat yang dapat mengubahnya. Checkpoint setiap regu wajib berurutan: masuk lalu keluar pada Pos 1, 2, 3, dan 4. Reset menghapus nilai pos, riwayat input, antrean kurasi, dan progres checkpoint serta mengembalikan semua regu ke status menunggu check-in Pos 1. Pemindaian kamera memerlukan HTTPS (tersedia di Vercel) atau localhost, serta izin kamera dari browser.
Sesi login disimpan di browser lintas tab dan berlaku selama 12 jam, atau sampai panitia keluar secara manual.

Saat database MongoDB masih kosong, aplikasi mengimpor `data.json` satu kali sebagai data awal. Setelah itu, MongoDB menjadi satu-satunya sumber baca dan tulis. Jika MongoDB tidak dapat dihubungi atau `MONGODB_URI` tidak dikonfigurasi, endpoint data akan mengembalikan error dan tidak menulis ke file lokal.
