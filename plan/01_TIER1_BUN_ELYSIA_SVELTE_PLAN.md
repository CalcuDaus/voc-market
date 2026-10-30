# 01 — Spesifikasi Eksekusi Tier 1 (Bun + ElysiaJS + Svelte 5 + MySQL)

> **Prasyarat Wajib:** Baca dan patuhi seluruh aturan di **[00_MASTER_CONTRACT_AND_RULES.md](00_MASTER_CONTRACT_AND_RULES.md)** sebelum memulai.
> **Cakupan Dokumen Ini:** Setup fondasi monorepo **Bun + ElysiaJS + Svelte 5 + MySQL (Laragon)** + Migrasi Fitur Inti + **5 Fitur Utama Tier 1** (Halaman Detail + Edit/Hapus, Alur Pesanan Tanpa Wajib Login + WA, Ulasan Terverifikasi, Verifikasi Guru Pembimbing SMK, dan Paspor Kerja / CV Digital + QR Code).

---

## 1. Daftar Dependencies & Konfigurasi Proyek (Jangan Mengarang Package!)

### 1.1. Dependencies Utama (`package.json`)
Gunakan **tepat** daftar package berikut saat inisialisasi dengan `bun`:

- **`dependencies`:**
  - `elysia` (Framework backend utama Bun)
  - `@elysiajs/cors` (CORS untuk Vite dev server)
  - `@elysiajs/static` (Melayani aset `/uploads` dan `dist/`)
  - `@elysiajs/eden` (Eden Treaty type-safe client untuk Svelte)
  - `drizzle-orm` (ORM TypeScript ringan untuk MySQL)
  - `mysql2` (Driver koneksi pool MySQL 8.4 Laragon)
  - `sharp` (Konversi gambar ke WebP max-width 1280px & auto-rotate EXIF)
  - `qrcode` (Generator SVG QR Code murni untuk Paspor Kerja)
  - `lucide-svelte` (Ikon modern bersih pengganti 3x CDN Font Awesome berat)
- **`devDependencies`:**
  - `svelte` (`^5.0.0` — **Wajib Svelte 5 Runes**)
  - `@sveltejs/vite-plugin-svelte`
  - `vite` (`^6.0.0`)
  - `tailwindcss` (`^4.0.0`)
  - `@tailwindcss/vite` (`^4.0.0`)
  - `drizzle-kit` (CLI push/migrasi skema MySQL)
  - `concurrently` (Menjalankan server Elysia & Vite secara bersamaan saat dev)
  - `@types/qrcode`
  - `typescript` (`^5.7.0`)

### 1.2. Scripts Standar di `package.json`
```json
{
  "scripts": {
    "dev:server": "bun --watch src/server/index.ts",
    "dev:client": "vite",
    "dev": "concurrently -n api,web -c blue,green \"bun run dev:server\" \"bun run dev:client\"",
    "build": "vite build",
    "start": "NODE_ENV=production bun src/server/index.ts",
    "db:reset": "bun src/server/db/reset.ts",
    "db:push": "drizzle-kit push",
    "db:seed": "bun src/server/db/seed.ts",
    "test": "NODE_ENV=test bun test"
  }
}
```

### 1.3. Variabel Lingkungan (`.env` & `.env.example`)
```ini
PORT=3000
APP_URL=http://localhost:5173
DATABASE_URL=mysql://root@127.0.0.1:3306/voc_market
TEST_DATABASE_URL=mysql://root@127.0.0.1:3306/voc_market_test
SESSION_COOKIE_NAME=voc_session
SESSION_TTL_DAYS=30
```

> **Catatan Penting `db:reset`:** Script `src/server/db/reset.ts` harus:
> 1. Memastikan database `voc_market` dan `voc_market_test` ada (`CREATE DATABASE IF NOT EXISTS ... CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`).
> 2. Menghapus tabel POS warisan yang kosong di `voc_market` (`account_mutations`, `accounts`, `cache`, `cache_locks`, `customers`, `debts`, `expenses`, `failed_jobs`, `inventory_logs`, `job_batches`, `jobs`, `migrations`, `password_reset_tokens`, `retails`, `sale_items`, `sales`, serta `reviews`, `orders`, `products`, `categories`, `sessions`, `users` lama) dengan `SET FOREIGN_KEY_CHECKS = 0;` agar `drizzle-kit push` menerapkan skema bersih tanpa konflik foreign key lama.
> 3. Menyalin logo dari `_legacy_laravel/public/voc-logo.png` dan `_legacy_laravel/public/voc-market/dist/image/*.png` ke folder `public/images/`.

---

## 2. Struktur File Eksak Tier 1 (Wajib Diikuti)

Agent **HANYA** membuat file sesuai peta di bawah ini untuk Tier 1:

```text
voc-market/
├── index.html                            # Entry HTML Vite (memuat Plus Jakarta Sans & placeholder OG tags)
├── package.json
├── tsconfig.json
├── vite.config.ts                        # Vite + Svelte 5 + @tailwindcss/vite + proxy /api & /uploads ke :3000
├── drizzle.config.ts                     # Mengarah ke src/server/db/schema/index.ts
├── public/
│   ├── images/                           # Logo VOC-Market (disalin dari _legacy_laravel)
│   └── uploads/                          # Penyimpanan WebP (avatars/, posts/, proofs/) — di-ignore git
├── src/
│   ├── shared/
│   │   └── constants.ts                  # Label Bahasa Indonesia, daftar endorsement tags, status order
│   ├── server/
│   │   ├── app.ts                        # Factory createApp() Elysia (dipakai oleh index.ts & bun test)
│   │   ├── index.ts                      # Menjalankan app.listen(process.env.PORT || 3000)
│   │   ├── db/
│   │   │   ├── index.ts                  # mysql2 pool (memilih TEST_DATABASE_URL saat NODE_ENV==='test') + Drizzle
│   │   │   ├── reset.ts                  # Pembersih tabel POS lama & inisialisasi DB dev + test
│   │   │   ├── seed.ts                   # Data demo realistis (4 Siswa SMK, 2 Guru, 1 Pembeli, 6 Karya, 3 Order, 2 Review)
│   │   │   └── schema/
│   │   │       ├── index.ts              # Barrel export seluruh tabel & relasi Tier 1
│   │   │       ├── users.ts              # Tabel users & sessions
│   │   │       ├── posts.ts              # Tabel categories, products, post_likes
│   │   │       └── orders.ts             # Tabel orders & reviews
│   │   ├── middleware/
│   │   │   ├── security.ts               # Security headers (X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy)
│   │   │   ├── rate-limit.ts             # In-memory rate limiter per route group (otomatis bypass/reset di test helper)
│   │   │   └── auth.ts                   # Resolusi user dari cookie voc_session + helper requireAuth & requireRole
│   │   ├── services/
│   │   │   ├── image.service.ts          # Konversi upload ke WebP (sharp, maxWidth 1280, quality 88, EXIF rotate)
│   │   │   ├── qr.service.ts             # Generator SVG QR Code murni menggunakan package qrcode
│   │   │   ├── whatsapp.service.ts       # Pembuat link wa.me aman (normalisasi 08xx -> 628xx + template pesan kode order)
│   │   │   └── og.service.ts             # Penyuntik <title> & <meta property="og:*"> ke HTML untuk halaman publik
│   │   └── modules/
│   │       ├── auth.routes.ts            # /api/auth/*
│   │       ├── posts.routes.ts           # /api/categories, /api/posts/*, /api/search
│   │       ├── orders.routes.ts          # /api/orders/*, /api/seller/orders/*
│   │       ├── teacher.routes.ts         # /api/teacher/*
│   │       └── profile.routes.ts         # /api/profile/:username, /api/passport/:username
│   └── client/
│       ├── main.ts                       # Mount App.svelte ke #app
│       ├── app.css                       # @import "tailwindcss"; + @media print rules
│       ├── App.svelte                    # Client-side History API Router + Shell Layout
│       ├── lib/
│       │   ├── api.ts                    # Eden Treaty client + fetch wrapper dengan credentials: 'include'
│       │   ├── router.svelte.ts          # Reactive pathname & query params router ($state) + fungsi navigate(url)
│       │   ├── auth.svelte.ts            # Global current user state ($state)
│       │   ├── toast.svelte.ts           # Global toast notification queue ($state) — pengganti alert()
│       │   ├── format.ts                 # formatRupiah(num), formatRelativeTime(date)
│       │   └── components/
│       │       ├── Navbar.svelte         # Sidebar Desktop bersih + Bottom Nav Mobile BERLABEL TEKS
│       │       ├── ToastContainer.svelte # Floating toast
│       │       ├── ConfirmModal.svelte   # Dialog konfirmasi hapus/batal ramah awam
│       │       ├── PostCard.svelte       # Kartu katalog minimalis (foto 1:1, harga jelas, sekolah, badge guru, rating)
│       │       └── OrderStepper.svelte   # Visualisasi 4 tahap pesanan (Diminta -> Diterima -> Dikerjakan -> Selesai)
│       └── pages/
│           ├── HomePage.svelte           # Search bar langsung + tab filter (Semua/Barang/Jasa/Portofolio) + chip kategori + grid karya
│           ├── LoginPage.svelte          # Masuk dengan Email atau Username
│           ├── RegisterPage.svelte       # Daftar bertahap sesuai pilihan peran: Siswa SMK / Pembeli Umum / Guru Pembimbing
│           ├── PostDetailPage.svelte     # Detail karya + Stempel TeFa Guru + Form Pesan Cepat (Tanpa Wajib Login) + Daftar Ulasan
│           ├── PostFormPage.svelte       # Wizard 3 langkah Tambah & Edit Karya (1. Pilih Tipe & Foto -> 2. Nama & Harga -> 3. Deskripsi & Terbitkan)
│           ├── OrderTrackPage.svelte     # Halaman pembeli (/pesanan/:code?token=...) + Stepper + Tombol WA Siswa + Form Ulasan saat Selesai
│           ├── SellerOrdersPage.svelte   # Dashboard pesanan masuk siswa (/pesanan-masuk) + Update status, harga sepakat & upload foto bukti
│           ├── TeacherDashboardPage.svelte # Panel Guru (/dashboard/guru): verifikasi siswa se-sekolah, beri stempel karya TeFa & pantau rekap order
│           ├── ProfilePage.svelte        # Profil CV hidup + statistik + tombol ke Paspor Kerja
│           └── PassportPage.svelte       # Paspor Kerja / CV Digital (/paspor-kerja/:username) siap cetak A4 + QR Code SVG
└── tests/
    ├── setup.ts                          # Helper reset tabel di voc_market_test sebelum test suite
    ├── auth.test.ts                      # Register (SMK, Public, Teacher), Login Email/Username, Logout, Rate Limit
    ├── posts.test.ts                     # Feed, Filter, Search XSS-safe, Upload WebP, Detail views_count, Edit/Delete (403 non-owner), Like toggle
    ├── orders-reviews.test.ts            # Guest checkout, Token tracking, Seller transitions (requested->completed + stock decrement), Verified review
    └── teacher-passport.test.ts          # Teacher verifies student & post (same school check), Passport metrics & QR SVG + OG Meta HTML check
```

---

## 3. Skema Database MySQL Eksak (`src/server/db/schema/`)

Gunakan tipe dari `drizzle-orm/mysql-core`. Semua kolom harga menggunakan `bigint(..., { mode: 'number', unsigned: true })` (satuan Rupiah bulat).

### 3.1. Tabel `users` (`schema/users.ts`)
| Kolom | Tipe Drizzle MySQL | Default / Constraint | Keterangan |
|---|---|---|---|
| `id` | `bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey()` | PK | |
| `name` | `varchar('name', { length: 150 }).notNull()` | | Nama lengkap |
| `username` | `varchar('username', { length: 50 }).notNull().unique()` | Unique | Huruf kecil, angka, `_`, `-` |
| `firstName` | `varchar('first_name', { length: 100 })` | nullable | |
| `lastName` | `varchar('last_name', { length: 100 })` | nullable | |
| `email` | `varchar('email', { length: 191 }).notNull().unique()` | Unique | |
| `password` | `varchar('password', { length: 255 }).notNull()` | | Hash bcrypt `Bun.password` |
| `avatar` | `varchar('foto_profil', { length: 255 })` | nullable | Path `/uploads/avatars/...webp` atau URL |
| `phoneNumber` | `varchar('phone_number', { length: 25 })` | nullable | **TIDAK BOLEH** dikirim di endpoint katalog publik! |
| `userType` | `mysqlEnum('user_type', ['smk', 'public', 'teacher', 'company', 'admin']).notNull().default('smk')` | `'smk'` | Di Tier 1 UI registrasi membuka `'smk'`, `'public'`, `'teacher'`; `'company'` & `'admin'` sudah disiapkan di enum agar Tier 2 tidak perlu alter enum |
| `schoolName` | `varchar('school_name', { length: 180 })` | nullable, indexed | Dinormalisasi trim saat simpan (untuk pencocokan Guru ↔ Siswa di Tier 1) |
| `nisn` | `varchar('nisn', { length: 30 })` | nullable | **Private** (hanya pemilik & guru sekolahnya) |
| `nip` | `varchar('nip', { length: 40 })` | nullable | NIP/NUPTK Guru Pembimbing |
| `major` | `varchar('major', { length: 120 })` | nullable | Jurusan SMK |
| `skills` | `varchar('skills', { length: 255 })` | nullable | Keahlian dipisah koma |
| `businessName` | `varchar('business_name', { length: 150 })` | nullable | Untuk akun `public` / UMKM |
| `businessType` | `varchar('business_type', { length: 100 })` | nullable | |
| `bio` | `text('bio')` | nullable | |
| `acceptingOrders` | `boolean('accepting_orders').notNull().default(true)` | `true` | Sedang siap menerima pesanan karya/jasa |
| `isVerified` | `boolean('is_verified').notNull().default(false)` | `false` | Diverifikasi Guru Pembimbing |
| `verifiedBy` | `bigint('verified_by', { mode: 'number', unsigned: true })` | nullable | ID Guru yang memverifikasi |
| `verifiedAt` | `timestamp('verified_at')` | nullable | |
| `createdAt` | `timestamp('created_at').defaultNow().notNull()` | | |
| `updatedAt` | `timestamp('updated_at').defaultNow().onUpdateNow().notNull()` | | |

### 3.2. Tabel `sessions` (`schema/users.ts`)
| Kolom | Tipe Drizzle MySQL | Keterangan |
|---|---|---|
| `id` | `varchar('id', { length: 64 }).primaryKey()` | SHA-256 hash dari token cookie mentah |
| `userId` | `bigint('user_id', { mode: 'number', unsigned: true }).notNull()` | FK ke `users.id` (`onDelete: 'cascade'`) |
| `expiresAt` | `timestamp('expires_at').notNull()` | Waktu kedaluwarsa sesi |
| `createdAt` | `timestamp('created_at').defaultNow().notNull()` | |

### 3.3. Tabel `categories`, `products`, dan `post_likes` (`schema/posts.ts`)
- **`categories`**: `id` (PK bigint unsigned), `name` (`varchar(120)` unique), `slug` (`varchar(130)` unique), `icon` (`varchar(40)` nama ikon Lucide, misal `'code'`, `'palette'`, `'wrench'`, `'utensils'`, `'cpu'`, `'sparkles'`).
- **`products`** (menyimpan 3 tipe karya siswa):
  - `id`: PK bigint unsigned autoincrement
  - `userId`: FK `users.id` (`onDelete: 'cascade'`), notNull
  - `type`: `mysqlEnum('type', ['product', 'service', 'portfolio']).notNull().default('product')`
  - `name`: `varchar('name', { length: 200 }).notNull()`
  - `code`: `varchar('barcode', { length: 40 }).notNull().unique()` (misal `VOC-PRD-XXXXXXXX`)
  - `categoryId`: FK `categories.id` (`onDelete: 'set null'`), nullable
  - `description`: `text('description').notNull()`
  - `image`: `varchar('image', { length: 255 }).notNull()`
  - `costPrice`: `bigint('cost_price', { mode: 'number', unsigned: true }).notNull().default(0)` (**Private** — tidak boleh muncul di JSON publik!)
  - `price`: `bigint('price', { mode: 'number', unsigned: true }).notNull().default(0)`
  - `priceMin`: `bigint('price_min', { mode: 'number', unsigned: true })` (nullable, untuk `service`)
  - `priceMax`: `bigint('price_max', { mode: 'number', unsigned: true })` (nullable, untuk `service`)
  - `stock`: `int('stock').notNull().default(1)`
  - `projectLink`: `varchar('project_link', { length: 255 })` (nullable, untuk `portfolio`)
  - `likesCount`: `int('likes_count', { unsigned: true }).notNull().default(0)`
  - `viewsCount`: `int('views_count', { unsigned: true }).notNull().default(0)`
  - `sharesCount`: `int('shares_count', { unsigned: true }).notNull().default(0)`
  - `isVerifiedByTeacher`: `boolean('is_verified_by_teacher').notNull().default(false)` (Stempel kurasi TeFa Guru)
  - `verifiedBy`: `bigint('verified_by', { mode: 'number', unsigned: true })` (nullable, ID Guru)
  - `teacherNote`: `varchar('teacher_note', { length: 255 })` (nullable, komentar rekomendasi guru)
  - `status`: `mysqlEnum('status', ['published', 'archived']).notNull().default('published')`
  - `createdAt`, `updatedAt`
- **`post_likes`** (menggantikan session-only like lama yang hilang saat reload):
  - `id`: PK bigint unsigned
  - `productId`: FK `products.id` (`onDelete: 'cascade'`)
  - `actorKey`: `varchar('actor_key', { length: 80 }).notNull()` (berisi `user:{userId}` jika login, atau `ip:{sha256_ip_ua}` jika tamu)
  - `createdAt`: timestamp
  - Unique index pada `(productId, actorKey)` sehingga anti-spam inflasi like!

### 3.4. Tabel `orders` & `reviews` (`schema/orders.ts`)
- **`orders`**:
  - `id`: PK bigint unsigned autoincrement
  - `orderCode`: `varchar('order_code', { length: 32 }).notNull().unique()` (format: `VOC-ORD-YYMMDD-XXXX`)
  - `source`: `mysqlEnum('source', ['product', 'job_request']).notNull().default('product')` (disiapkan sejak Tier 1 agar kompatibel dengan Tier 2)
  - `productId`: FK `products.id` (`onDelete: 'set null'`), nullable
  - `sellerId`: FK `users.id` (`onDelete: 'cascade'`), notNull (Siswa pemilik karya)
  - `buyerId`: FK `users.id` (`onDelete: 'set null'`), nullable (Terisi jika pembeli login, `null` jika pembeli tamu)
  - `buyerName`: `varchar('buyer_name', { length: 120 }).notNull()`
  - `buyerPhone`: `varchar('buyer_phone', { length: 30 }).notNull()`
  - `buyerAddress`: `varchar('buyer_address', { length: 255 })` (nullable)
  - `buyerNotes`: `text('buyer_notes')` (nullable)
  - `quantity`: `int('quantity', { unsigned: true }).notNull().default(1)`
  - `agreedPrice`: `bigint('agreed_price', { mode: 'number', unsigned: true }).notNull().default(0)`
  - `unitCostSnapshot`: `bigint('unit_cost_snapshot', { mode: 'number', unsigned: true }).notNull().default(0)` (menyimpan `product.costPrice * quantity` saat order dibuat — siap untuk Buku Kas Tier 3)
  - `status`: `mysqlEnum('status', ['requested', 'accepted', 'in_progress', 'completed', 'cancelled']).notNull().default('requested')`
  - `progressNote`: `text('progress_note')` (nullable — catatan update dari siswa)
  - `proofImage`: `varchar('proof_image', { length: 255 })` (nullable — foto bukti pengerjaan/serah terima WebP)
  - `reviewToken`: `varchar('review_token', { length: 64 }).notNull().unique()` (token kriptografis 48-hex dari `crypto.randomUUID()`/`randomBytes`)
  - `acceptedAt`: `timestamp('accepted_at')` (nullable)
  - `completedAt`: `timestamp('completed_at')` (nullable)
  - `createdAt`, `updatedAt`
- **`reviews`**:
  - `id`: PK bigint unsigned autoincrement
  - `orderId`: FK `orders.id` (`onDelete: 'cascade'`), notNull, **unique** (1 pesanan selesai maksimal 1 ulasan)
  - `productId`: FK `products.id` (`onDelete: 'set null'`), nullable
  - `sellerId`: FK `users.id` (`onDelete: 'cascade'`), notNull
  - `reviewerName`: `varchar('reviewer_name', { length: 120 }).notNull()`
  - `rating`: `int('rating', { unsigned: true }).notNull()` (divalidasi integer `1..5`)
  - `comment`: `text('comment').notNull()`
  - `endorsementTags`: `varchar('endorsement_tags', { length: 255 })` (nullable, string dipisah koma dari daftar resmi: `'Rapi & Berkualitas'`, `'Tepat Waktu'`, `'Ramah & Sopan'`, `'Harga Sesuai'`, `'Solutif'`)
  - `createdAt`: timestamp

---

## 4. Kontrak API Backend ElysiaJS (`/api/*`)

Seluruh endpoint wajib memakai validasi `t.Object(...)` Elysia dan menyertakan middleware `securityHeaders`.

### 4.1. Modul Auth (`src/server/modules/auth.routes.ts`)
- `POST /api/auth/register` (Rate limit: **5 req/menit per IP**, multipart/form-data atau JSON):
  - Field: `email`, `firstName`, `lastName`, `username`, `password` (min 6), `confirmPassword`, `phoneNumber`, `userType` (`'smk' | 'public' | 'teacher'`), `avatar?` (File), `schoolName?`, `nisn?`, `nip?`, `major?`, `skills?`, `businessName?`, `businessType?`.
  - Validasi khusus: jika `userType === 'smk'` atau `'teacher'`, `schoolName` **wajib diisi**.
  - Jika ada file `avatar`, konversi ke WebP (`maxWidth: 400`).
  - Buat session baru, set HTTP-only cookie `voc_session`, kembalikan `{ user }`.
- `POST /api/auth/login` (Rate limit: **5 req/menit per login+IP**):
  - Field: `identifier` (bisa berupa Email atau Username), `password`, `remember?` (boolean).
  - Verifikasi `Bun.password.verify(password, user.password)`. Set cookie `voc_session`, kembalikan `{ user }`.
- `POST /api/auth/logout` (Auth): Hapus baris di tabel `sessions`, clear cookie `voc_session`.
- `GET /api/auth/me`: Mengembalikan `{ user: CurrentUser | null }` beserta jumlah pesanan masuk yang berstatus `'requested'` (`pendingOrdersCount`) untuk badge angka di navigasi siswa.

### 4.2. Modul Katalog & Karya (`src/server/modules/posts.routes.ts`)
- `GET /api/categories`: Daftar seluruh kategori beserta jumlah karya aktif.
- `GET /api/posts`:
  - Query params: `type?` (`product|service|portfolio`), `categoryId?`, `q?` (pencarian teks), `school?`, `verifiedOnly?` (`1`), `page` (default 1), `limit` (default 12).
  - Response: `{ items, total, page, totalPages, suggestedCreators }`.
  - **Privasi Wajib:** Objek `post` publik **TIDAK BOLEH** menyertakan `costPrice`, `user.phoneNumber`, `user.nisn`, atau `user.password`. Sertakan agregat kreator (`isVerified`, `schoolName`, `major`) dan jumlah ulasan/rating karya.
- `GET /api/posts/:id`:
  - Detail lengkap 1 karya + info kreator (termasuk total pesanan selesai & rata-rata rating siswa) + info guru peninjau (jika `isVerifiedByTeacher === true`) + daftar `reviews` karya tersebut + 3 karya lain dari siswa yang sama.
  - Menaikkan `viewsCount` (+1) dengan deduplikasi per IP/User selama 30 menit agar refresh berulang tidak menggelembungkan angka.
  - Hanya jika `currentUser.id === post.userId` (atau guru satu sekolah), sertakan `costPrice` agar form Edit dapat menampilkan harga modalnya.
- `POST /api/posts` (Auth: `smk`, Rate limit: **10 req/menit**, `multipart/form-data`):
  - Menerima `type` (`'product' | 'service' | 'portfolio'`), `name`, `categoryId?`, `description`, `image` (File wajib), `price?`, `costPrice?`, `stock?`, `priceMin?`, `priceMax?`, `projectLink?`.
  - Konversi `image` ke WebP (`maxWidth: 1280`), simpan ke `public/uploads/posts/`.
- `PUT /api/posts/:id` (Auth: hanya pemilik karya `post.userId === currentUser.id`; jika bukan pemilik kembalikan **HTTP 403**):
  - Memperbarui detail karya; `image` bersifat opsional (jika diunggah baru, konversi ke WebP).
- `DELETE /api/posts/:id` (Auth: hanya pemilik karya; jika bukan pemilik kembalikan **HTTP 403**):
  - Jika karya sudah pernah memiliki `orders`, ubah `status = 'archived'` agar riwayat Paspor Kerja tidak rusak; jika belum pernah dipesan, hapus barisnya.
- `POST /api/posts/:id/like` (Rate limit: **30 req/menit**):
  - Toggle baris di `post_likes` berdasarkan `actorKey` dan sinkronkan `products.likesCount`. Mengembalikan `{ success: true, isLiked: boolean, likesCount: number }`.
- `POST /api/posts/:id/share`: Increment `sharesCount`, kembalikan `{ sharesCount }`.
- `GET /api/search?q=...` (Rate limit: **60 req/menit**):
  - Escape karakter `%`, `_`, `\` pada query; kembalikan maks. 6 karya & 5 kreator SMK.

### 4.3. Modul Pesanan & Ulasan (`src/server/modules/orders.routes.ts`)
- `POST /api/orders` (Boleh **Guest / Tanpa Login** maupun User Login, Rate limit: **10 req/menit per IP**):
  - Input: `productId`, `buyerName` (min 2 karakter), `buyerPhone` (min 9 digit angka), `quantity` (default 1, min 1), `buyerAddress?`, `buyerNotes?`.
  - Validasi: Karya harus berstatus `'published'`, bukan bertipe `'portfolio'`, jika `'product'` maka `stock >= quantity`, dan pembeli tidak boleh memesan karyanya sendiri.
  - Hitung `agreedPrice = (post.type === 'service' ? (post.priceMin || post.price) : post.price) * quantity` dan `unitCostSnapshot = post.costPrice * quantity`.
  - Generate `orderCode` (`VOC-ORD-YYMMDD-XXXX`) dan `reviewToken` (48 karakter hex acak).
  - Kembalikan `{ orderCode, reviewToken, trackUrl: "/pesanan/" + orderCode + "?token=" + reviewToken, whatsappUrl }`.
- `GET /api/orders/track/:orderCode?token=...`:
  - Akses diizinkan jika `token` cocok (`timingSafeEqual` dengan `order.reviewToken`) **ATAU** user login adalah `buyerId` / `sellerId` / Guru satu sekolah dengan `sellerId`. Jika tidak valid → **HTTP 403**.
  - Mengembalikan detail pesanan, tahapan status, `whatsappToSellerUrl` (nomor WA siswa hanya diberikan di sini kepada pemesan sah, lengkap dengan teks pesan otomatis berisi `orderCode`), foto bukti `proofImage`, dan `review` jika sudah ada.
- `GET /api/seller/orders` (Auth: `smk`):
  - Mengembalikan daftar seluruh pesanan yang masuk ke siswa (`sellerId === currentUser.id`) beserta ringkasan hitungan: `{ requestedCount, activeCount, completedCount, totalRevenue }`.
- `PATCH /api/seller/orders/:id/status` (Auth: hanya `order.sellerId === currentUser.id`, `multipart/form-data` atau JSON):
  - Input: `status` (`'accepted' | 'in_progress' | 'completed' | 'cancelled'`), `agreedPrice?` (angka baru jika setelah negosiasi jasa di WA ada perubahan harga), `progressNote?`, `proofImage?` (File WebP bukti hasil pengerjaan).
  - Aturan transisi status yang sah:
    - `requested` → `accepted` atau `cancelled` (set `acceptedAt = now`)
    - `accepted` → `in_progress`, `completed`, atau `cancelled`
    - `in_progress` → `completed` atau `cancelled`
  - Saat berubah ke `'completed'` di dalam `db.transaction`:
    - Set `completedAt = now`.
    - Jika `product.type === 'product'`, kurangi `product.stock = Math.max(0, product.stock - order.quantity)`.
  - Kembalikan pesanan terbaru beserta `whatsappToBuyerUrl` (untuk mengirim link lacak & form ulasan ke WA pembeli dalam 1 klik!).
- `POST /api/orders/:orderCode/review`:
  - Input: `token` (atau login sebagai `buyerId`), `rating` (integer `1..5`), `comment` (min 5 karakter), `endorsementTags?` (array dari daftar resmi).
  - Validasi ketat:
    1. Token harus cocok dengan `order.reviewToken` (atau `currentUser.id === order.buyerId`).
    2. `order.status` **WAJIB** `'completed'` (jika belum selesai → **HTTP 422** `"Pesanan belum selesai"`).
    3. Belum ada ulasan untuk `order.id` ini (jika sudah ada → **HTTP 409** `"Ulasan sudah pernah dikirim"`).

### 4.4. Modul Guru Pembimbing (`src/server/modules/teacher.routes.ts`)
Semua endpoint di bawah ini wajib middleware `requireRole('teacher')`:
- `GET /api/teacher/dashboard`:
  - Mencari seluruh siswa (`userType === 'smk'`) dan karya siswa yang memiliki `LOWER(TRIM(schoolName)) === LOWER(TRIM(teacher.schoolName))`.
  - Mengembalikan daftar siswa, daftar karya siswa sekolah tersebut, dan rekap statistik sekolah (`totalStudents`, `verifiedStudents`, `totalCompletedOrders`, `totalSchoolRevenue`).
- `POST /api/teacher/students/:id/verify`:
  - Memastikan siswa berasal dari sekolah yang sama dengan guru (jika beda sekolah → **HTTP 403**).
  - Toggle `isVerified` pada siswa, isi `verifiedBy = teacher.id` dan `verifiedAt = new Date()`.
- `POST /api/teacher/posts/:id/verify`:
  - Memastikan karya milik siswa dari sekolah yang sama (jika beda sekolah → **HTTP 403**).
  - Input: `isVerified` (boolean), `teacherNote?` (string maks. 255 karakter, misal `"Lolos uji kualitas bengkel TeFa sekolah"`).

### 4.5. Modul Profil & Paspor Kerja (`src/server/modules/profile.routes.ts`)
- `GET /api/profile/:username`:
  - Data profil publik user, lencana verifikasi guru, metrik (`completedOrdersCount`, `avgRating`, `reviewsCount`, `topEndorsedTags`), daftar karya yang dipublikasikan, dan 5 ulasan terbaru.
  - Jika user memiliki `buyerId` pesanan sendiri (saat melihat profil sendiri), tampilkan juga daftar **"Pesanan Saya"** agar pembeli yang login mudah melacak pesanannya.
- `GET /api/passport/:username`:
  - Khusus user `userType === 'smk'` (jika bukan → 404).
  - Mengembalikan dokumen lengkap **Paspor Kerja / CV Digital**:
    - Identitas siswa, sekolah, jurusan, keahlian, nama Guru Pembimbing yang memverifikasi (`verifierName`, `verifiedAt`).
    - **Level Pengalaman** berdasarkan `completedOrdersCount`:
      - `0`: `"Kreator Pemula"`
      - `1..4`: `"Mitra Muda Teruji"`
      - `5..14`: `"Talenta Vokasi Terpercaya"`
      - `15+`: `"Profesional Muda Siap Industri"`
    - **Statistik Terbukti:** `completedOrdersCount`, `uniqueCustomersCount`, `avgRating`, `reviewsCount`, `totalProjectValue` (jumlah `agreedPrice` selesai), `tefaApprovedWorksCount`.
    - **Keahlian Diakui Pelanggan (`endorsedSkills`):** frekuensi tiap tag dari `reviews.endorsementTags`.
    - **Riwayat Pekerjaan Nyata (`workHistory`):** daftar pesanan `completed` (judul karya, tanggal selesai, foto bukti `proofImage`, rating & kutipan testimoni pelanggan — nama pelanggan disamarkan sopan misal `"Budi S."` kecuali memilih tampil penuh).
    - **Karya Portofolio Unggulan (`featuredWorks`):** karya berstempel guru (`isVerifiedByTeacher`) & karya terpopuler.
    - **`qrSvg`:** String SVG murni dari `QrService.generateSvg(`${APP_URL}/paspor-kerja/${user.username}`)` + kode verifikasi unik `VOC-PASS-${user.id.toString().padStart(5, '0')}`.

### 4.6. Penyuntik Meta Open Graph HTML (`src/server/services/og.service.ts`)
Saat browser atau crawler WhatsApp melakukan `GET /karya/:id` atau `GET /paspor-kerja/:username`:
- Server membaca template HTML utama (`dist/index.html` saat prod, atau `index.html` saat diakses langsung ke port `:3000`) dan mengganti `<title>`, `<meta name="description">`, `<meta property="og:title">`, `<meta property="og:description">`, `<meta property="og:image">`, dan `<meta property="og:url">` dengan data asli dari MySQL.

---

## 5. Spesifikasi Halaman Frontend Svelte 5 (`src/client/`)

Seluruh navigasi antar-halaman menggunakan History API (`pushState` + `popstate` di `router.svelte.ts`) tanpa *full page reload*:

1. **`Navbar.svelte` (Navigasi Adaptif & Selalu Berlabel):**
   - **Desktop (`lg:flex`):** Sidebar kiri bersih (`w-64 bg-white border-r border-slate-200`), logo VOC-Market di atas, menu dengan ikon Lucide + teks ukuran `text-base font-medium`. Item aktif berwarna `bg-blue-50 text-blue-700 font-semibold`.
   - **Mobile (`lg:hidden`):** Header atas tipis (Logo + tombol Masuk/Profil) & **Bottom Navigation Bar** tetap di bawah (`h-16 bg-white border-t border-slate-200`) dengan **Ikon + Teks Label Jelas**:
     - Tamu / Pembeli: `Beranda` · `Pesanan` · `Masuk`
     - Siswa SMK: `Beranda` · `Jual Karya` · `Pesanan` (dengan titik angka merah jika ada order baru) · `Paspor` · `Profil`
     - Guru Pembimbing: `Beranda` · `Panel Guru` · `Profil`
2. **`HomePage.svelte` (Etalase Katalog Ramah Awam — Bukan Feed Sosmed Membingungkan):**
   - Bagian atas: **Kotak Pencarian Langsung** besar (`h-12`, placeholder *"Cari kue, servis motor, desain logo, atau nama SMK..."*) dengan debounce 300ms.
   - Baris filter 1: Tab jelas `Semua`, `Barang Siap Beli`, `Jasa & Layanan`, `Portofolio Karya`.
   - Baris filter 2: Chip kategori horizontal yang mudah disentuh jari.
   - Konten utama: **Grid Katalog** (`grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5`) menggunakan `PostCard.svelte`. Setiap kartu menampilkan foto rasio 4:3 bersih, label Bahasa Indonesia, badge `"✔ Stempel Guru"` jika ada, judul (`text-base font-bold`), harga tebal (`text-lg font-extrabold text-blue-700`), nama siswa & SMK, serta tombol `"Lihat & Pesan"`.
3. **`PostDetailPage.svelte` (`/karya/:id`):**
   - Galeri foto karya, badge tipe & kategori, harga jelas, stok, tombol Suka (Like) & Bagikan (menyalin link + menampilkan Toast lembut).
   - **Kotak Stempel Kurasi Guru (TeFa)** berwarna hijau lembut jika `isVerifiedByTeacher === true` beserta nama guru & catatannya.
   - **Kartu Profil Pembuat** (Nama siswa, badge Terverifikasi Sekolah, SMK & Jurusan, rata-rata rating, jumlah pesanan selesai, link ke Profil & Paspor Kerja).
   - **Form Pemesanan Cepat 1-Layar** (untuk `Barang` & `Jasa`):
     - Judul ramah: *"Pesan Langsung Karya Siswa Ini (Tanpa Perlu Daftar Akun)"*.
     - Input: Nama Lengkap Anda, Nomor WhatsApp Aktif, Jumlah (untuk barang), Alamat/Lokasi (opsional), Catatan Pesanan.
     - Tombol hijau besar (`h-12`): **"Buat Pesanan & Hubungi Siswa"**.
   - Jika yang membuka adalah pemilik karya: tampilkan tombol **"Edit Karya"** dan **"Hapus Karya"** (dengan `ConfirmModal.svelte`).
4. **`PostFormPage.svelte` (`/jual` & `/karya/:id/edit` — Wizard 3 Langkah):**
   - Langkah 1: *"Apa yang ingin kamu tampilkan?"* (3 kartu pilihan besar dengan penjelasan sederhana: **Barang Buatanmu**, **Jasa / Keahlianmu**, **Portofolio Proyek**) + Upload Foto dengan preview instan.
   - Langkah 2: Nama Karya, Kategori, dan Harga (otomatis menyesuaikan: Harga Jual + Modal + Stok untuk Barang; Tarif Minimal–Maksimal untuk Jasa; Link Demo untuk Portofolio).
   - Langkah 3: Deskripsi lengkap + Ringkasan Preview sebelum klik **"Terbitkan Sekarang"**.
5. **`OrderTrackPage.svelte` (`/pesanan/:orderCode?token=...`):**
   - Menampilkan Kode Pesanan, `OrderStepper.svelte` 4 tahap yang sangat jelas bagi orang awam, kotak pengingat *"Simpan halaman ini untuk melacak pesanan & memberi ulasan nanti"*, tombol hijau besar **"Lanjut Chat WhatsApp dengan Siswa"**, foto bukti penyelesaian dari siswa (jika ada), dan **Form Rating Bintang + Pilihan Chip Pujian (`Rapi & Berkualitas`, `Tepat Waktu`, dll.) + Testimoni** begitu status pesanan mencapai `Selesai`.
6. **`SellerOrdersPage.svelte` (`/pesanan-masuk`):**
   - 4 Kartu ringkasan di atas (Pesanan Baru, Sedang Dikerjakan, Selesai, Total Nilai Proyek).
   - Daftar pesanan masuk dengan tombol aksi 1-klik sesuai tahap (`Terima Pesanan` → `Mulai Kerjakan` → `Unggah Bukti & Selesaikan`), input penyesuaian harga kesepakatan, dan tombol **"Kirim Link Ulasan ke WA Pembeli"** setelah selesai.
7. **`TeacherDashboardPage.svelte` (`/dashboard/guru`):**
   - Ringkasan aktivitas sekolah, Tab **Verifikasi Siswa** (daftar siswa satu sekolah dengan tombol toggle *"Verifikasi Siswa Resmi"*) dan Tab **Kurasi Karya TeFa** (daftar karya siswa satu sekolah dengan input catatan rekomendasi guru & tombol *"Beri Stempel Kualitas Guru"*).
8. **`PassportPage.svelte` (`/paspor-kerja/:username`):**
   - Header tindakan (`print:hidden`): tombol **"Cetak / Simpan PDF"** (`window.print()`) dan **"Bagikan Link CV"**.
   - Lembar dokumen profesional bergaya sertifikat/CV modern: Foto & Identitas Siswa, Badge Verifikasi Guru SMK, Level Pengalaman, 4 Kotak Metrik Terbukti, Chip Keahlian yang Diakui Pelanggan, Daftar Riwayat Proyek Selesai beserta kutipan ulasan asli, Karya Unggulan, dan **Kotak QR Code Verifikasi Digital** di pojok dokumen.

---

## 6. Checklist Pengujian Wajib (`bun test`) — Kriteria Lulus Tier 1

Sebelum Tier 1 dinyatakan selesai, jalankan `bun test` (menggunakan `voc_market_test`) dan pastikan **100% skenario berikut LULUS**:

- [ ] **Security & Headers:** Setiap response memiliki header `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, dan `Permissions-Policy`.
- [ ] **Auth & Rate Limiter:**
  - Registrasi Siswa SMK, Pembeli Umum, dan Guru Pembimbing berhasil & membuat cookie `voc_session` (`HttpOnly`).
  - Login berhasil baik menggunakan `email` maupun `username`.
  - Percobaan login gagal ke-6 dalam 1 menit diblokir dengan HTTP `429`.
- [ ] **Upload WebP & Privasi Data:**
  - Upload gambar PNG/JPEG pada registrasi dan pembuatan produk otomatis tersimpan sebagai file `.webp` valid (magic bytes `RIFF....WEBP`).
  - Endpoint publik `GET /api/posts` dan `GET /api/search` **tidak pernah** membocorkan field `costPrice`, `phoneNumber`, `nisn`, atau `password`.
- [ ] **Katalog, Detail, Edit/Hapus & Like Anti-Spam:**
  - `GET /api/posts/:id` menaikkan `viewsCount` pada kunjungan pertama dan tidak naik ganda saat dipanggil ulang dari sesi/IP yang sama.
  - Pemilik karya dapat `PUT /api/posts/:id` dan `DELETE /api/posts/:id`; user lain yang mencoba mengedit/menghapus mendapat **HTTP 403**.
  - `POST /api/posts/:id/like` melakukan toggle `isLiked: true` → `isLiked: false` secara akurat.
- [ ] **Alur Pesanan Tamu & Pengurangan Stok:**
  - Pembeli tanpa login (`guest`) berhasil membuat pesanan `POST /api/orders` dan mendapatkan `orderCode` + `reviewToken`.
  - Mengakses `GET /api/orders/track/:orderCode` tanpa token yang benar ditolak (**HTTP 403**); dengan token yang benar mengembalikan detail pesanan & link WhatsApp siswa.
  - Siswa pemilik karya berhasil mengubah status `requested` → `accepted` → `in_progress` → `completed` beserta upload `proofImage` WebP, dan `stock` produk berkurang otomatis sesuai `quantity`.
- [ ] **Ulasan Pelanggan Terverifikasi:**
  - Mengirim ulasan sebelum status `completed` ditolak (**HTTP 422**).
  - Mengirim ulasan setelah `completed` dengan `reviewToken` valid berhasil menyimpan rating & `endorsementTags`, dan percobaan kirim ulasan kedua pada order yang sama ditolak (**HTTP 409**).
- [ ] **Verifikasi Guru & Paspor Kerja + Open Graph:**
  - Guru dari `SMKN 1 Cibinong` berhasil memverifikasi siswa & memberi stempel TeFa pada karya siswa `SMKN 1 Cibinong`, tetapi ditolak (**HTTP 403**) jika mencoba memverifikasi siswa `SMKN 4 Yogyakarta`.
  - `GET /api/passport/:username` mengembalikan jumlah pesanan selesai, rata-rata rating, daftar ulasan nyata, status verifikasi guru, dan SVG QR Code (`<svg...`).
  - `GET /karya/:id` dan `GET /paspor-kerja/:username` (HTML route) menyertakan `<meta property="og:title"` dengan nama karya/siswa yang sesuai.
  - `bun run build` (kompilasi Vite Svelte 5 + TypeScript) selesai tanpa error!

