# 03 — Spesifikasi Eksekusi Tier 3: Pembelajaran & Retensi (Bun + ElysiaJS + Svelte 5 + MySQL)

> **Prasyarat Mutlak Sebelum Memulai Tier 3:**
> 1. Baca dan patuhi **[00_MASTER_CONTRACT_AND_RULES.md](00_MASTER_CONTRACT_AND_RULES.md)**.
> 2. Seluruh implementasi & test di **[01_TIER1_BUN_ELYSIA_SVELTE_PLAN.md](01_TIER1_BUN_ELYSIA_SVELTE_PLAN.md)** dan **[02_TIER2_BUN_ELYSIA_SVELTE_PLAN.md](02_TIER2_BUN_ELYSIA_SVELTE_PLAN.md)** **WAJIB sudah selesai dan `bun test` lulus 100%**.
> **Cakupan Dokumen Ini:** **Kartu Gambar Preview WhatsApp 1200×630 & Kit Promosi (#14)**, **Asisten Harga / Kalkulator HPP & Saran Pasar (#10)**, **Kecamatan & Filter "Dekat Saya" Haversine (#12)**, **Level Kreator 1–4 & 7 Lencana Otomatis (#11)**, serta **Dashboard Penjual Mini & Buku Kas Kewirausahaan PKK (#13)**.

---

## 1. Aturan Dependencies Tier 3

**TIDAK PERLU menambah package npm baru!**
- Pembuatan Kartu Gambar Open Graph 1200×630 `.webp` dilakukan sepenuhnya oleh **`sharp`** (komposisi buffer SVG teks di atas kanvas + foto karya) yang sudah terpasang sejak Tier 1.
- Grafik performa harian di Dashboard Penjual Mini dibangun menggunakan komponen batang SVG/Tailwind murni di Svelte 5 tanpa library chart JS berat (menjaga bundle tetap kecil untuk HP siswa).

---

## 2. Peta File Baru & Pembaruan File di Tier 3

```text
src/
├── server/
│   ├── db/
│   │   ├── data/
│   │   │   └── subdistricts.json         # Daftar Kecamatan beserta titik koordinat pusat (lat, lng)
│   │   └── schema/
│   │       └── learning.ts               # Tabel subdistricts, badges, user_badges, product_daily_stats (+ kolom baru di users & products)
│   ├── services/
│   │   ├── og-card.service.ts            # Generator gambar 1200x630 WebP via SVG + sharp untuk preview WhatsApp
│   │   ├── pricing.service.ts            # Kalkulasi HPP, kesehatan margin, dan P25/Median/P75 harga pasar kategori
│   │   ├── geo.service.ts                # Deteksi kecamatan terdekat & rumus Haversine MySQL
│   │   ├── badge.service.ts              # Evaluasi otomatis Level 1-4 & pemberian 7 Lencana etos kerja/bisnis
│   │   └── seller-analytics.service.ts   # Agregasi Omzet, HPP, Laba Bersih, Corong Konversi, Smart Tips & CSV PKK
│   └── modules/
│       ├── location.routes.ts            # /api/subdistricts, /api/location/detect
│       ├── pricing.routes.ts             # /api/pricing/benchmark
│       └── seller-dashboard.routes.ts    # /api/seller/dashboard, /api/seller/report/csv, /api/teacher/pkk-summary
└── client/
    ├── lib/
    │   ├── location.svelte.ts            # State lokasi aktif pengunjung ($state, tersimpan di sessionStorage)
    │   └── components/
    │       ├── SharePromoModal.svelte    # Bottom sheet/modal Kit Promosi WhatsApp (2 template pesan + 1-klik WA)
    │       ├── HppCalculator.svelte      # Accordion Kalkulator HPP real-time ($derived) di dalam PostFormPage
    │       ├── LocationPickerModal.svelte # Pilihan "Gunakan Lokasi Saya (GPS)" atau pilih Kota & Kecamatan
    │       ├── CreatorLevelCard.svelte   # Widget progres Level 1-4 & checklist langkah menuju level berikutnya
    │       └── BadgeGrid.svelte          # Tampilan koleksi lencana di Profil & Paspor Kerja
    └── pages/
        ├── SellerDashboardPage.svelte    # Buku Kas Siswa (/dashboard-penjual): Omzet, Laba, Funnel, Tabel Karya
        └── SellerReportPrintPage.svelte  # Lembar Cetak Laporan Praktik Kewirausahaan PKK (/dashboard-penjual/cetak)
```

---

## 3. Skema Database MySQL Tambahan Tier 3 (`schema/learning.ts`)

### 3.1. Tabel `subdistricts` (Kecamatan — Basis Lokasi Aman)
| Kolom | Tipe Drizzle MySQL | Keterangan |
|---|---|---|
| `id` | `bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey()` | PK |
| `regionId` | `bigint('region_id', { mode: 'number', unsigned: true }).notNull()` | FK ke `regions.id` (`onDelete: 'cascade'`) |
| `name` | `varchar('name', { length: 120 }).notNull()` | Nama kecamatan, misal `'Cibinong'` |
| `latitude` | `decimal('latitude', { precision: 9, scale: 6 }).notNull()` | Titik pusat kecamatan (aman, bukan koordinat rumah siswa!) |
| `longitude` | `decimal('longitude', { precision: 9, scale: 6 }).notNull()` | Titik pusat kecamatan |

### 3.2. Tabel `badges` & `user_badges` (Gamifikasi Etos Kerja)
- **`badges`**:
  - `id`: PK bigint unsigned
  - `slug`: `varchar('slug', { length: 50 }).notNull().unique()`
  - `name`: `varchar('name', { length: 100 }).notNull()`
  - `description`: `varchar('description', { length: 255 }).notNull()`
  - `icon`: `varchar('icon', { length: 40 }).notNull()` (nama ikon Lucide)
  - `color`: `mysqlEnum('color', ['emerald', 'blue', 'amber', 'violet']).notNull().default('blue')`
  - `category`: `mysqlEnum('category', ['work_ethic', 'entrepreneurship', 'quality', 'school']).notNull()`
- **`user_badges`**:
  - `id`: PK bigint unsigned
  - `userId`: FK `users.id` (`onDelete: 'cascade'`), notNull
  - `badgeId`: FK `badges.id` (`onDelete: 'cascade'`), notNull
  - `contextNote`: `varchar('context_note', { length: 160 })` (nullable)
  - `awardedAt`: `timestamp('awarded_at').defaultNow().notNull()`
  - **Unique Index:** `(userId, badgeId)`

### 3.3. Tabel `product_daily_stats` (Analitik Harian Ringan)
| Kolom | Tipe Drizzle MySQL | Keterangan |
|---|---|---|
| `id` | `bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey()` | PK |
| `productId` | `bigint('product_id', { mode: 'number', unsigned: true }).notNull()` | FK ke `products.id` (`onDelete: 'cascade'`) |
| `statDate` | `varchar('stat_date', { length: 10 }).notNull()` | Format `'YYYY-MM-DD'` (zona waktu `Asia/Jakarta`) |
| `views` | `int('views', { unsigned: true }).notNull().default(0)` | Di-increment menggunakan `ON DUPLICATE KEY UPDATE views = views + 1` |
| `shares` | `int('shares', { unsigned: true }).notNull().default(0)` | |
| `ordersCreated` | `int('orders_created', { unsigned: true }).notNull().default(0)` | |
| **Unique** | `(productId, statDate)` | |

### 3.4. Kolom Tambahan pada `users`, `schools`, dan `products`
- **Pada `users`:**
  - `subdistrictId`: FK `subdistricts.id` (`onDelete: 'set null'`), nullable
  - `creatorLevel`: `int('creator_level', { unsigned: true }).notNull().default(1)` (`1..4`)
- **Pada `schools`:**
  - `subdistrictId`: FK `subdistricts.id` (`onDelete: 'set null'`), nullable
- **Pada `products`:**
  - `ogImage`: `varchar('og_image', { length: 255 })` (nullable — path `/uploads/og/post-{id}.webp`)
  - `costBreakdown`: `json('cost_breakdown').$type<{ material: number; packaging: number; overhead: number; labor: number }>()` (nullable — **WAJIB PRIVATE**, tidak boleh dikirim ke publik!)
  - `estimatedHours`: `decimal('estimated_hours', { precision: 5, scale: 1 })` (nullable)
  - `subdistrictId`: FK `subdistricts.id` (`onDelete: 'set null'`), nullable (otomatis diwarisi dari `user.subdistrictId` / sekolah jika tidak diisi)
  - `serviceAreaType`: `mysqlEnum('service_area_type', ['onsite', 'workshop', 'delivery', 'digital']).notNull().default('delivery')`
  - `maxDistanceKm`: `int('max_distance_km', { unsigned: true })` (nullable, untuk jasa panggilan `'onsite'`)

---

## 4. Spesifikasi Teknis 5 Modul Tier 3 (Anti-Halusinasi)

### 4.1. Generator Kartu Preview WhatsApp & Kit Promosi (#14)
1. **`OgCardService.generateForPost(post, author)`:**
   - Membuat kanvas gambar **1200×630 px** dengan `sharp`:
     - Bagian kiri (`600×630`): Foto karya siswa (`fit: 'cover'`).
     - Bagian kanan (`600×630`): Buffer SVG dengan latar putih `#FFFFFF`, teks ter-escape XML (`&`, `<`, `>`, `"`), menampilkan label Bahasa Indonesia (`BARANG` / `JASA` / `PORTOFOLIO`), judul karya (dipotong rapi maks. 60 karakter), pill harga biru besar (`Rp ...`), nama siswa, nama SMK, dan badge `"✔ Terverifikasi Guru"` jika `isVerifiedByTeacher || author.isVerified`.
   - Disimpan ke `public/uploads/og/post-${post.id}.webp` dan mengisi `products.ogImage`.
   - `OgService` (dari Tier 1) menggunakan `APP_URL + post.ogImage` sebagai `<meta property="og:image">` beserta `<script type="application/ld+json">` Schema.org `Product`/`Service`.
2. **`SharePromoModal.svelte`:**
   - Menampilkan 2 tab template pesan promosi siap pakai (*Gaya Santun untuk Grup Keluarga/RT* & *Gaya Singkat untuk Status/Teman*), tombol **"Kirim ke WhatsApp"** (`https://wa.me/?text=...`), dan **"Salin Teks Promosi"**, sekaligus memanggil `POST /api/posts/:id/share` (menaikkan `sharesCount` dan `product_daily_stats.shares`).

### 4.2. Asisten Harga (Kalkulator HPP & Benchmark Pasar) (#10)
1. **`PricingService.analyzeMargin(costPrice, sellingPrice)`:**
   - Jika `sellingPrice <= 0` atau `costPrice <= 0`, kembalikan status `'neutral'`.
   - `profit = sellingPrice - costPrice`
   - `marginPercent = Math.round((profit / sellingPrice) * 1000) / 10`
   - Kategori status eksak:
     - `sellingPrice <= costPrice` → `'loss'` (Merah — Rugi / belum balik modal)
     - `marginPercent < 15` → `'thin'` (Kuning/Oranye — Margin tipis)
     - `marginPercent <= 55` → `'healthy'` (Hijau — Margin sehat & kompetitif)
     - `marginPercent > 55` → `'premium'` (Biru — Margin premium, sarankan garansi/nilai tambah)
2. **`GET /api/pricing/benchmark?categoryId=...&type=product|service` (Auth):**
   - Mengambil seluruh harga karya `published` pada `categoryId` & `type` tersebut, mengurutkannya, dan mengembalikan `{ sampleCount, minPrice, p25Price, medianPrice, p75Price, maxPrice }`.
3. **`HppCalculator.svelte` (Svelte 5 `$state` & `$derived`):**
   - Disematkan sebagai panel lipat (*collapsible*) `"🧮 Bantu Hitung Modal (Kalkulator HPP)"` di Langkah 2 `PostFormPage.svelte`.
   - Input 4 komponen (`material`, `packaging`, `overhead`, `labor`) otomatis menghitung `$derived(material + packaging + overhead + labor)` → mengisi `costPrice`, menyediakan 3 tombol harga cepat (`+20% Hemat`, `+35% Ideal`, `Ikuti Median Pasar`), dan menampilkan kotak evaluasi margin secara *live*.

### 4.3. Lokasi Kecamatan & Filter "Dekat Saya" (#12)
1. **`POST /api/location/detect`:**
   - Menerima `{ lat: number, lng: number }` dari `navigator.geolocation` browser (hanya di memori request, **TIDAK PERNAH disimpan ke database!**).
   - Mencari baris `subdistricts` terdekat menggunakan rumus **Haversine** dan mengembalikan `{ subdistrictId, subdistrictName, regionId, regionName }`.
2. **Filter Katalog `GET /api/posts` & `GET /api/requests`:**
   - Menerima parameter opsional `subdistrictId?`, `regionId?`, dan `sort=nearest`.
   - Jika `subdistrictId` dikirim, ambil `(lat0, lng0)` pusat kecamatan tersebut lalu hitung jarak SQL Haversine ke pusat kecamatan masing-masing karya (`subdistricts.latitude/longitude`):
     - Bulatkan jarak ke 1 desimal (jika `< 1 km`, tampilkan teks `"Satu kecamatan dengan Anda"`, selain itu `"± X,X km"`).
     - Karya dengan `serviceAreaType === 'digital'` selalu diberi label `"🌐 Layanan Online (Seluruh Indonesia)"`.

### 4.4. Level Kreator (1–4) & 7 Lencana Otomatis (#11)
1. **Aturan Eksak `creatorLevel` (`BadgeService.evaluateUser(userId)`):**
   - **Level 4 (`Profesional Vokasi`):** `completedOrders >= 15` DAN `avgRating >= 4.6` DAN (`reviewsCount >= 10` ATAU `certificatesCount >= 1`).
   - **Level 3 (`Mitra Terpercaya`):** `completedOrders >= 5` DAN `avgRating >= 4.2` DAN `isVerified === true`.
   - **Level 2 (`Kreator Aktif`):** `publishedWorksCount >= 1` DAN `completedOrders >= 1`.
   - **Level 1 (`Kreator Pemula`):** Selain kondisi di atas.
2. **7 Slug Lencana Resmi di Seeder & `BadgeService`:**
   - `first_project`: Menyelesaikan pesanan pertama (`completedOrders >= 1`).
   - `on_time_hero`: Menerima tag `'Tepat Waktu'` pada $\ge 3$ ulasan.
   - `quality_craft`: Menerima tag `'Rapi & Berkualitas'` pada $\ge 3$ ulasan.
   - `five_star_streak`: 5 ulasan terakhir berturut-turut bernilai `rating === 5`.
   - `repeat_trusted`: Memiliki $\ge 2$ pesanan `completed` dari nomor telepon pembeli (`buyerPhone` ternormalisasi) atau `buyerId` yang sama.
   - `smart_hpp`: Memiliki $\ge 3$ karya `published` dengan `costBreakdown !== null` dan margin berstatus `'healthy'`.
   - `tefa_verified`: Memiliki minimal 1 karya dengan `isVerifiedByTeacher === true` atau `isTefa === true`.

### 4.5. Dashboard Penjual Mini & Buku Kas Kewirausahaan PKK (#13)
- `GET /api/seller/dashboard?period=7d|30d|all` (Auth: `smk`):
  - Mengembalikan:
    - `summary`: `{ grossRevenue, totalHppCost, netProfit, avgMarginPercent, completedOrdersCount, activeOrdersCount, totalViews, totalShares, conversionRatePercent }` (di mana `totalHppCost = SUM(orders.unitCostSnapshot)` pada pesanan `completed`, dan `netProfit = grossRevenue - totalHppCost`).
    - `dailySeries`: array harian `{ date, views, shares, orders }` dari `product_daily_stats`.
    - `smartTips`: maks. 2 saran kontekstual berbasis aturan (views rendah, views tinggi tapi konversi 0%, pesanan baru belum dikonfirmasi, atau HPP belum diisi).
    - `worksPerformance`: daftar tiap karya siswa beserta `views`, `shares`, `completedOrders`, `unitProfit`, dan `conversionRate`.
    - `levelProgress`: level saat ini (`1..4`), daftar lencana yang sudah diraih, dan checklist syarat menuju level berikutnya.
- `GET /api/seller/report/csv?period=...` (Auth: `smk` atau Guru satu sekolah):
  - Mengunduh file CSV (`Content-Type: text/csv; charset=utf-8` dengan UTF-8 BOM `\uFEFF` agar langsung rapi saat dibuka di Microsoft Excel Windows!) berisi tabel transaksi selesai, harga sepakat, modal HPP, dan laba bersih.
- `SellerReportPrintPage.svelte` (`/dashboard-penjual/cetak`):
  - Dokumen A4 siap cetak untuk dikumpulkan sebagai laporan mata pelajaran **PKK (Produk Kreatif dan Kewirausahaan)** lengkap dengan ruang tanda tangan Siswa & Guru Pembimbing.

---

## 5. Checklist Pengujian Wajib (`bun test`) — Kriteria Lulus Tier 3

Seluruh test Tier 1 dan Tier 2 **tetap harus lulus 100%**, ditambah test baru di `tests/tier3-*.test.ts`:

- [ ] **Kartu Preview OG WhatsApp & Share (#14):** Pembuatan karya menghasilkan file `.webp` berukuran `1200×630` di `uploads/og/`; HTML `/karya/:id` memuat `<meta property="og:image"` menuju kartu tersebut dan JSON-LD `Product`; `POST /api/posts/:id/share` menaikkan `sharesCount` dan `product_daily_stats.shares`.
- [ ] **Kalkulator HPP & Kerahasiaan Modal (#10):** `PricingService.analyzeMargin` mengembalikan status `loss`, `thin`, `healthy`, dan `premium` dengan tepat; `/api/pricing/benchmark` menghitung `p25Price`, `medianPrice`, `p75Price` dengan benar; field `costPrice`, `costBreakdown`, dan `unitCostSnapshot` **TIDAK PERNAH** muncul pada response publik `/api/posts`, `/api/posts/:id` (bagi pengunjung non-pemilik), maupun `/api/orders/track/:code`.
- [ ] **Lokasi Kecamatan & "Dekat Saya" (#12):** `POST /api/location/detect` memilih kecamatan dengan jarak Haversine terdekat tanpa menyimpan koordinat GPS pengunjung; filter `GET /api/posts?subdistrictId=...&sort=nearest` mengurutkan karya dari jarak terdekat ke terjauh dengan label jarak dibulatkan.
- [ ] **Level 1–4 & Lencana Otomatis (#11):** Menyelesaikan pesanan pertama menaikkan siswa ke `creatorLevel = 2` dan memberikan badge `first_project`; 5 pesanan + rating $\ge 4.2$ + verifikasi guru menaikkan ke `creatorLevel = 3`; mengisi `costBreakdown` sehat pada 3 karya memberikan badge `smart_hpp`; 2 pesanan selesai dari nomor WA pembeli yang sama memberikan badge `repeat_trusted`.
- [ ] **Dashboard Penjual & Laporan PKK (#13):** Perhitungan `grossRevenue`, `totalHppCost` (menggunakan `unitCostSnapshot` saat order dibuat walau `product.costPrice` diubah belakangan), dan `netProfit` akurat 100%; unduhan `/api/seller/report/csv` mengembalikan CSV valid dengan BOM Excel dan menolak (403) akses dari siswa lain atau guru beda sekolah. `bun run build` selesai tanpa error!

