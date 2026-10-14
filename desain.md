# Rancangan Desain Sistem Website Jelajah Pramuka Islamiyah

## 1. Arsitektur dan Basis Data

* **Front-end (Tampilan Visual):** HTML, CSS, dan JavaScript murni (Vanilla JS) dengan desain ringan dan responsif.
* **Backend (API):** Vercel Serverless Functions (Node.js) sebagai REST API untuk menjembatani antara *front-end* dan *database* secara aman.
* **Database:** **MongoDB (MongoDB Atlas)**. Basis data NoSQL ini dipilih agar sistem mampu memproses data *real-time* dengan cepat dan mencegah tabrakan data (*data collision*) saat banyak pos melakukan pemindaian QR Code di detik yang sama.
* **Deployment (Hosting):** Vercel (Mengelola *hosting* web statis sekaligus *serverless functions* dalam satu tempat).
* **Tema Visual:** **Kuning Kecokelatan Sedikit Tua** (nuansa khas seragam Pramuka, perpaduan warna Khaki gelap dan Cokelat kayu).

## 2. Data Master Regu Peserta

Peserta dibagi menjadi dua kategori dengan klasemen penilaian yang terpisah. Masing-masing regu akan memiliki QR Code unik (misal: `PUTRA_BEBEK`, `PUTRI_ANGGREK`).

* **Kategori Putra (5 Regu):**
  1. Regu Bebek
  2. Regu Kupu-Kupu
  3. Regu Garuda
  4. Regu Tokek
  5. Regu Jerapah

* **Kategori Putri (5 Regu):**
  1. Regu Kamboja
  2. Regu Anggrek
  3. Regu Pompom
  4. Regu Lavender
  5. Regu Kenikir

## 3. Struktur Halaman dan Peran Dasbor (Dashboard)

Sistem akan dibagi menjadi 3 antarmuka (UI) utama dengan hak akses yang berbeda:

### A. Halaman Publik (Tanpa Login)
Halaman ini dapat diakses oleh peserta, penonton, atau wali peserta untuk memantau acara secara *real-time*.

* **Beranda & Peta Status (Live Tracking):** Menampilkan daftar seluruh Regu (Putra & Putri) beserta status perjalanannya secara langsung (terkoneksi dengan sistem QR Code).
* **Klasemen Sementara:** Menampilkan peringkat skor Regu yang dipisah menjadi dua tabel:
  * **Tabel Klasemen Regu Putra**
  * **Tabel Klasemen Regu Putri**
  * *Catatan:* Hanya nilai yang sudah dikurasi (disetujui) oleh Panitia Pusat yang akan ditambahkan ke total skor. Jika nilai belum disetujui, pada kolom nilai akan tertulis **"Menunggu Kurasi"**.
* **Rekap Nilai Detail:** Tabel rincian nilai masing-masing Regu di Pos 1, 2, 3, dan 4 (juga dipisah antara Putra dan Putri).

### B. Dasbor Panitia Pos (Membutuhkan PIN/Password)
Diakses oleh panitia pos melalui *smartphone* mereka.

* **Pemindai QR Code (QR Scanner):** Kamera web terintegrasi untuk melakukan *Check Point Masuk* dan *Check Point Keluar* bagi setiap Regu.
* **Formulir Input Nilai:** Muncul setelah *Check Point Masuk*. Terdiri dari kolom input nilai berdasarkan kriteria pos terkait.
* **Riwayat Input:** Menampilkan daftar Regu yang sudah dinilai beserta status kurasinya.

### C. Dasbor Panitia Pusat (Membutuhkan PIN/Password Admin Utama)
Diakses oleh admin pusat.

* **Meja Kurasi (Approval Desk):** Menampilkan antrean nilai yang masuk dari semua pos secara *real-time*.
* **Aksi Kurasi:** Tombol **[Setujui]** (untuk langsung menayangkan nilai ke publik) atau **[Revisi/Tolak]** (jika ada indikasi nilai tidak wajar).
* **Kendali Status (Manual Override):** Fitur bagi admin untuk mengedit status/lokasi regu secara manual jika ada kendala pemindaian.

## 4. Kriteria Penilaian Per Pos

* **Pos 1 (Pemberangkatan):**
  1. Kelengkapan barang bawaan/regu.
  2. Kekompakan Yel-yel.

* **Pos 2 (Menghafal Dasa Dharma):**
  1. Ketepatan hafalan.
  2. Kelancaran penyampaian.

* **Pos 3 (PBB - Peraturan Baris Berbaris):**
  1. Keserasian gerakan.
  2. Kesesuaian gerakan dengan Perpang (Peraturan Panglima).
  3. Ketepatan pemberian aba-aba (Danton Regu).

* **Pos 4 (Jurnal Penjelajahan dan Finish):**
  1. Kreativitas penulisan jurnal/laporan.
  2. Keteraturan dan kerapian penulisan.

## 5. Alur Pemindaian QR Code (Sistem Check Point)

1. **Regu Tiba di Pos (Check-in):**
   * Panitia Pos memindai QR Code dengan mode **"Masuk"**.
   * *Halaman Publik* otomatis menampilkan status: **"Sedang melakukan tugas di Pos [X]"**.
2. **Pelaksanaan & Penilaian:**
   * Panitia Pos menginput nilai. Data masuk ke MongoDB dengan status `Pending`.
3. **Regu Selesai (Check-out):**
   * Panitia Pos memindai QR Code dengan mode **"Keluar"**.
   * Status Regu di *Halaman Publik* berubah menjadi: **"Sedang ke Pos [X+1]"**.
4. **Tiba di Finish:**
   * Saat *Check-out* di Pos 4, status berubah menjadi **"Selesai (Finish)"**.

## 6. Alur Kurasi Nilai

1. Nilai diinput di **Dasbor Pos** -> API menyimpannya di MongoDB (Status: `Pending`).
2. Di **Halaman Publik**, nilai regu tampil sebagai *"Menunggu Kurasi"*.
3. Di **Dasbor Pusat**, Panitia Pusat meninjau dan menekan **"Setujui"**.
4. API mengubah status di MongoDB menjadi `Approved`.
5. Di **Halaman Publik**, nilai disahkan dan sistem mengalkulasi ulang peringkat Klasemen (Putra/Putri) secara otomatis.