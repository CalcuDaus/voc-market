export const POST_TYPE_LABELS: Record<'product' | 'service' | 'portfolio', string> = {
  product: 'Barang',
  service: 'Jasa & Layanan',
  portfolio: 'Portofolio Karya'
};

export const ORDER_STATUS_LABELS: Record<
  'requested' | 'accepted' | 'in_progress' | 'completed' | 'cancelled',
  string
> = {
  requested: 'Menunggu Konfirmasi',
  accepted: 'Diterima Siswa',
  in_progress: 'Sedang Dikerjakan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan'
};

export const ENDORSEMENT_TAGS = [
  'Rapi & Berkualitas',
  'Tepat Waktu',
  'Ramah & Sopan',
  'Harga Sesuai',
  'Solutif'
] as const;

export type EndorsementTag = (typeof ENDORSEMENT_TAGS)[number];

export const USER_ROLE_LABELS: Record<string, string> = {
  smk: 'Siswa SMK',
  public: 'Pembeli / Umum',
  teacher: 'Guru Pembimbing SMK',
  company: 'Mitra Industri',
  admin: 'Admin Platform'
};

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  open: 'Mencari Siswa',
  assigned: 'Sedang Dikerjakan',
  completed: 'Selesai',
  closed: 'Ditutup',
  expired: 'Kedaluwarsa',
  hidden: 'Disembunyikan'
};

export const WORK_MODE_LABELS: Record<'onsite' | 'remote' | 'dropoff', string> = {
  remote: 'Kerja Jarak Jauh / Online',
  onsite: 'Datang ke Lokasi',
  dropoff: 'Antar / Titip Barang'
};

export const BUDGET_TYPE_LABELS: Record<'fixed' | 'range' | 'negotiable', string> = {
  fixed: 'Harga Pasti',
  range: 'Kisaran Anggaran',
  negotiable: 'Bisa Nego / Sesuai Kesepakatan'
};

export const JOB_PREF_TYPE_LABELS: Record<'pkl' | 'magang' | 'kerja' | 'freelance', string> = {
  pkl: 'PKL / Prakerin',
  magang: 'Magang Industri',
  kerja: 'Kerja Penuh Waktu',
  freelance: 'Proyek Lepas (Freelance)'
};

export const STUDENT_STATUS_LABELS: Record<'active' | 'final_year' | 'alumni', string> = {
  active: 'Siswa Aktif (Kelas X / XI)',
  final_year: 'Siswa Tingkat Akhir (Kelas XII)',
  alumni: 'Alumni SMK'
};

export const CHALLENGE_STATUS_LABELS: Record<string, string> = {
  draft: 'Draf',
  pending_review: 'Menunggu Tinjauan Admin',
  open: 'Pendaftaran & Kirim Karya Dibuka',
  judging: 'Tahap Penjurian',
  finished: 'Selesai & Diumumkan',
  rejected: 'Ditolak Admin',
  cancelled: 'Dibatalkan'
};

export const CERTIFICATE_TYPE_LABELS: Record<
  'winner' | 'runner_up' | 'finalist' | 'participant',
  string
> = {
  winner: 'Juara Utama Tantangan Industri',
  runner_up: 'Runner-Up Tantangan Industri',
  finalist: 'Finalis Terpilih Tantangan Industri',
  participant: 'Peserta Tantangan Industri'
};

export const REPORT_REASON_LABELS: Record<string, string> = {
  penipuan: 'Indikasi Penipuan / Meminta Uang di Luar',
  konten_tidak_pantas: 'Konten Tidak Pantas / Melanggar Aturan',
  eksploitasi: 'Eksploitasi Siswa / Upah Tidak Wajar',
  spam: 'Spam / Iklan Berulang',
  lainnya: 'Lainnya'
};

export const SMK_MAJORS_LIST = [
  'Rekayasa Perangkat Lunak (RPL)',
  'Pengembangan Perangkat Lunak & Gim (PPLG)',
  'Teknik Komputer & Jaringan (TKJ)',
  'Desain Komunikasi Visual (DKV)',
  'Teknik Kendaraan Ringan (TKR)',
  'Teknik Bisnis Sepeda Motor (TBSM)',
  'Teknik Pemesinan & CNC',
  'Teknik Elektronika & IoT',
  'Tata Boga & Kuliner',
  'Tata Busana & Fesyen',
  'Akuntansi & Keuangan Lembaga',
  'Kriya Kreatif & Desain Produk'
] as const;

export function getExperienceLevelLabel(completedOrders: number): {
  level: number;
  title: string;
  subtitle: string;
} {
  if (completedOrders >= 15) {
    return {
      level: 4,
      title: 'Profesional Muda Siap Industri',
      subtitle: '15+ pesanan pelanggan nyata telah diselesaikan'
    };
  }
  if (completedOrders >= 5) {
    return {
      level: 3,
      title: 'Talenta Vokasi Terpercaya',
      subtitle: '5+ pesanan pelanggan nyata telah diselesaikan'
    };
  }
  if (completedOrders >= 1) {
    return {
      level: 2,
      title: 'Mitra Muda Teruji',
      subtitle: 'Telah melayani pesanan pelanggan nyata'
    };
  }
  return {
    level: 1,
    title: 'Kreator Pemula',
    subtitle: 'Siap menerima proyek & pesanan pertama'
  };
}

