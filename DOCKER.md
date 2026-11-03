# Panduan Menjalankan VOC-Market di Docker

Panduan ini menjelaskan cara mem-build dan menjalankan aplikasi **VOC-Market** (Bun + ElysiaJS + Svelte 5 + MySQL 8.4) menggunakan **Docker** dan **Docker Compose**.

---

## 1. Persyaratan Sistem
Pastikan telah menginstal:
- [Docker Engine & Docker CLI](https://docs.docker.com/get-docker/) (v24+)
- [Docker Compose](https://docs.docker.com/compose/) (v2+)

---

## 2. Struktur File Docker
Proyek ini telah dilengkapi konfigurasi Docker siap produksi:
- `Dockerfile`: Multi-stage build (Stage 1 mengompilasi Svelte 5 via Vite, Stage 2 menjalankan server produksi Bun).
- `docker-compose.yml`: Orkestrasi terpadu kontainer aplikasi dan database MySQL 8.4 dengan healthcheck.
- `docker-entrypoint.sh`: Skrip startup otomatis yang memverifikasi database, menjalankan migrasi/seeding awal, dan memulai aplikasi.
- `.dockerignore`: Memastikan ukuran build context kecil dan cepat tanpa mengikutsertakan folder `node_modules` lokal atau file cache.
- `src/server/db/init-db.ts`: Inisialisasi database aman (*idempotent*) yang tidak menghapus data jika tabel sudah ada.

---

## 3. Cara Menjalankan dengan Satu Perintah

Cukup jalankan perintah berikut di direktori proyek:

```bash
docker compose up -d --build
```

Docker Compose akan otomatis:
1. Menyiapkan kontainer database **MySQL 8.4** dan menunggu hingga database benar-benar sehat (*healthy*).
2. Mem-build image kontainer **VOC-Market** (mengompilasi client Svelte 5 ke `/app/dist`).
3. Menjalankan skrip inisialisasi schema dan seeding data awal (wilayah, kategori, sekolah SMK, akun demo).
4. Menjalankan server Elysia pada port `3000`.

---

## 4. Mengakses Aplikasi

Buka browser dan akses:
- **Aplikasi Web**: [http://localhost:3000](http://localhost:3000)
- **Cek Status Kesehatan API**: [http://localhost:3000/api/health](http://localhost:3000/api/health)

### Akun Uji Coba (Tersedia Otomatis dari Seeding):
| Peran | Username | Password | Keterangan |
|---|---|---|---|
| **Siswa SMK** | `draz_me` | `password123` | Kreator Elektronika & IoT, SMKN 1 Cibinong |
| **Guru Pembimbing** | `guru_hendra` | `password123` | Guru TeFa & Admin Sekolah, SMKN 1 Cibinong |
| **Mitra Industri (PT)** | `mitra_solusi` | `password123` | Perusahaan / Recruiter Talenta SMK |
| **Pembeli Umum** | `warung_rahmat` | `password123` | UMKM / Konsumen Produk & Jasa SMK |
| **Super Admin** | `admin_pusat` | `password123` | Moderasi Laporan & Verifikasi Industri |

---

## 5. Perintah Manajemen Kontainer

### Melihat Log Aplikasi
```bash
# Log seluruh layanan secara real-time
docker compose logs -f

# Hanya log aplikasi VOC-Market
docker compose logs -f app

# Hanya log database MySQL
docker compose logs -f mysql
```

### Menghentikan Layanan
```bash
# Menghentikan kontainer (data tetap tersimpan di Docker Volumes)
docker compose down

# Menghentikan kontainer dan menghapus volume database (reset data)
docker compose down -v
```

### Mem-build Ulang Setelah Perubahan Kode
```bash
docker compose up -d --build app
```

---

## 6. Persistensi Data (Docker Volumes)
Data tidak akan hilang saat kontainer direstart atau diperbarui karena disimpan di volume Docker:
- `voc_market_db_data`: Menyimpan seluruh database MySQL (`/var/lib/mysql`).
- `voc_market_uploads`: Menyimpan file media yang diunggah pengguna (`/app/public/uploads` seperti avatar, foto karya, lampiran bukti TeFa, dsb).

