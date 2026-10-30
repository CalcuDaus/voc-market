# 02 — Spesifikasi Eksekusi Tier 2: Penghubung ke Industri (Bun + ElysiaJS + Svelte 5 + MySQL)

> **Prasyarat Mutlak Sebelum Memulai Tier 2:**
> 1. Baca dan patuhi **[00_MASTER_CONTRACT_AND_RULES.md](00_MASTER_CONTRACT_AND_RULES.md)**.
> 2. Seluruh implementasi & test di **[01_TIER1_BUN_ELYSIA_SVELTE_PLAN.md](01_TIER1_BUN_ELYSIA_SVELTE_PLAN.md)** **WAJIB sudah selesai dan `bun test` lulus 100%**.
> **Cakupan Dokumen Ini:** Fondasi Wilayah & Sekolah, Peran Perusahaan & Admin, Notifikasi Real-time WebSocket, **Etalase Sekolah (#9)**, **Papan "Butuh Bantuan" (#6)**, **Status "Siap Kerja" & Cari Talenta (#8)**, serta **Tantangan Industri + Sertifikat QR (#7)**.

---

## 1. Tambahan Package Tier 2 (`package.json`)

**HANYA** tambahkan 1 plugin resmi Elysia berikut (jangan menambah library berat lain):
- `@elysiajs/cron` — Untuk menjalankan job terjadwal di dalam proses Bun (`expireRequests`, `syncChallengeStatus`, `expireInvitations`, `recalculateStats`).

> **Catatan:** WebSocket tidak butuh package eksternal karena `app.ws('/ws', ...)` sudah bawaan native **ElysiaJS + Bun**!

---

## 2. Peta File Baru & Perubahan File di Tier 2

```text
src/
├── server/
│   ├── db/
│   │   ├── backfill-schools.ts           # Script normalisasi users.schoolName -> tabel schools & schoolId
│   │   ├── data/
│   │   │   └── regions.json              # Data Kabupaten/Kota seluruh provinsi Indonesia
│   │   └── schema/
│   │       ├── schools.ts                # Tabel regions & schools (+ kolom baru di users & products)
│   │       ├── requests.ts               # Tabel job_requests & job_proposals (+ jobRequestId di orders)
│   │       ├── talent.ts                 # Tabel hiring_invitations & saved_talents
│   │       ├── challenges.ts             # Tabel challenges, challenge_submissions, certificates
│   │       └── system.ts                 # Tabel notifications & reports
│   ├── services/
│   │   ├── stats.service.ts              # Kalkulasi denormalisasi stat_* & rumus talent_score
│   │   ├── notify.service.ts             # Simpan ke tabel notifications + push live ke WebSocket /ws
│   │   └── cron.service.ts               # Pendaftaran @elysiajs/cron (dinonaktifkan otomatis saat NODE_ENV==='test')
│   └── modules/
│       ├── ws.routes.ts                  # app.ws('/ws') autentikasi via cookie voc_session
│       ├── notifications.routes.ts       # /api/notifications/* & /api/reports
│       ├── admin.routes.ts               # /api/admin/* (verifikasi perusahaan, sekolah, moderasi tantangan, laporan)
│       ├── schools.routes.ts             # /api/regions, /api/schools/*
│       ├── requests.routes.ts            # /api/requests/*, /api/proposals/*
│       ├── talent.routes.ts              # /api/open-to-work, /api/talent/*, /api/invitations/*
│       └── challenges.routes.ts          # /api/challenges/*, /api/company/challenges/*, /api/certificates/:code
└── client/
    ├── lib/
    │   ├── ws.svelte.ts                  # Koneksi WebSocket auto-reconnect -> update angka lonceng & munculkan Toast live
    │   └── components/
    │       ├── NotificationBell.svelte   # Lonceng dengan badge unreadCount real-time
    │       ├── ReportModal.svelte        # Modal "Laporkan Konten" ramah awam
    │       ├── SchoolAutocomplete.svelte # Input pilih sekolah resmi dari /api/schools?q=
    │       ├── RequestCard.svelte        # Kartu permintaan "Butuh Bantuan"
    │       ├── TalentCard.svelte         # Kartu kandidat siswa "Siap Kerja"
    │       └── ChallengeCard.svelte     # Kartu Tantangan Industri + hitung mundur
    └── pages/
        ├── OpportunitiesHubPage.svelte   # Hub /peluang khusus siswa (Tab: Butuh Bantuan | Tantangan | Undangan Kerja)
        ├── SchoolsDirectoryPage.svelte   # Direktori /sekolah
        ├── SchoolShowPage.svelte         # Etalase Sekolah /sekolah/:slug (Tab: Karya | Unit TeFa | Siswa Berprestasi | Prestasi)
        ├── SchoolManagePage.svelte       # Pengaturan Etalase oleh Guru Admin Sekolah
        ├── RequestsBoardPage.svelte      # Daftar /butuh-bantuan + filter wilayah/kategori + urutan "Cocok Untukmu"
        ├── RequestFormPage.svelte        # Wizard 3 langkah posting "Butuh Bantuan"
        ├── RequestDetailPage.svelte      # Detail permintaan + Form Penawaran Siswa / Perbandingan Penawaran bagi Pemosting
        ├── OpenToWorkPage.svelte         # Checklist & aktivasi badge "Siap Kerja" (/siap-kerja)
        ├── TalentSearchPage.svelte       # Pencarian kandidat bagi perusahaan terverifikasi (/talenta)
        ├── InvitationsPage.svelte        # Kotak masuk undangan siswa & daftar undangan terkirim perusahaan
        ├── ChallengesPage.svelte         # Daftar /tantangan
        ├── ChallengeDetailPage.svelte    # Brief lengkap, pengiriman karya siswa, penilaian perusahaan & galeri pemenang
        ├── CompanyChallengeForm.svelte   # Wizard 4 langkah pembuatan Tantangan Industri
        ├── CertificatePage.svelte        # Sertifikat digital A4 landscape siap cetak (/sertifikat/:code) + QR SVG
        ├── NotificationsPage.svelte      # Daftar notifikasi (/notifikasi)
        └── AdminPanelPage.svelte         # Panel moderasi Admin Platform (/admin)
```

---

## 3. Skema Database MySQL Tambahan Tier 2

### 3.1. Wilayah & Sekolah (`schema/schools.ts`)
- **`regions`**:
  - `id`: PK bigint unsigned
  - `code`: `varchar('code', { length: 10 }).notNull().unique()` (misal `'32.01'`)
  - `name`: `varchar('name', { length: 100 }).notNull()` (misal `'Kabupaten Bogor'`)
  - `province`: `varchar('province', { length: 100 }).notNull()` (misal `'Jawa Barat'`)
  - `type`: `mysqlEnum('type', ['kabupaten', 'kota']).notNull()`
- **`schools`**:
  - `id`: PK bigint unsigned
  - `npsn`: `varchar('npsn', { length: 12 }).unique()` (nullable)
  - `name`: `varchar('name', { length: 160 }).notNull()`
  - `slug`: `varchar('slug', { length: 180 }).notNull().unique()`
  - `regionId`: FK `regions.id` (`onDelete: 'set null'`), nullable
  - `address`: `varchar('address', { length: 255 })`
  - `logo`: `varchar('logo', { length: 255 })`
  - `coverImage`: `varchar('cover_image', { length: 255 })`
  - `description`: `text('description')`
  - `majors`: `json('majors').$type<string[]>()`
  - `hasTefa`: `boolean('has_tefa').notNull().default(false)`
  - `tefaDescription`: `text('tefa_description')`
  - `officialPhone`: `varchar('official_phone', { length: 30 })` (kontak resmi sekolah, **bukan** nomor pribadi siswa)
  - `website`: `varchar('website', { length: 255 })`
  - `isVerified`: `boolean('is_verified').notNull().default(false)`
  - `createdAt`, `updatedAt`

### 3.2. Kolom Tambahan pada `users`, `products`, dan `orders`
- **Pada `users`:**
  - `schoolId`: FK `schools.id` (`onDelete: 'set null'`), nullable, indexed
  - `regionId`: FK `regions.id` (`onDelete: 'set null'`), nullable, indexed
  - `isSchoolAdmin`: `boolean('is_school_admin').notNull().default(false)` (guru pengelola etalase sekolah)
  - `isAdmin`: `boolean('is_admin').notNull().default(false)` (admin platform — **tidak boleh** diisi dari endpoint register!)
  - **Field Perusahaan (`userType === 'company'`):**
    - `companyName`: `varchar('company_name', { length: 160 })`
    - `companySector`: `varchar('company_sector', { length: 100 })`
    - `companyWebsite`: `varchar('company_website', { length: 255 })`
    - `companyNib`: `varchar('company_nib', { length: 30 })`
    - `companyVerifiedAt`: `timestamp('company_verified_at')` (nullable — diisi oleh Admin)
  - **Field "Siap Kerja" (#8):**
    - `studentStatus`: `mysqlEnum('student_status', ['active', 'final_year', 'alumni'])` (nullable)
    - `graduationYear`: `int('graduation_year', { unsigned: true })` (nullable)
    - `openToWork`: `boolean('open_to_work').notNull().default(false)`
    - `openToWorkSince`: `timestamp('open_to_work_since')`
    - `headline`: `varchar('headline', { length: 140 })`
    - `jobPreferences`: `json('job_preferences').$type<{ types: ('pkl'|'magang'|'kerja'|'freelance')[]; regionIds: number[]; willingToRelocate: boolean }>()`
  - **Statistik Tersimpan (diperbarui `StatsService.refreshStudentStats(userId)`):**
    - `statCompletedOrders`: `int('stat_completed_orders', { unsigned: true }).notNull().default(0)`
    - `statAvgRating`: `decimal('stat_avg_rating', { precision: 3, scale: 2 }).notNull().default('0.00')`
    - `statReviewsCount`: `int('stat_reviews_count', { unsigned: true }).notNull().default(0)`
    - `statCertificatesCount`: `int('stat_certificates_count', { unsigned: true }).notNull().default(0)`
    - `talentScore`: `decimal('talent_score', { precision: 6, scale: 2 }).notNull().default('0.00')`
    - `lastActiveAt`: `timestamp('last_active_at')`
- **Pada `products`:**
  - `schoolId`: FK `schools.id` (`onDelete: 'set null'`), nullable (otomatis disalin dari `user.schoolId`)
  - `isTefa`: `boolean('is_tefa').notNull().default(false)` (ditandai oleh Guru Pembimbing sekolahnya)
  - `tefaUnit`: `varchar('tefa_unit', { length: 120 })` (nullable)
- **Pada `orders`:**
  - `jobRequestId`: FK `job_requests.id` (`onDelete: 'set null'`), nullable

### 3.3. Papan "Butuh Bantuan" (`schema/requests.ts`)
- **`job_requests`**:
  - `id`: PK bigint unsigned
  - `code`: `varchar('code', { length: 28 }).notNull().unique()` (`VOC-REQ-YYMMDD-XXXX`)
  - `userId`: FK `users.id` (`onDelete: 'cascade'`), notNull (Pemosting **wajib login** demi keamanan siswa di bawah umur!)
  - `categoryId`: FK `categories.id` (`onDelete: 'set null'`), nullable
  - `title`: `varchar('title', { length: 140 }).notNull()`
  - `description`: `text('description').notNull()`
  - `image`: `varchar('image', { length: 255 })` (nullable, WebP)
  - `budgetType`: `mysqlEnum('budget_type', ['fixed', 'range', 'negotiable']).notNull().default('negotiable')`
  - `budgetMin`: `bigint('budget_min', { mode: 'number', unsigned: true })` (nullable)
  - `budgetMax`: `bigint('budget_max', { mode: 'number', unsigned: true })` (nullable)
  - `workMode`: `mysqlEnum('work_mode', ['onsite', 'remote', 'dropoff']).notNull().default('remote')`
  - `regionId`: FK `regions.id` (`onDelete: 'set null'`), nullable
  - `locationDetail`: `varchar('location_detail', { length: 255 })` (kecamatan/patokan umum)
  - `fullAddress`: `varchar('full_address', { length: 255 })` (**HANYA dikirim ke pemosting & siswa yang penawarannya terpilih!**)
  - `neededBy`: `timestamp('needed_by')` (nullable)
  - `maxProposals`: `int('max_proposals', { unsigned: true }).notNull().default(10)`
  - `status`: `mysqlEnum('status', ['open', 'assigned', 'completed', 'closed', 'expired', 'hidden']).notNull().default('open')`
  - `assignedProposalId`: `bigint('assigned_proposal_id', { mode: 'number', unsigned: true })` (nullable)
  - `proposalsCount`: `int('proposals_count', { unsigned: true }).notNull().default(0)`
  - `viewsCount`: `int('views_count', { unsigned: true }).notNull().default(0)`
  - `expiresAt`: `timestamp('expires_at').notNull()`
  - `createdAt`, `updatedAt`
- **`job_proposals`**:
  - `id`: PK bigint unsigned
  - `jobRequestId`: FK `job_requests.id` (`onDelete: 'cascade'`), notNull
  - `userId`: FK `users.id` (`onDelete: 'cascade'`), notNull (Siswa `userType === 'smk'`)
  - `message`: `text('message').notNull()`
  - `offeredPrice`: `bigint('offered_price', { mode: 'number', unsigned: true }).notNull()`
  - `estimatedDays`: `int('estimated_days', { unsigned: true }).notNull()`
  - `portfolioProductId`: FK `products.id` (`onDelete: 'set null'`), nullable
  - `status`: `mysqlEnum('status', ['pending', 'accepted', 'rejected', 'withdrawn']).notNull().default('pending')`
  - `createdAt`, `updatedAt`
  - **Unique Index:** `(jobRequestId, userId)` (1 siswa maksimal 1 penawaran per permintaan)

### 3.4. Undangan Kerja & Simpan Talenta (`schema/talent.ts`)
- **`hiring_invitations`**:
  - `id`, `companyId` (FK `users`), `studentId` (FK `users`), `type` (`'pkl'|'magang'|'kerja'|'freelance'`), `position` (`varchar(120)`), `message` (`text`), `regionId` (FK `regions`, nullable), `salaryInfo` (`varchar(120)`, nullable), `status` (`'pending'|'accepted'|'declined'|'expired'|'withdrawn'`), `declineReason` (`varchar(255)`, nullable), `respondedAt`, `expiresAt`, `createdAt`, `updatedAt`.
- **`saved_talents`**:
  - `id`, `companyId` (FK `users`), `studentId` (FK `users`), `note` (`varchar(255)`, nullable), `createdAt`, unique `(companyId, studentId)`.

### 3.5. Tantangan Industri & Sertifikat (`schema/challenges.ts`)
- **`challenges`**:
  - `id`, `companyId` (FK `users`), `slug` (`varchar(180)` unique), `title` (`varchar(160)`), `summary` (`varchar(255)`), `brief` (`text`), `requirements` (`text`), `deliverables` (`text`), `judgingCriteria` (`json` array `{ name: string; weight: number }` — **total `weight` wajib `=== 100`**), `categoryId` (FK `categories`, nullable), `targetMajors` (`json` `string[]`), `coverImage` (`varchar(255)`), `rewardTypes` (`json` subset `('uang'|'sertifikat'|'magang'|'kerja'|'produk')[]`), `prizeDescription` (`text` notNull), `winnerSlots` (`int` default 3), `submissionDeadline` (`timestamp` notNull), `announcementDate` (`timestamp` notNull), `ipPolicy` (`mysqlEnum(['winner_only', 'none'])` default `'winner_only'`), `status` (`mysqlEnum(['draft', 'pending_review', 'open', 'judging', 'finished', 'rejected', 'cancelled'])` default `'draft'`), `rejectionReason` (`varchar(255)`), `submissionsCount` (`int` default 0), `viewsCount` (`int` default 0), `createdAt`, `updatedAt`.
- **`challenge_submissions`**:
  - `id`, `challengeId` (FK `challenges`), `userId` (FK `users` siswa), `title` (`varchar(160)`), `description` (`text`), `images` (`json` `string[]` 1–5 path WebP), `externalLink` (`varchar(255)`, nullable), `isPublicAfterFinish` (`boolean` default `true`), `status` (`mysqlEnum(['submitted', 'shortlisted', 'winner', 'runner_up', 'honorable', 'participant', 'disqualified'])` default `'submitted'`), `rank` (`int` nullable), `scores` (`json` `Record<string, number>` nullable), `totalScore` (`decimal(5,2)` nullable), `feedback` (`text` nullable), `submittedAt` (`timestamp`), `updatedAt`, unique `(challengeId, userId)`.
- **`certificates`**:
  - `id`, `code` (`varchar(24)` unique, misal `VOC-CERT-XXXXXXXX`), `userId` (FK `users`), `challengeId` (FK `challenges`, nullable), `submissionId` (FK `challenge_submissions`, nullable), `type` (`mysqlEnum(['winner', 'runner_up', 'finalist', 'participant'])`), `title` (`varchar(200)`), `issuerName` (`varchar(160)`), `issuedAt` (`timestamp`), `revokedAt` (`timestamp` nullable).

### 3.6. Notifikasi & Laporan (`schema/system.ts`)
- **`notifications`**: `id`, `userId` (FK `users`), `type` (`varchar(50)`), `title` (`varchar(160)`), `body` (`varchar(255)`), `actionUrl` (`varchar(255)`), `readAt` (`timestamp` nullable), `createdAt`.
- **`reports`**: `id`, `reporterId` (FK `users`, nullable), `targetType` (`mysqlEnum(['post', 'request', 'challenge', 'user'])`), `targetId` (`bigint` unsigned), `reason` (`mysqlEnum(['penipuan', 'konten_tidak_pantas', 'eksploitasi', 'spam', 'lainnya'])`), `details` (`text`), `status` (`mysqlEnum(['open', 'reviewed', 'actioned', 'dismissed'])` default `'open'`), `handledBy` (FK `users`, nullable), `createdAt`, `updatedAt`.

---

## 4. Aturan Logika Bisnis Kritis Tier 2 (Wajib Presisi)

### 4.1. Rumus `talentScore` di `StatsService.refreshStudentStats(userId)`
Gunakan rumus eksak berikut (skala `0.00` – `100.00`):
```ts
const ratingPart = 35 * (avgRating / 5);
const ordersPart = 25 * Math.min(1, Math.log2(1 + completedOrders) / 5);
const verifiedPart = isVerified ? 15 : 0;
const certPart = 15 * Math.min(1, activeCertificatesCount / 3);
const activePart = isActiveWithin30Days ? 10 : 0;
const talentScore = Number((ratingPart + ordersPart + verifiedPart + certPart + activePart).toFixed(2));
```
Panggil `refreshStudentStats(sellerId)` setiap kali: (a) Order menjadi `completed`, (b) Review baru masuk, (c) Guru mengubah status verifikasi siswa, (d) Sertifikat tantangan diterbitkan/dicabut.

### 4.2. Transaksi Pemilihan Penawaran "Butuh Bantuan" (`POST /api/proposals/:id/accept`)
Wajib dijalankan dalam `await db.transaction(async (tx) => { ... })`:
1. Pastikan `currentUser.id === jobRequest.userId` dan `jobRequest.status === 'open'`.
2. Ubah `proposal.status = 'accepted'`; ubah seluruh proposal `pending` lainnya di `jobRequestId` tersebut menjadi `'rejected'`.
3. Ubah `jobRequest.status = 'assigned'` dan `jobRequest.assignedProposalId = proposal.id`.
4. **Buat baris `orders` baru** dengan `source: 'job_request'`, `jobRequestId: jobRequest.id`, `productId: null`, `sellerId: proposal.userId`, `buyerId: jobRequest.userId`, `buyerName: poster.name`, `buyerPhone: poster.phoneNumber`, `agreedPrice: proposal.offeredPrice`, `status: 'accepted'`, `acceptedAt: new Date()`, beserta `orderCode` & `reviewToken`.
5. Kirim notifikasi live (`NotifyService.send`) ke siswa terpilih (`ProposalAccepted`) dan siswa lain (`ProposalRejected`).
6. Saat order tersebut nanti diselesaikan (`status === 'completed'`), otomatis perbarui `job_requests.status = 'completed'`.

### 4.3. Perlindungan Siswa pada Fitur "Siap Kerja" & Undangan Industri
1. **Checklist Aktivasi `openToWork = true` (`PUT /api/open-to-work`):**
   - Tolak dengan HTTP `422` beserta daftar `missingFields` jika salah satu belum terpenuhi: `schoolId` (atau `schoolName`), `major`, `skills`, `headline`, dan memiliki minimal `1` karya berstatus `published`.
   - Jika `studentStatus === 'active'` (siswa kelas X/XI), jenis peluang yang diizinkan di `jobPreferences.types` **hanya** `['pkl', 'freelance']` (tidak boleh `'kerja'` penuh waktu).
2. **Privasi Kontak & Notifikasi Guru (`POST /api/talent/:username/invite`):**
   - Hanya perusahaan yang sudah diverifikasi Admin (`companyVerifiedAt !== null`) yang boleh mengakses `/api/talent` dan mengirim undangan (perusahaan belum terverifikasi → **HTTP 403**).
   - Nomor WhatsApp & email siswa **DILARANG** muncul di response `/api/talent`.
   - Saat perusahaan mengirim undangan, kirim notifikasi ke **siswa** DAN ke seluruh **Guru Pembimbing di sekolah yang sama (`schoolId`)**.
   - Nomor WhatsApp siswa baru dikembalikan ke perusahaan setelah siswa menekan `POST /api/invitations/:id/accept`.

### 4.4. Anti-Eksploitasi pada Tantangan Industri
1. Tantangan baru dibuat dengan `status = 'draft'` → diajukan perusahaan ke `'pending_review'` → hanya tampil ke siswa setelah disetujui Admin (`'open'`).
2. Sebelum tantangan berstatus `'finished'`, endpoint `GET /api/challenges/:slug` **DILARANG** menampilkan daftar karya kiriman peserta lain (mencegah plagiarisme antar-siswa). Hanya perusahaan pemilik tantangan & siswa pemilik karya itu sendiri yang bisa melihat karyanya.
3. Saat perusahaan memanggil `POST /api/company/challenges/:slug/announce`:
   - Validasi bahwa semua peserta dengan status `'winner'`, `'runner_up'`, atau `'shortlisted'` **sudah memiliki `feedback` tidak kosong** (jika ada yang kosong → **HTTP 422**).
   - Terbitkan baris `certificates` otomatis untuk pemenang, runner-up, finalis, dan peserta yang valid (`status !== 'disqualified'`), perbarui `refreshStudentStats` tiap peserta, dan ubah tantangan ke `'finished'`.

---

## 5. Checklist Pengujian Wajib (`bun test`) — Kriteria Lulus Tier 2

Seluruh test Tier 1 **tetap harus lulus 100%**, ditambah test baru di `tests/tier2-*.test.ts`:

- [ ] **Sekolah & Etalase (#9):** Backfill sekolah menggabungkan nama SMK yang sama ke satu `schoolId`; `/api/schools/:slug` mengembalikan statistik, karya siswa, dan tab produk TeFa; hanya guru dengan `isSchoolAdmin === true` di sekolah tersebut yang bisa mengedit etalase (guru lain 403).
- [ ] **Papan Butuh Bantuan (#6):** Warga berhasil memposting permintaan; `fullAddress` tersembunyi dari publik; batas `maxProposals` ditegakkan; memilih 1 penawaran otomatis membuat `Order` (`source = 'job_request'`) dan menolak penawaran lain; menyelesaikan order mengubah permintaan menjadi `completed`.
- [ ] **Siap Kerja & Cari Talenta (#8):** Aktivasi `openToWork` gagal (422) jika profil belum lengkap atau siswa kelas X memilih `'kerja'`; perusahaan belum diverifikasi Admin mendapat 403 saat membuka `/api/talent`; filter jurusan/wilayah/rating berjalan dan diurutkan berdasarkan `talentScore`; nomor telepon siswa tidak bocor sebelum undangan diterima; guru menerima notifikasi saat siswanya diundang.
- [ ] **Tantangan Industri & Sertifikat (#7):** Validasi total bobot `judgingCriteria === 100`; karya peserta tersembunyi dari peserta lain sebelum `finished`; pengumuman pemenang gagal (422) jika finalis belum diberi `feedback`; pengumuman yang sah menerbitkan `certificates` dengan QR SVG yang dapat diverifikasi di `/api/certificates/:code` (dan menampilkan status dicabut jika `revokedAt` terisi).
- [ ] **WebSocket & Moderasi Admin:** Admin dapat memverifikasi perusahaan (`companyVerifiedAt`), menyetujui tantangan, dan menindaklanjuti laporan (`reports`). `bun run build` lulus tanpa error TypeScript/Svelte.

