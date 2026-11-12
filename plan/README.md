# 📁 Peta Dokumen Perencanaan VOC-Market (Single Source of Truth)

> [!CAUTION]
> **PERHATIAN UNTUK AI CODING AGENT:**
> Proyek VOC-Market telah resmi berpindah tech stack ke **Bun `1.4.4` + ElysiaJS + Svelte 5 (Runes) + Tailwind CSS v4 + MySQL `8.4.3` (Laragon + Drizzle ORM)**.
> Kode Laravel lama telah diarsipkan ke folder [`_legacy_laravel/`](../_legacy_laravel) sebagai referensi baca-saja (*read-only*).
> **SAAT MENULIS KODE, IKUTI HANYA DOKUMEN BERNOMOR `00` SAMPAI `03` DI BAWAH INI.** Jangan mengikuti instruksi PHP/Blade/Artisan pada dokumen draf awal!

---

## ✅ Dokumen Eksekusi Aktif (Bun + ElysiaJS + Svelte 5 + MySQL)

Ikuti urutan ini secara ketat dan berurutan:

1. **[00_MASTER_CONTRACT_AND_RULES.md](00_MASTER_CONTRACT_AND_RULES.md)** *(WAJIB BACA PERTAMA)*
   - Fakta lingkungan lokal terverifikasi (Bun 1.4.4, MySQL 8.4.3 Laragon `127.0.0.1:3306`, pemisahan `voc_market` vs `voc_market_test`).
   - Larangan keras anti-halusinasi sintaks (Wajib Svelte 5 Runes `$state`/`$derived`/`$props`, Tailwind v4, Drizzle `mysql-core`, `Bun.password`, HTTP-only session cookie).
   - Aturan UI/UX Minimalis Ramah Orang Awam.
2. **[01_TIER1_BUN_ELYSIA_SVELTE_PLAN.md](01_TIER1_BUN_ELYSIA_SVELTE_PLAN.md)** *(Eksekusi Tahap 1 — Fondasi + Inti Misi)*
   - Setup monorepo, pembersihan tabel POS lama di MySQL, migrasi fitur dasar (Auth, Katalog, Search, Like, WebP `sharp`), Halaman Detail + Edit/Hapus, Alur Pesanan Tanpa Wajib Login + WA, Ulasan Terverifikasi, Verifikasi Guru Pembimbing, Paspor Kerja + QR SVG, dan injeksi Meta Open Graph.
3. **[02_TIER2_BUN_ELYSIA_SVELTE_PLAN.md](02_TIER2_BUN_ELYSIA_SVELTE_PLAN.md)** *(Eksekusi Tahap 2 — Penghubung ke Industri)*
   - Wilayah & Sekolah Resmi, Peran Perusahaan & Admin, Notifikasi Live WebSocket + `@elysiajs/cron`, Etalase Sekolah (TeFa), Papan "Butuh Bantuan" & Penawaran Siswa, Status "Siap Kerja" & Cari Talenta (`talentScore`), serta Tantangan Industri + Sertifikat QR.
4. **[03_TIER3_BUN_ELYSIA_SVELTE_PLAN.md](03_TIER3_BUN_ELYSIA_SVELTE_PLAN.md)** *(Eksekusi Tahap 3 — Pembelajaran & Retensi)*
   - Generator Kartu Preview WhatsApp 1200×630 & Kit Promosi WA, Kalkulator HPP & Benchmark Pasar, Kecamatan & Filter "Dekat Saya" (Haversine), Level Kreator 1–4 & 7 Lencana Otomatis, serta Dashboard Penjual Mini & Cetak Laporan Kewirausahaan (PKK).
5. **[04_SKILL_HUB_SHOWCASE_PLAN.md](04_SKILL_HUB_SHOWCASE_PLAN.md)** *(Draf Tahap 4 — Skill-Hub: Portofolio Interaktif & Pameran Karya)*
   - Studi kasus proyek, media interaktif (3D `model-viewer`, video, Lottie, demo web), pameran virtual, Mode Kiosk, dan apresiasi industri.

---

## 📚 Dokumen Analisis Konsep & Brainstorm Awal (Referensi Produk)

Dokumen-dokumen di bawah ini menyimpan latar belakang riset masalah, filosofi produk, dan alasan migrasi stack (catatan: contoh file `.php`/`.blade.php` di dalamnya merujuk ke kode sebelum dipindahkan ke `_legacy_laravel/`):

- **[voc_market_analysis_brainstorm.md](voc_market_analysis_brainstorm.md)** — Audit masalah awal aplikasi, prinsip UI/UX untuk orang awam, dan ide 14 fitur inti.
- **[tech_stack_migration_brainstorm.md](tech_stack_migration_brainstorm.md)** — Analisis alasan & strategi migrasi dari Laravel ke Bun + ElysiaJS + Svelte + MySQL.
- `tier1_implementation_plan.md`, `tier2_implementation_plan.md`, `tier3_implementation_plan.md` — Draf konsep bisnis awal sebelum pindah stack (digantikan sepenuhnya oleh `01_...`, `02_...`, dan `03_...` di atas).

