# 00 — Master Contract & Anti-Hallucination Rules (VOC-Market)

> **WAJIB DIBACA OLEH AGENT SEBELUM MENULIS KODE APAPUN.**
> Dokumen ini mengunci fakta lingkungan lokal, versi teknologi, sintaks wajib, aturan keamanan, dan sistem desain minimalis agar tidak terjadi halusinasi lintas stack atau pencampuran pola lama (Laravel/Svelte 4/Tailwind v3).

---

## 1. Fakta Lingkungan Lokal (Terverifikasi)

| Komponen | Nilai Pasti di Mesin Ini | Catatan Penting |
|---|---|---|
| **OS & Shell** | Windows (PowerShell) | Gunakan path separator aman (`node:path` `join`/`resolve`), jangan hardcode `/tmp`. |
| **Runtime** | **Bun `1.4.4`** (`bun` tersedia di `PATH`) | Gunakan `bun install`, `bun run`, `bun test`. **DILARANG** menjalankan `php`, `composer`, atau `npm`. |
| **Database Engine** | **MySQL `8.4.3` (Laragon)** | Berjalan aktif di `127.0.0.1:3306`. |
| **MySQL CLI Path** | `C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysql.exe` | Gunakan binary ini jika perlu menjalankan perintah SQL administratif via CLI. |
| **Kredensial MySQL** | `host: 127.0.0.1`, `port: 3306`, `user: root`, `password: ""` | Simpan di `.env` (`DATABASE_URL="mysql://root@127.0.0.1:3306/voc_market"`). |
| **Database Dev vs Test** | Dev: `voc_market` \| Test: `voc_market_test` | **`bun test` WAJIB memakai `voc_market_test`** agar tidak pernah menghapus data development di `voc_market`. |
| **Kondisi Awal DB `voc_market`** | Saat ini berisi tabel POS lama yang kosong (`accounts`, `sales`, `retails`, dll., 0 baris di `users` & `products`) | Pada setup awal Tier 1 (`bun run db:reset`), bersihkan tabel POS warisan tersebut dan bangun skema bersih Drizzle. |
| **Arsip Kode Lama** | Folder `_legacy_laravel/` | **READ-ONLY.** Hanya dipakai untuk menyalin aset gambar logo (`_legacy_laravel/public/voc-logo.png` & `_legacy_laravel/public/voc-market/dist/image/*.png`) atau melihat referensi bisnis. **DILARANG** mengedit file di dalam `_legacy_laravel/`. |

---

## 2. Aturan Ketat Tech Stack (Anti-Halusinasi Sintaks)

### 2.1. Backend: Bun + ElysiaJS
1. **Satu Server Terpadu:**
   - Di mode *production* (`bun run start`), **ElysiaJS** melayani:
     - `/api/*` → REST API JSON (tervalidasi dengan `Elysia.t` TypeBox).
     - `/ws` → WebSocket real-time (Tier 2+).
     - `/uploads/*` → File gambar WebP hasil unggahan pengguna (`public/uploads/`).
     - Route halaman publik (`/karya/:id`, `/paspor-kerja/:username`, `/sekolah/:slug`, `/sertifikat/:code`, `/tantangan/:slug`) → Membaca `dist/index.html` dan menyuntikkan tag `<meta property="og:*">` dinamis dari MySQL sebelum dikirim ke browser/crawler WhatsApp.
     - Fallback `/*` → SPA `dist/index.html` & aset statis Vite.
   - Di mode *development* (`bun run dev`), server Elysia berjalan di port `3000` dan Vite dev server Svelte berjalan di port `5173` dengan proxy `/api`, `/uploads`, dan `/ws` ke `http://127.0.0.1:3000`.
2. **Hashing Password:**
   - Gunakan API native Bun:
     - Hash: `await Bun.password.hash(plain, { algorithm: 'bcrypt', cost: 10 })`
     - Verify: `await Bun.password.verify(plain, hashed)`
   - **DILARANG** menginstal `bcrypt` C++ addon atau `bcryptjs` tambahan yang tidak perlu.
3. **Autentikasi Session:**
   - Gunakan **HTTP-Only Cookie Session** (`voc_session`) yang disimpan di tabel MySQL `sessions` (token random 64-hex di-hash SHA-256 di DB, `httpOnly: true`, `sameSite: 'lax'`, `path: '/'`).
   - **DILARANG** menyimpan token auth di `localStorage` (rentan pencurian token via XSS).
4. **Pemrosesan Gambar:**
   - Gunakan package **`sharp`** untuk semua upload gambar: wajib `.rotate()` (auto-orient EXIF kamera HP), `.resize({ width: 1280, withoutEnlargement: true })`, dan `.webp({ quality: 88 })`.
   - Validasi MIME type (`image/jpeg`, `image/png`, `image/webp`) dan ukuran maksimal (`5 MB` untuk karya/bukti, `3 MB` untuk avatar) **sebelum** diproses `sharp`.

### 2.2. Database: MySQL 8.4 + Drizzle ORM
1. Gunakan **`drizzle-orm/mysql-core`** dan **`drizzle-orm/mysql2`** dengan pool dari **`mysql2/promise`**.
2. **DILARANG KERAS** mengimpor `pg-core` (PostgreSQL) atau `sqlite-core` (SQLite).
3. Semua kolom harga/uang (`price`, `cost_price`, `price_min`, `price_max`, `agreed_price`, `offered_price`, `unit_cost_snapshot`) menggunakan `bigint(..., { mode: 'number', unsigned: true })` dalam satuan **Rupiah penuh (integer)** atau `decimal(..., { precision: 15, scale: 2 })` yang dikonversi konsisten ke `number` di service layer agar tidak terjadi bug string concatenation (`"50000.00" + 1000`). **Standar proyek ini: gunakan `bigint` unsigned (satuan Rupiah bulat, misal `55000`) untuk semua nominal Rupiah** karena Rupiah transaksi UMKM/SMK tidak memakai sen pecahan dan bebas dari *floating-point rounding error*!
4. Selalu gunakan `db.transaction(async (tx) => { ... })` untuk operasi multi-tabel (misal: menyelesaikan pesanan + kurangi stok, atau memilih penawaran siswa + buat order).

### 2.3. Frontend: Svelte 5 (Runes) + Tailwind CSS v4
1. **WAJIB Sintaks Svelte 5 Runes (`.svelte` & `.svelte.ts`):**
   - State lokal: `let count = $state(0);` (**BUKAN** `let count = 0;` reaktif implisit Svelte 4).
   - Nilai turunan: `let margin = $derived(price - costPrice);` (**BUKAN** `$: margin = ...`).
   - Props komponen: `let { post, onOrder }: Props = $props();` (**BUKAN** `export let post;`).
   - Event listener DOM: `onclick={handleClick}`, `onsubmit={handleSubmit}` (**BUKAN** `on:click`, `on:submit`).
   - Render children/slot: `{@render children?.()}` (**BUKAN** `<slot />`).
   - **DILARANG** memakai `{@html ...}` untuk string input pengguna (mencegah XSS). Satu-satunya pengecualian `{@html}` adalah SVG QR Code yang digenerate secara internal oleh server kita sendiri.
2. **WAJIB Tailwind CSS v4:**
   - Gunakan `@tailwindcss/vite` di `vite.config.ts` dan `@import "tailwindcss";` di `src/client/app.css`.
   - **DILARANG** mencampur class Tailwind dengan inline `style="..."` (sesuai aturan arsitektur proyek di `CLAUDE.md`).
   - Ekstrak pola UI berulang menjadi komponen di `src/client/lib/components/ui/`.

---

## 3. Sistem Desain UI/UX: "Minimalis Ramah Orang Awam"

Setiap komponen Svelte di Tier 1, 2, dan 3 **WAJIB** mematuhi aturan visual berikut:

1. **Palet Warna Tenang & Fokus (1 Aksen Utama + 1 Aksen Transaksi):**
   - Latar halaman: `bg-slate-50` (`#F8FAFC`), Kartu: `bg-white` dengan `border border-slate-200 rounded-2xl shadow-xs`.
   - Teks utama: `text-slate-900`, Teks sekunder: `text-slate-600` (kontras tinggi, mudah dibaca orang tua).
   - Aksen Navigasi & Brand: **Biru Vokasi** (`bg-blue-600 hover:bg-blue-700 text-white`).
   - Aksen Transaksi Utama ("Pesan Sekarang", "Hubungi WhatsApp", "Selesai"): **Hijau Transaksi** (`bg-emerald-600 hover:bg-emerald-700 text-white`).
   - **DILARANG** membuat sidebar warna-warni 4 warna mencolok seperti di versi legacy.
2. **Ukuran Teks & Tombol Nyaman:**
   - Teks isi/deskripsi minimal `text-base` (`16px`) atau `text-sm` (`14px`) untuk metadata sekunder. **DILARANG** memakai `text-[9px]` atau `text-[10px]`.
   - Tinggi tombol aksi utama minimal `h-12` (`48px`) dengan label kata kerja jelas.
3. **Navigasi Selalu Berlabel Teks:**
   - Bottom navigation bar di layar mobile (`lg:hidden`) **WAJIB** menampilkan **Ikon + Teks Label** di bawahnya (misal: `Beranda`, `Jual Karya`, `Pesanan`, `Profil`).
4. **Bahasa Indonesia Sehari-hari:**
   - Gunakan `Barang` (bukan `PRODUCT`), `Jasa` (bukan `SERVICE`), `Portofolio` (bukan `PORTFOLIO`), `Pesan Sekarang`, `Lacak Pesanan`, `Terverifikasi Guru`.
5. **Tanpa `window.alert()` / `window.confirm()` Kaku:**
   - Gunakan komponen `Toast.svelte` untuk notifikasi sukses/gagal, dan `ConfirmModal.svelte` untuk aksi hapus/batal.

---

## 4. Urutan Dokumen Eksekusi Per Tier

Agent harus mengeksekusi proyek secara berurutan per Tier dan **tidak boleh melompat ke Tier berikutnya sebelum semua test di Tier aktif lulus 100%**:

1. **[01_TIER1_BUN_ELYSIA_SVELTE_PLAN.md](01_TIER1_BUN_ELYSIA_SVELTE_PLAN.md)** — Setup proyek Bun + Elysia + Svelte 5 + MySQL, migrasi fitur dasar (Auth, Katalog, Search, Like, WebP), Halaman Detail + Edit/Hapus, Alur Pesanan Tamu/Siswa via WA, Ulasan Terverifikasi, Verifikasi Guru Pembimbing, Paspor Kerja + QR Code, dan Meta Open Graph Dasar.
2. **[02_TIER2_BUN_ELYSIA_SVELTE_PLAN.md](02_TIER2_BUN_ELYSIA_SVELTE_PLAN.md)** — Tabel Wilayah & Sekolah, Peran Perusahaan & Admin, Notifikasi Real-time WebSocket, Etalase Sekolah (TeFa), Papan "Butuh Bantuan" & Penawaran Siswa, Status "Siap Kerja" & Pencarian Talenta, serta Tantangan Industri + Sertifikat QR.
3. **[03_TIER3_BUN_ELYSIA_SVELTE_PLAN.md](03_TIER3_BUN_ELYSIA_SVELTE_PLAN.md)** — Generator Kartu Gambar Open Graph WA 1200×630 & Kit Promosi WA, Kalkulator HPP & Saran Harga Pasar, Kecamatan & Filter "Dekat Saya" (Haversine), Sistem Level 1–4 & Koleksi Lencana Otomatis, serta Dashboard Penjual Mini & Cetak Laporan Kewirausahaan (PKK).

