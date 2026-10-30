# VOC-Market — Etalase Karya Nyata, Paspor Kerja Siswa SMK & Penghubung Industri

**VOC-Market** menghubungkan barang, jasa hasil praktik, dan keahlian siswa SMK langsung ke pembeli nyata (warga, UMKM, dan industri) dengan antarmuka **3-Kolom Tactile 3D** yang ramah awam.

Setiap pesanan pelanggan yang diselesaikan otomatis tercatat secara terverifikasi ke dalam **Paspor Kerja (CV Digital)** siswa lengkap dengan QR Code verifikasi keaslian untuk kebutuhan melamar kerja, magang industri, atau portofolio profesional.

---

## 🛠️ Tech Stack

- **Runtime & Test Runner:** [Bun](https://bun.sh) (`v1.4+`)
- **Backend API, WebSocket & Cron:** [ElysiaJS](https://elysiajs.com) + `@elysiajs/eden` + `@elysiajs/cron`
- **Frontend UI:** [Svelte 5 (Runes Mode)](https://svelte.dev) + [Tailwind CSS v4](https://tailwindcss.com) + Vite 6
- **Database & ORM:** MySQL 8.4 (Laragon / Production) + [Drizzle ORM](https://orm.drizzle.team) (`mysql2`)
- **Design System:** *Tactile 3D Google 4-Color* (`#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`) + Font Poppins + Kanvas Ganda (`bg-gray-50/50` & `bg-[#EEEEEE]`)
- **Image Pipeline & QR Verification:** `sharp` (auto EXIF rotate + resize + WebP) & `qrcode` (SVG)

> Arsip kode Laravel sebelumnya disimpan sebagai referensi baca-saja di folder `_legacy_laravel/`.

---

## 🚀 Fitur yang Tersedia

### 📦 Tier 1 — Inti Transaksi & Paspor Kerja
1. **Katalog Minimalis Ramah Awam (`/`):** Tiga kolom responsif, filter kategori kejuruan & jenis karya (*Barang*, *Jasa & Layanan*, *Portofolio*), pencarian cepat, tanpa distraksi metrik sosial.
2. **Alur Pesanan 1-Layar Tanpa Wajib Daftar Akun + WhatsApp:** Pembeli luar cukup mengisi nama & nomor kontak, mendapatkan halaman pelacakan resmi (`/pesanan/:kode?token=...`), dan otomatis terhubung ke WhatsApp siswa.
3. **Pencatatan Pesanan Masuk Siswa (`/pesanan-masuk`):** Alur kerja terstruktur (*Menunggu Konfirmasi → Diterima → Sedang Dikerjakan → Selesai*), unggah bukti foto hasil kerja, dan pemotongan stok barang otomatis.
4. **Ulasan Pelanggan Terverifikasi & Tag Apresiasi:** Ulasan berizin token pesanan dengan 5 tag apresiasi (*Rapi & Berkualitas*, *Tepat Waktu*, *Ramah & Sopan*, *Harga Sesuai*, *Solutif*).
5. **Panel Supervisi Guru Pembimbing SMK (`/dashboard/guru`):** Verifikasi siswa satu sekolah & stempel kualitas guru (TeFa) dengan catatan rekomendasi pada karya.
6. **Paspor Kerja & CV Digital Siap Cetak A4 (`/paspor-kerja/:username`):** Ringkasan jam terbang proyek nyata, rating kepuasan, karya unggulan TeFa, dan QR Code verifikasi pangkalan data.
7. **Injeksi Meta Open Graph Dinamis:** Tautan karya, profil, sekolah, dan tantangan otomatis memunculkan pratinjau gambar WebP, judul, dan ringkasan saat dibagikan ke WhatsApp.

### 🏢 Tier 2 — Penghubung ke Industri & Komunitas
8. **Papan "Butuh Bantuan" / Permintaan Jasa Pasar (#6) (`/butuh-bantuan`):** Warga & UMKM memposting kebutuhan riil (misal servis kendaraan, cetak kaos, desain logo warung). Siswa mengajukan penawaran harga & estimasi hari. Saat pemosting memilih satu penawaran, otomatis terbit baris *Order* resmi dan penawaran lain ditolak secara elegan. Alamat lengkap dirahasiakan hingga penawaran terpilih.
9. **Tantangan Industri & Sertifikat QR Terverifikasi (#7) (`/tantangan` & `/sertifikat/:code`):** Mitra industri mempublikasikan studi kasus proyek berhadiah uang, magang, atau sertifikat. Total bobot aspek penilaian divalidasi tepat 100%. Karya peserta dirahasiakan sebelum tahap penjurian selesai untuk mencegah plagiarisme. Sertifikat resmi dilengkapi QR Code SVG yang dapat dicek dan diverifikasi langsung keasliannya.
10. **Status "Siap Kerja" & Direktori Pencarian Talenta (#8) (`/siap-kerja` & `/talenta`):** Siswa tingkat akhir / alumni mengaktifkan status siap kerja setelah profil memenuhi checklist perlindungan siswa (sekolah, jurusan, keahlian, dan minimal 1 karya). Perusahaan terverifikasi dapat memfilter kandidat berdasarkan `talentScore` (algoritma gabungan rating, jumlah order selesai, verifikasi guru, dan sertifikat). Nomor kontak siswa terlindungi dan baru terbuka setelah siswa menyetujui undangan kerja (`/undangan`). Guru pembimbing menerima notifikasi saat siswanya diundang.
11. **Etalase Sekolah & Kurasi Unit Produksi TeFa (#9) (`/sekolah` & `/sekolah/:slug`):** Direktori SMK seluruh Indonesia dengan agregasi karya seluruh siswa per sekolah, tab khusus produk unit produksi (Teaching Factory), serta panel kelola profil etalase (`/sekolah/:slug/kelola`) khusus Guru Pembimbing dengan izin Admin Sekolah.
12. **Pusat Notifikasi Live WebSocket (`/notifikasi`):** Pembaruan pesanan, undangan magang, verifikasi mitra, dan sertifikat terkirim seketika (*real-time*) tanpa perlu memuat ulang halaman.
13. **Panel Pengawasan & Moderasi Admin Platform (`/admin`):** 4 pilar pengawasan admin: verifikasi legalitas mitra industri (NIB), verifikasi sekolah SMK, tinjauan persetujuan tantangan industri (`pending_review`), serta penertiban pengaduan warga / pencabutan sertifikat.

### 🌱 Tier 3 — Pembelajaran, Kewirausahaan & Retensi
14. **Bagikan Promosi WhatsApp dengan Kartu Pratinjau 1200×630 WebP (#14):** Generator kartu gambar dinamis WebP 1200×630 via Sharp (memuat foto karya, logo VOC-Market, nama kreator, asal SMK, lencana TeFa, dan harga). Tombol 1-klik bagikan WhatsApp dengan pilihan nada pesan Formal, Santai, atau Promosi Diskon, serta injeksi Open Graph & Schema.org Product/Service JSON-LD.
15. **Asisten Harga & Kalkulator HPP (Harga Pokok Penjualan) (#10):** Komponen interaktif perancangan biaya produksi (Material, Kemasan, Overhead operasional listrik/alat, dan Upah Tenaga Kerja/Jasa). Klasifikasi margin sehat (Rugi, Tipis <15%, Sehat 15-50%, Premium >50%), saran rentang harga jual wajar, serta benchmark kuantil pasar kategori (min, median, p75, max). Data modal HPP dijamin 100% rahasia dari publik/pembeli.
16. **Lokasi Kecamatan & Filter "Dekat Saya" Berbasis Haversine (#12):** Basis data kecamatan seluruh kota/kabupaten dengan formula Haversine untuk kalkulasi jarak radius presisi. Filter satu klik "Dekat Saya" di beranda menyortir karya dan jasa terdekat dari pengunjung tanpa menyimpan koordinat GPS pengunjung ke pangkalan data (privasi penuh).
17. **Sistem Level Kreator 1–4 & 7 Lencana Otomatis (#11):** Penjenjangan kemahiran vokasi gamified (*Kreator Pemula → Kreator Aktif → Kreator Terpercaya → Kreator Profesional*) dengan checklist progres transparan. 7 lencana penghargaan otomatis: `first_project` (Langkah Pertama), `on_time_hero` (Tepat Waktu), `quality_craft` (Karya Berkualitas), `five_star_streak` (Bintang 5 Beruntun), `repeat_trusted` (Langganan Terpercaya), `smart_hpp` (Ahli HPP & Margin), dan `tefa_verified` (Standar Industri TeFa).
18. **Dashboard Penjual Mini Siswa & Lembar Nilai Praktik A4 PKK (#13) (`/dashboard-penjual`):** Meja kerja analitik siswa dengan 4 kartu metrik utama (Omzet Bruto, Modal Pokok HPP, Laba Bersih Usaha, & Pesanan Selesai), grafik tren 14 hari harian, rekomendasi tips pintar, ekspor laporan penjualan ke Microsoft Excel (CSV ber-BOM `\uFEFF`), serta lembar nilai cetak A4 terstandarisasi untuk ujian praktik mata pelajaran PKK (Projek Kreatif dan Kewirausahaan) lengkap dengan kolom tanda tangan guru penguji.

---

## 💻 Panduan Instalasi & Menjalankan

### 1. Prasyarat
- **Bun** terpasang (`bun --version`)
- **MySQL** aktif (mis. melalui **Laragon** di `127.0.0.1:3306`, user `root`, password kosong / sesuaikan di `.env`)

### 2. Inisialisasi Basis Data & Data Awal
```bash
bun install
bun run db:reset
bun run db:seed
```

### 3. Menjalankan Mode Pengembangan (Dev Server)
Menjalankan ElysiaJS API + WebSocket di `http://localhost:3000` dan Vite HMR di `http://localhost:5173`:
```bash
bun run dev
```

### 4. Build Produksi & Menjalankan Server Tunggal
```bash
bun run build
bun run start
```
Aplikasi web siap diakses di `http://localhost:3000`.

### 5. Menjalankan Pengujian Otomatis (Automated Tests)
Pengujian dijalankan pada pangkalan data terisolasi `voc_market_test`:
```bash
bun test
```
*Hasil pengujian Tier 1, Tier 2 & Tier 3: 18 pass, 0 fail, 266 expect() calls across 9 files.*

---

## 🔑 Akun Demo Pengujian

Semua akun demo hasil `bun run db:seed` menggunakan kata sandi: **`password123`**

| Peran | Username | Email | Keterangan / Institusi |
|---|---|---|---|
| **Admin Platform** | `admin_voc` | `admin@voc.id` | Akses penuh Panel Moderasi (`/admin`) |
| **Mitra Industri** | `pt_nusantara` | `kontak@ptnusantara.co.id` | PT Nusantara Solusi Digital (Terverifikasi) |
| **Guru Pembimbing** | `guru_hendra` | `hendra.guru@voc.id` | SMKN 1 Cibinong (Admin Etalase Sekolah) |
| **Guru Pembimbing** | `guru_ratna` | `ratna.guru@voc.id` | SMKN 3 Malang |
| **Siswa SMK (RPL)** | `draz_me` | `andreaz@voc.id` | SMKN 1 Cibinong (Level 3 - Terpercaya, Siap Kerja) |
| **Siswa SMK (Tata Boga)** | `siti_bakery` | `siti@voc.id` | SMKN 3 Malang (Level 2 - Aktif) |
| **Siswa SMK (DKV)** | `maya_art` | `maya@voc.id` | SMKN 4 Yogyakarta (Pemenang Tantangan Industri) |
| **Siswa SMK (Otomotif)** | `budi_tuneup` | `budi@voc.id` | SMKN 5 Surabaya |
| **Warga / UMKM** | `warung_rahmat` | `rahmat@umkm.id` | Kopi & Roti Nusantara (Pemosting Butuh Bantuan) |

---

## 🗺️ Peta Navigasi Rute Aplikasi

| Rute Web | Fungsi Halaman |
|---|---|
| `/` | Beranda Katalog 3-Kolom & Filter "Dekat Saya" |
| `/peluang` | Hub Sentral Peluang (Permintaan Jasa, Tantangan & Talenta) |
| `/butuh-bantuan` | Papan Permintaan Butuh Bantuan (Request Board) |
| `/butuh-bantuan/buat` | Form Buat Permintaan Bantuan Baru (Warga/UMKM) |
| `/butuh-bantuan/:kode` | Rincian Permintaan, Daftar Penawaran Siswa & Penerimaan |
| `/sekolah` | Direktori Etalase Sekolah SMK Seluruh Indonesia |
| `/sekolah/:slug` | Etalase Publik Sekolah, Tab Karya Siswa & Produk TeFa |
| `/sekolah/:slug/kelola` | Panel Pengaturan Etalase Sekolah (Khusus Guru Admin) |
| `/siap-kerja` | Checklist & Pengaturan Status Siap Kerja Siswa |
| `/talenta` | Direktori Cari Talenta Vokasi (Khusus Perusahaan Terverifikasi) |
| `/undangan` | Kotak Masuk Undangan PKL / Magang / Kerja Siswa |
| `/tantangan` | Papan Tantangan & Mini-Kompetisi Industri |
| `/tantangan/buat` | Form Perancangan Tantangan Industri (Mitra Perusahaan) |
| `/tantangan/:slug` | Rincian Tantangan, Kirim Karya & Pengumuman Pemenang |
| `/sertifikat/:kode` | Verifikasi Keaslian Sertifikat Digital Berbasis QR Code |
| `/dashboard-penjual` | Dashboard Penjual Mini Siswa (Omzet, HPP, Margin, Tips & Grafik) |
| `/dashboard-penjual/cetak` | Lembar Nilai Praktik Usaha PKK Siap Cetak A4 |
| `/notifikasi` | Pusat Notifikasi Real-time Pengguna |
| `/admin` | Panel Moderasi & Penertiban Admin Platform |
| `/dashboard/guru` | Supervisi Siswa & Stempel Kualitas Guru (TeFa) |
| `/paspor-kerja/:username` | Paspor Kerja & CV Digital Siswa Siap Cetak A4 + Lencana |
| `/profil/:username` | Profil Publik Siswa / Pengguna + Level & Lencana |
| `/pesanan-masuk` | Meja Kerja Pesanan Siswa |
| `/riwayat-pesanan` | Riwayat Pembelian Produk / Jasa |
