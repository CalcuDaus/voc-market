import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { db, pool } from './index';
import {
  badges,
  categories,
  certificates,
  challenges,
  challengeSubmissions,
  hiringInvitations,
  jobProposals,
  jobRequests,
  notifications,
  orders,
  productDailyStats,
  products,
  regions,
  reviews,
  schools,
  subdistricts,
  userBadges,
  users
} from './schema';
import { backfillSchools } from './backfill-schools';
import { StatsService } from '../services/stats.service';
import { BadgeService } from '../services/badge.service';
import { OgCardService } from '../services/og-card.service';

interface RegionSeedItem {
  code: string;
  name: string;
  province: string;
  type: 'kabupaten' | 'kota';
}

export async function runSeed(): Promise<void> {
  const defaultPassword = await Bun.password.hash('password123', {
    algorithm: 'bcrypt',
    cost: 10
  });

  // 1. Regions & Subdistricts (#12)
  const regionsRaw = await readFile(join(process.cwd(), 'src', 'server', 'db', 'data', 'regions.json'), 'utf-8');
  const regionsList = JSON.parse(regionsRaw) as RegionSeedItem[];
  await db.insert(regions).values(regionsList);
  const allRegions = await db.select().from(regions);
  const regionByCode = Object.fromEntries(allRegions.map((r) => [r.code, r.id]));

  const subdistrictsRaw = await readFile(
    join(process.cwd(), 'src', 'server', 'db', 'data', 'subdistricts.json'),
    'utf-8'
  );
  const subdistrictsList = JSON.parse(subdistrictsRaw) as Array<{
    regionCode: string;
    name: string;
    latitude: number;
    longitude: number;
  }>;

  const subdistrictInserts = subdistrictsList
    .filter((s) => regionByCode[s.regionCode])
    .map((s) => ({
      regionId: regionByCode[s.regionCode],
      name: s.name,
      latitude: s.latitude.toString(),
      longitude: s.longitude.toString()
    }));

  await db.insert(subdistricts).values(subdistrictInserts);
  const allSubdistricts = await db.select().from(subdistricts);
  const subdistrictByName = Object.fromEntries(
    allSubdistricts.map((s) => [`${s.name.toLowerCase()}_${s.regionId}`, s.id])
  );
  const findSubId = (name: string, regCode: string): number | null => {
    const regId = regionByCode[regCode];
    if (!regId) return null;
    return subdistrictByName[`${name.toLowerCase()}_${regId}`] || null;
  };

  // 2. Official Schools (Etalase Sekolah #9)
  const [smknCibinongRes] = await db.insert(schools).values({
    npsn: '20231421',
    name: 'SMKN 1 Cibinong',
    slug: 'smkn-1-cibinong',
    regionId: regionByCode['32.01'],
    subdistrictId: findSubId('Cibinong', '32.01'),
    address: 'Jl. Karadenan No. 7, Cibinong, Kabupaten Bogor, Jawa Barat',
    logo: 'https://ui-avatars.com/api/?name=SMKN+1+Cibinong&background=1d4ed8&color=fff&bold=true&size=256',
    coverImage: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=1200&q=80',
    description:
      'Pusat Keunggulan Vokasi bidang Teknologi Informasi, Rekayasa Perangkat Lunak, Elektronika IoT, dan Manufaktur CNC Presisi di Kabupaten Bogor.',
    majors: [
      'Rekayasa Perangkat Lunak (RPL)',
      'Teknik Komputer & Jaringan (TKJ)',
      'Teknik Elektronika & IoT',
      'Teknik Pemesinan & CNC'
    ],
    hasTefa: true,
    tefaDescription:
      'Teaching Factory (TeFa) Technopark SMKN 1 Cibinong melayani pembuatan perangkat IoT, aplikasi web UMKM, serta fabrikasi akrilik & logam CNC.',
    officialPhone: '02187907234',
    website: 'https://smkn1cibinong.sch.id',
    isVerified: true
  });
  const smknCibinongId = smknCibinongRes.insertId;

  const [smknMalangRes] = await db.insert(schools).values({
    npsn: '20533815',
    name: 'SMKN 3 Malang',
    slug: 'smkn-3-malang',
    regionId: regionByCode['35.73'],
    subdistrictId: findSubId('Klojen', '35.73'),
    address: 'Jl. Surabaya No. 1, Klojen, Kota Malang, Jawa Timur',
    logo: 'https://ui-avatars.com/api/?name=SMKN+3+Malang&background=16a34a&color=fff&bold=true&size=256',
    coverImage: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=80',
    description:
      'SMK Pusat Keunggulan Pariwisata, Tata Boga, Patiseri, dan Tata Busana dengan dapur produksi higienis berstandar perhotelan.',
    majors: ['Tata Boga & Patiseri', 'Tata Busana & Fesyen', 'Perhotelan'],
    hasTefa: true,
    tefaDescription:
      'Unit Produksi Bakery & Catering SMKN 3 Malang menerima pesanan kue kering, snack box rapat, dan katering instansi.',
    officialPhone: '0341551734',
    website: 'https://smkn3malang.sch.id',
    isVerified: true
  });
  const smknMalangId = smknMalangRes.insertId;

  const [smknYogyaRes] = await db.insert(schools).values({
    npsn: '20403280',
    name: 'SMKN 4 Yogyakarta',
    slug: 'smkn-4-yogyakarta',
    regionId: regionByCode['34.71'],
    subdistrictId: findSubId('Umbulharjo', '34.71'),
    address: 'Jl. Sidikan No. 60, Umbulharjo, Kota Yogyakarta, DI Yogyakarta',
    logo: 'https://ui-avatars.com/api/?name=SMKN+4+Yogya&background=d97706&color=fff&bold=true&size=256',
    coverImage: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1200&q=80',
    description:
      'Sekolah vokasi kreatif unggulan di Yogyakarta yang mencetak talenta Desain Komunikasi Visual, Kriya Kreatif, dan Kuliner.',
    majors: ['Desain Komunikasi Visual (DKV)', 'Kriya Kreatif & Desain Produk', 'Tata Boga & Kuliner'],
    hasTefa: true,
    tefaDescription:
      'Studio Kreatif TeFa DKV melayani branding kemasan produk UMKM Yogyakarta dengan bimbingan praktisi.',
    officialPhone: '0274372238',
    website: 'https://smkn4jogja.sch.id',
    isVerified: true
  });
  const smknYogyaId = smknYogyaRes.insertId;

  const [smknSurabayaRes] = await db.insert(schools).values({
    npsn: '20532211',
    name: 'SMKN 5 Surabaya',
    slug: 'smkn-5-surabaya',
    regionId: regionByCode['35.78'],
    subdistrictId: findSubId('Gubeng', '35.78'),
    address: 'Jl. Mayjen Prof. Dr. Moestopo No. 167-169, Kota Surabaya, Jawa Timur',
    logo: 'https://ui-avatars.com/api/?name=SMKN+5+Surabaya&background=dc2626&color=fff&bold=true&size=256',
    coverImage: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1200&q=80',
    description:
      'SMK Teknik legendaris di Surabaya (eks STM Pembangunan) dengan bengkel otomotif, mesin, dan kimia industri berstandar nasional.',
    majors: ['Teknik Kendaraan Ringan (TKR)', 'Teknik Bisnis Sepeda Motor (TBSM)', 'Teknik Pemesinan & CNC'],
    hasTefa: true,
    tefaDescription:
      'Bengkel TeFa Otomotif SMKN 5 Surabaya melayani perawatan berkala kendaraan ringan dan sepeda motor injeksi.',
    officialPhone: '0315934888',
    website: 'https://smkn5surabaya.sch.id',
    isVerified: true
  });
  const smknSurabayaId = smknSurabayaRes.insertId;

  // 3. Categories & 7 Official Badges (#11)
  const categoryData = [
    { name: 'Rekayasa Perangkat Lunak & Web', slug: 'rpl-web', icon: 'code' },
    { name: 'Desain Komunikasi Visual (DKV)', slug: 'dkv-desain', icon: 'palette' },
    { name: 'Teknik Komputer & Jaringan', slug: 'tkj-jaringan', icon: 'cpu' },
    { name: 'Teknik Otomotif & Mesin', slug: 'otomotif-mesin', icon: 'wrench' },
    { name: 'Tata Boga & Kuliner', slug: 'tata-boga-kuliner', icon: 'utensils' },
    { name: 'Elektronika & IoT', slug: 'elektronika-iot', icon: 'zap' },
    { name: 'Kriya Kreatif & Seni', slug: 'kriya-kreatif', icon: 'sparkles' }
  ];

  await db.insert(categories).values(categoryData);
  const allCats = await db.select().from(categories);
  const catMap = Object.fromEntries(allCats.map((c) => [c.slug, c.id]));

  await db.insert(badges).values([
    {
      slug: 'first_project',
      name: 'Langkah Pertama',
      description: 'Menyelesaikan pesanan riil perdana di VOC-Market.',
      icon: 'rocket',
      color: 'blue',
      category: 'work_ethic'
    },
    {
      slug: 'on_time_hero',
      name: 'Tepat Waktu',
      description: 'Konsisten menyelesaikan pesanan tepat waktu tanpa keterlambatan.',
      icon: 'clock',
      color: 'emerald',
      category: 'work_ethic'
    },
    {
      slug: 'quality_craft',
      name: 'Karya Berkualitas',
      description: 'Mendapat minimal 3 apresiasi hasil karya rapi dan berkualitas dari pelanggan.',
      icon: 'award',
      color: 'amber',
      category: 'quality'
    },
    {
      slug: 'five_star_streak',
      name: 'Bintang Lima Beruntun',
      description: 'Mendapatkan minimal 5 ulasan berturut-turut bintang 5 sempurna.',
      icon: 'star',
      color: 'amber',
      category: 'quality'
    },
    {
      slug: 'repeat_trusted',
      name: 'Langganan Terpercaya',
      description: 'Mendapat pesanan berulang dari pelanggan yang sama.',
      icon: 'heart',
      color: 'violet',
      category: 'entrepreneurship'
    },
    {
      slug: 'smart_hpp',
      name: 'Ahli HPP & Margin',
      description: 'Menyusun rincian HPP transparan dan margin usaha sehat pada karya.',
      icon: 'calculator',
      color: 'violet',
      category: 'entrepreneurship'
    },
    {
      slug: 'tefa_verified',
      name: 'Standar Industri TeFa',
      description: 'Karya divalidasi langsung oleh unit Teaching Factory atau Guru Pembimbing.',
      icon: 'shield-check',
      color: 'blue',
      category: 'school'
    }
  ]);

  // 4. Platform Superadmin, Admin & Industrial Company Partners
  await db.insert(users).values({
    name: 'Superadmin Skill-Hub',
    username: 'superadmin',
    firstName: 'Superadmin',
    lastName: 'Skill-Hub',
    email: 'superadmin@skillhub.id',
    password: defaultPassword,
    phoneNumber: '081100000001',
    userType: 'admin',
    isAdmin: true,
    isVerified: true,
    bio: 'Superadmin Utama Skill-Hub — Kontrol penuh atas konten karya, akun pengguna, sekolah, mitra industri, dan penegakan kebijakan hukum.'
  });

  await db.insert(users).values({
    name: 'Admin Moderasi Skill-Hub',
    username: 'admin_voc',
    firstName: 'Admin',
    lastName: 'Skill-Hub',
    email: 'admin@voc.id',
    password: defaultPassword,
    phoneNumber: '081100001111',
    userType: 'admin',
    isAdmin: true,
    isVerified: true,
    bio: 'Tim moderasi keamanan siswa SMK, verifikasi mitra industri, dan peninjauan tantangan.'
  });

  const [companyRes] = await db.insert(users).values({
    name: 'PT Nusantara Digital Kreatif',
    username: 'pt_nusantara',
    firstName: 'Rizky',
    lastName: 'Pratama (HRD)',
    email: 'hrd@nusantaratech.co.id',
    password: defaultPassword,
    phoneNumber: '081188889999',
    userType: 'company',
    regionId: regionByCode['31.74'],
    companyName: 'PT Nusantara Digital Kreatif',
    companySector: 'Teknologi Informasi & Solusi UMKM',
    companyWebsite: 'https://nusantaratech.co.id',
    companyNib: '9120304857123',
    companyVerifiedAt: new Date(),
    isVerified: true,
    avatar:
      'https://ui-avatars.com/api/?name=Nusantara+Tech&background=0f172a&color=38bdf8&bold=true&size=256',
    bio: 'Perusahaan pengembang perangkat lunak kasir & manajemen inventori untuk 15.000+ UMKM di Indonesia. Aktif merekrut lulusan & pemagang SMK terbaik.'
  });
  const companyId = companyRes.insertId;

  // 5. Teachers (Guru Pembimbing & School Admins)
  const [guruCibinongRes] = await db.insert(users).values({
    name: 'Drs. Hendra Wijaya, M.Pd.',
    username: 'guru_hendra',
    firstName: 'Hendra',
    lastName: 'Wijaya',
    email: 'hendra.guru@voc.id',
    password: defaultPassword,
    phoneNumber: '081122334455',
    userType: 'teacher',
    schoolName: 'SMKN 1 Cibinong',
    schoolId: smknCibinongId,
    regionId: regionByCode['32.01'],
    subdistrictId: findSubId('Cibinong', '32.01'),
    isSchoolAdmin: true,
    nip: '197805122005011004',
    major: 'Rekayasa Perangkat Lunak & IoT',
    bio: 'Guru Pembimbing & Koordinator Teaching Factory (TeFa) Rekayasa Perangkat Lunak SMKN 1 Cibinong.',
    isVerified: true
  });
  const guruCibinongId = guruCibinongRes.insertId;

  const [guruMalangRes] = await db.insert(users).values({
    name: 'Ibu Ratna Kusuma, S.Pd.',
    username: 'guru_ratna',
    firstName: 'Ratna',
    lastName: 'Kusuma',
    email: 'ratna.guru@voc.id',
    password: defaultPassword,
    phoneNumber: '081299887766',
    userType: 'teacher',
    schoolName: 'SMKN 3 Malang',
    schoolId: smknMalangId,
    regionId: regionByCode['35.73'],
    subdistrictId: findSubId('Klojen', '35.73'),
    isSchoolAdmin: true,
    nip: '198403212009022008',
    major: 'Tata Boga & Patiseri',
    bio: 'Koordinator Unit Produksi Kuliner & Bakery SMKN 3 Malang.',
    isVerified: true
  });
  const guruMalangId = guruMalangRes.insertId;

  // 6. SMK Students (with Open-To-Work profiles!)
  const [andreazRes] = await db.insert(users).values({
    name: 'Andreaz Pratama',
    username: 'draz_me',
    firstName: 'Andreaz',
    lastName: 'Pratama',
    email: 'andreaz@voc.id',
    password: defaultPassword,
    phoneNumber: '081234567890',
    userType: 'smk',
    schoolName: 'SMKN 1 Cibinong',
    schoolId: smknCibinongId,
    regionId: regionByCode['32.01'],
    subdistrictId: findSubId('Cibinong', '32.01'),
    nisn: '0054891234',
    major: 'Rekayasa Perangkat Lunak (RPL)',
    skills: 'TypeScript, Web Modern, Python, IoT ESP32, CNC Laser',
    studentStatus: 'final_year',
    graduationYear: 2027,
    openToWork: true,
    openToWorkSince: new Date(),
    headline: 'Fullstack Web & IoT Developer Kelas XII RPL — Siap Magang / Kerja Industri',
    jobPreferences: {
      types: ['magang', 'kerja', 'freelance'],
      regionIds: [regionByCode['32.01'], regionByCode['31.74']],
      willingToRelocate: true
    },
    lastActiveAt: new Date(),
    avatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    bio: 'Siswa kelas XII RPL yang siap membangun solusi website UMKM, IoT, dan kerajinan CNC presisi.',
    isVerified: true,
    verifiedBy: guruCibinongId,
    verifiedAt: new Date()
  });
  const andreazId = andreazRes.insertId;

  const [mayaRes] = await db.insert(users).values({
    name: 'Maya Anggraini',
    username: 'maya_art',
    firstName: 'Maya',
    lastName: 'Anggraini',
    email: 'maya@voc.id',
    password: defaultPassword,
    phoneNumber: '081987654321',
    userType: 'smk',
    schoolName: 'SMKN 4 Yogyakarta',
    schoolId: smknYogyaId,
    regionId: regionByCode['34.71'],
    subdistrictId: findSubId('Umbulharjo', '34.71'),
    nisn: '0061234567',
    major: 'Desain Komunikasi Visual (DKV)',
    skills: 'Desain Logo, Kemasan UMKM, Figma, Ilustrasi Maskot',
    studentStatus: 'final_year',
    graduationYear: 2027,
    openToWork: true,
    openToWorkSince: new Date(),
    headline: 'Desainer Brand & Kemasan Produk UMKM — Portofolio Siap Cetak',
    jobPreferences: {
      types: ['pkl', 'magang', 'freelance'],
      regionIds: [regionByCode['34.71']],
      willingToRelocate: false
    },
    lastActiveAt: new Date(),
    avatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
    bio: 'Desainer visual muda siap membantu UMKM memiliki kemasan dan logo yang menarik pembeli.',
    isVerified: false
  });
  const mayaId = mayaRes.insertId;

  const [budiRes] = await db.insert(users).values({
    name: 'Budi Santoso',
    username: 'budi_tuneup',
    firstName: 'Budi',
    lastName: 'Santoso',
    email: 'budi@voc.id',
    password: defaultPassword,
    phoneNumber: '085711223344',
    userType: 'smk',
    schoolName: 'SMKN 5 Surabaya',
    schoolId: smknSurabayaId,
    regionId: regionByCode['35.78'],
    subdistrictId: findSubId('Gubeng', '35.78'),
    nisn: '0047890123',
    major: 'Teknik Kendaraan Ringan (TKR)',
    skills: 'Tune-up Injeksi, Reset ECU, Kelistrikan Motor, Ganti Oli',
    studentStatus: 'alumni',
    graduationYear: 2026,
    openToWork: true,
    openToWorkSince: new Date(),
    headline: 'Teknisi Otomotif & Injeksi Terlatih — Siap Kerja Bengkel Resmi / Fleet',
    jobPreferences: {
      types: ['kerja', 'freelance'],
      regionIds: [regionByCode['35.78'], regionByCode['35.15']],
      willingToRelocate: true
    },
    lastActiveAt: new Date(),
    avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    bio: 'Mekanik muda terlatih standar bengkel sekolah. Melayani servis motor panggilan dengan rapi.',
    isVerified: false
  });
  const budiId = budiRes.insertId;

  const [sitiRes] = await db.insert(users).values({
    name: 'Siti Nurhaliza',
    username: 'siti_bakery',
    firstName: 'Siti',
    lastName: 'Nurhaliza',
    email: 'siti@voc.id',
    password: defaultPassword,
    phoneNumber: '087855667788',
    userType: 'smk',
    schoolName: 'SMKN 3 Malang',
    schoolId: smknMalangId,
    regionId: regionByCode['35.73'],
    subdistrictId: findSubId('Klojen', '35.73'),
    nisn: '0059988776',
    major: 'Tata Boga & Patiseri',
    skills: 'Kue Kering, Roti Manis, Snack Box Acara, Patiseri',
    studentStatus: 'final_year',
    graduationYear: 2027,
    openToWork: true,
    openToWorkSince: new Date(),
    headline: 'Pastry & Bakery Junior Chef Unit Produksi SMKN 3 Malang',
    jobPreferences: {
      types: ['magang', 'kerja'],
      regionIds: [regionByCode['35.73'], regionByCode['35.78']],
      willingToRelocate: false
    },
    lastActiveAt: new Date(),
    avatar:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=300&q=80',
    bio: 'Kreator kuliner & bakery higienis buatan langsung siswa unit produksi Tata Boga.',
    isVerified: true,
    verifiedBy: guruMalangId,
    verifiedAt: new Date()
  });
  const sitiId = sitiRes.insertId;

  // 7. Public / Buyer User
  const [pembeliRes] = await db.insert(users).values({
    name: 'Pak Rahmat Hidayat',
    username: 'warung_rahmat',
    firstName: 'Rahmat',
    lastName: 'Hidayat',
    email: 'rahmat@umkm.id',
    password: defaultPassword,
    phoneNumber: '081344556677',
    userType: 'public',
    regionId: regionByCode['32.01'],
    subdistrictId: findSubId('Cibinong', '32.01'),
    businessName: 'Kopi & Roti Nusantara',
    businessType: 'Kuliner UMKM',
    bio: 'Pemilik kedai kopi lokal yang senang memesan produk dan jasa adik-adik SMK.'
  });
  const pembeliId = pembeliRes.insertId;

  // 8. Products, Services & Portfolios (including TeFa items!)
  const [p1] = await db.insert(products).values({
    userId: sitiId,
    schoolId: smknMalangId,
    type: 'product',
    name: 'Nastar Keju Wijsman Lumer Toples 500gr Buatan Siswa Tata Boga',
    code: 'VOC-PRD-001',
    categoryId: catMap['tata-boga-kuliner'],
    description:
      'Nastar lembut menggunakan selai nanas asli tanpa pengawet dan butter Wijsman. Diproduksi higienis di dapur praktik Tata Boga SMKN 3 Malang. Cocok untuk suguhan keluarga atau hampers.',
    image:
      'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=800&q=80',
    costPrice: 35000,
    costBreakdown: { material: 24000, packaging: 4000, overhead: 3000, labor: 4000 },
    estimatedHours: '3.0',
    serviceAreaType: 'delivery',
    maxDistanceKm: 15,
    subdistrictId: findSubId('Klojen', '35.73'),
    price: 55000,
    stock: 25,
    likesCount: 47,
    viewsCount: 142,
    isVerifiedByTeacher: true,
    verifiedBy: guruMalangId,
    teacherNote: 'Lulus uji higienitas dan standar rasa Unit Produksi Tata Boga SMKN 3 Malang.',
    isTefa: true,
    tefaUnit: 'TeFa Bakery & Patiseri SMKN 3 Malang',
    status: 'published'
  });

  const [p2] = await db.insert(products).values({
    userId: mayaId,
    schoolId: smknYogyaId,
    type: 'service',
    name: 'Jasa Desain Logo & Kemasan Produk UMKM Siap Cetak',
    code: 'VOC-SRV-002',
    categoryId: catMap['dkv-desain'],
    description:
      'Membantu usaha warung, kuliner, dan kerajinan tampil profesional. Mendapatkan 2 pilihan konsep logo, file master siap cetak, dan panduan warna. Pengerjaan 3 hari dengan garansi 3x revisi.',
    image:
      'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=800&q=80',
    costPrice: 20000,
    costBreakdown: { material: 0, packaging: 0, overhead: 8000, labor: 12000 },
    estimatedHours: '6.0',
    serviceAreaType: 'digital',
    subdistrictId: findSubId('Umbulharjo', '34.71'),
    price: 75000,
    priceMin: 75000,
    priceMax: 200000,
    stock: 1,
    likesCount: 64,
    viewsCount: 215,
    status: 'published'
  });

  const [p3] = await db.insert(products).values({
    userId: andreazId,
    schoolId: smknCibinongId,
    type: 'product',
    name: 'Lampu Tidur Akrilik Grafir Nama Custom CNC & Kayu Jati Belanda',
    code: 'VOC-PRD-003',
    categoryId: catMap['kriya-kreatif'],
    description:
      'Lampu hias meja/kamar dengan ukiran laser CNC presisi tinggi buatan bengkel sekolah. Bisa custom nama atau logo hadiah wisuda. Dilengkapi dudukan kayu solid dan lampu LED hangat hemat listrik.',
    image:
      'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=800&q=80',
    costPrice: 45000,
    costBreakdown: { material: 28000, packaging: 4000, overhead: 5000, labor: 8000 },
    estimatedHours: '4.0',
    serviceAreaType: 'delivery',
    maxDistanceKm: 25,
    subdistrictId: findSubId('Cibinong', '32.01'),
    price: 85000,
    stock: 15,
    likesCount: 52,
    viewsCount: 180,
    isVerifiedByTeacher: true,
    verifiedBy: guruCibinongId,
    teacherNote: 'Rangkaian kelistrikan aman dan pemotongan akrilik sangat rapi.',
    isTefa: true,
    tefaUnit: 'TeFa Technopark CNC & Kriya SMKN 1 Cibinong',
    status: 'published'
  });

  const [p4] = await db.insert(products).values({
    userId: budiId,
    schoolId: smknSurabayaId,
    type: 'service',
    name: 'Servis Berkala & Pembersihan Injektor Motor Matic/Bebek',
    code: 'VOC-SRV-004',
    categoryId: catMap['otomotif-mesin'],
    description:
      'Layanan servis ringan motor injeksi memakai scanner diagnostik. Meliputi pembersihan throttle body, cek busi, setel langsam, ganti oli, dan pengecekan rem agar motor kembali tarikan enteng.',
    image:
      'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80',
    costPrice: 15000,
    costBreakdown: { material: 5000, packaging: 0, overhead: 3000, labor: 7000 },
    estimatedHours: '2.0',
    serviceAreaType: 'onsite',
    maxDistanceKm: 10,
    subdistrictId: findSubId('Gubeng', '35.78'),
    price: 45000,
    priceMin: 45000,
    priceMax: 110000,
    stock: 1,
    likesCount: 29,
    viewsCount: 96,
    status: 'published'
  });

  const [p5] = await db.insert(products).values({
    userId: andreazId,
    schoolId: smknCibinongId,
    type: 'portfolio',
    name: 'Sistem Penyiram Tanaman Otomatis IoT ESP32 & Monitoring Web',
    code: 'VOC-PTF-005',
    categoryId: catMap['elektronika-iot'],
    description:
      'Proyek akhir kolaborasi jurusan RPL & Elektronika untuk kebun hidroponik sekolah. Menggunakan sensor kelembaban tanah, pompa otomatis, dan pemantauan grafik lewat HP secara real-time.',
    image:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    costPrice: 0,
    price: 0,
    stock: 0,
    serviceAreaType: 'digital',
    subdistrictId: findSubId('Cibinong', '32.01'),
    projectLink: 'https://github.com/voc-market/iot-greenhouse',
    likesCount: 38,
    viewsCount: 124,
    isVerifiedByTeacher: true,
    verifiedBy: guruCibinongId,
    teacherNote: 'Juara 1 Pameran Karya Inovasi Teknologi SMK Tingkat Kabupaten.',
    status: 'published'
  });

  const [p6] = await db.insert(products).values({
    userId: andreazId,
    schoolId: smknCibinongId,
    type: 'product',
    name: 'Gantungan Kunci Kayu & Akrilik Grafir Nama Custom Laser CNC',
    code: 'VOC-PRD-006',
    categoryId: catMap['kriya-kreatif'],
    description:
      'Souvenir unik gantungan kunci custom nama, nomor kontak, atau logo komunitas. Dipotong presisi menggunakan mesin laser CNC bengkel sekolah.',
    image:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    costPrice: 8000,
    costBreakdown: { material: 4000, packaging: 1000, overhead: 1000, labor: 2000 },
    estimatedHours: '1.0',
    serviceAreaType: 'delivery',
    maxDistanceKm: 25,
    subdistrictId: findSubId('Cibinong', '32.01'),
    price: 15000,
    stock: 50,
    likesCount: 19,
    viewsCount: 78,
    isVerifiedByTeacher: true,
    verifiedBy: guruCibinongId,
    teacherNote: 'Produksi massal rapi dan ekonomis.',
    isTefa: true,
    tefaUnit: 'TeFa Technopark CNC SMKN 1 Cibinong',
    status: 'published'
  });

  const [p7] = await db.insert(products).values({
    userId: andreazId,
    schoolId: smknCibinongId,
    type: 'service',
    name: 'Jasa Pembuatan Landing Page & Katalog Menu Online UMKM',
    code: 'VOC-SRV-007',
    categoryId: catMap['rpl-web'],
    description:
      'Website profil responsif dan cepat untuk bisnis lokal. Terintegrasi tombol pesan WhatsApp otomatis, peta Google Maps, dan katalog produk modern.',
    image:
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
    costPrice: 120000,
    costBreakdown: { material: 0, packaging: 0, overhead: 40000, labor: 80000 },
    estimatedHours: '12.0',
    serviceAreaType: 'digital',
    subdistrictId: findSubId('Cibinong', '32.01'),
    price: 300000,
    priceMin: 300000,
    priceMax: 600000,
    stock: 1,
    likesCount: 42,
    viewsCount: 156,
    isVerifiedByTeacher: true,
    verifiedBy: guruCibinongId,
    teacherNote: 'Struktur kode bersih dan standar performa web tinggi.',
    status: 'published'
  });

  // 9. Demo Completed Orders & Verified Reviews
  const [ord1] = await db.insert(orders).values({
    orderCode: 'VOC-ORD-261025-A101',
    source: 'product',
    productId: p3.insertId,
    sellerId: andreazId,
    buyerId: pembeliId,
    buyerName: 'Pak Rahmat Hidayat',
    buyerPhone: '081344556677',
    buyerAddress: 'Jl. Raya Mayor Oking No. 45, Cibinong',
    buyerNotes: 'Tolong ukir logo Kopi Nusantara untuk pajangan meja kasir.',
    quantity: 2,
    agreedPrice: 170000,
    unitCostSnapshot: 90000,
    status: 'completed',
    progressNote: 'Kedua lampu akrilik logo kedai sudah selesai diukir, diuji nyala 4 jam, dan diserahkan.',
    proofImage:
      'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=600&q=80',
    reviewToken: 'demo_token_andreaz_order_1_998877665544332211',
    acceptedAt: new Date(Date.now() - 86400000 * 4),
    completedAt: new Date(Date.now() - 86400000 * 2)
  });

  await db.insert(reviews).values({
    orderId: ord1.insertId,
    productId: p3.insertId,
    sellerId: andreazId,
    reviewerName: 'Pak Rahmat Hidayat',
    rating: 5,
    comment:
      'Hasil grafir akriliknya sangat rapi tidak kalah dengan toko besar! Dipajang di meja kasir warung kopi saya jadi kelihatan keren sekali. Sukses terus Nak Andreaz!',
    endorsementTags: 'Rapi & Berkualitas,Tepat Waktu,Ramah & Sopan'
  });

  const [ord2] = await db.insert(orders).values({
    orderCode: 'VOC-ORD-261027-B202',
    source: 'product',
    productId: p1.insertId,
    sellerId: sitiId,
    buyerName: 'Ibu Dewi Sartika',
    buyerPhone: '081766554433',
    buyerAddress: 'Perum Griya Shanta Blok C-12, Malang',
    buyerNotes: 'Pesan 3 toples untuk acara arisan hari Minggu.',
    quantity: 3,
    agreedPrice: 165000,
    unitCostSnapshot: 105000,
    status: 'completed',
    progressNote: '3 toples nastar fresh baru keluar oven pagi ini sudah dikirim dengan kemasan aman.',
    reviewToken: 'demo_token_siti_order_2_112233445566778899',
    acceptedAt: new Date(Date.now() - 86400000 * 3),
    completedAt: new Date(Date.now() - 86400000 * 1)
  });

  await db.insert(reviews).values({
    orderId: ord2.insertId,
    productId: p1.insertId,
    sellerId: sitiId,
    reviewerName: 'Ibu Dewi Sartika',
    rating: 5,
    comment:
      'Nastarnya benar-benar lumer dan wangi butter, ibu-ibu arisan pada tanya beli di mana. Bangga sekali buatan adik-adik SMK!',
    endorsementTags: 'Rapi & Berkualitas,Harga Sesuai,Ramah & Sopan'
  });

  await db.insert(orders).values({
    orderCode: 'VOC-ORD-261029-C303',
    source: 'product',
    productId: p3.insertId,
    sellerId: andreazId,
    buyerName: 'Kak Dinda Permata',
    buyerPhone: '085677889900',
    buyerAddress: 'Bojonggede, Kab. Bogor',
    buyerNotes: 'Mau pesan 1 lampu tulisan Happy Graduation Raka S.Kom.',
    quantity: 1,
    agreedPrice: 85000,
    unitCostSnapshot: 45000,
    status: 'requested',
    reviewToken: 'demo_token_andreaz_order_3_abcdef1234567890'
  });

  const [ord4] = await db.insert(orders).values({
    orderCode: 'VOC-ORD-261028-A102',
    source: 'product',
    productId: p6.insertId,
    sellerId: andreazId,
    buyerId: pembeliId,
    buyerName: 'Pak Rahmat Hidayat',
    buyerPhone: '081344556677',
    buyerAddress: 'Jl. Raya Mayor Oking No. 45, Cibinong',
    buyerNotes: 'Pesan 10 pcs gantungan kunci kayu dengan grafir nama staf kedai.',
    quantity: 10,
    agreedPrice: 150000,
    unitCostSnapshot: 80000,
    status: 'completed',
    progressNote: '10 pcs gantungan kunci kayu grafir laser sudah selesai dan diantar.',
    proofImage:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    reviewToken: 'demo_token_andreaz_order_4_repeat_rahmat_cibinong',
    acceptedAt: new Date(Date.now() - 86400000 * 2),
    completedAt: new Date(Date.now() - 86400000 * 1)
  });

  await db.insert(reviews).values({
    orderId: ord4.insertId,
    productId: p6.insertId,
    sellerId: andreazId,
    reviewerName: 'Pak Rahmat Hidayat',
    rating: 5,
    comment:
      'Pesanan kedua saya ke Nak Andreaz, hasilnya selalu memuaskan dan tepat waktu. Anak muda berbakat!',
    endorsementTags: 'Rapi & Berkualitas,Tepat Waktu,Ramah & Sopan'
  });

  // 9b. Product Daily Analytics (#13)
  const now = new Date();
  const dailyRows: Array<{
    productId: number;
    statDate: string;
    views: number;
    shares: number;
    ordersCreated: number;
  }> = [];

  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dateStr = d.toISOString().slice(0, 10);
    for (const pid of [p1.insertId, p2.insertId, p3.insertId, p4.insertId, p6.insertId, p7.insertId]) {
      dailyRows.push({
        productId: pid,
        statDate: dateStr,
        views: Math.floor(Math.random() * 18) + 6,
        shares: Math.floor(Math.random() * 4),
        ordersCreated: i === 3 || i === 1 ? 1 : 0
      });
    }
  }
  await db.insert(productDailyStats).values(dailyRows);

  // 10. Papan "Butuh Bantuan" (#6) Demo Requests & Proposals
  const [req1] = await db.insert(jobRequests).values({
    code: 'VOC-REQ-261029-K001',
    userId: pembeliId,
    categoryId: catMap['dkv-desain'],
    title: 'Butuh Desain Ulang Menu & Standing Banner Kedai Kopi Nusantara',
    description:
      'Warung kopi saya mau meluncurkan 8 menu minuman baru bulan depan. Butuh bantuan adik SMK DKV untuk mendesain buku menu A4 lipat 2 dan desain X-Banner ukuran 60x160 cm yang cerah dan mudah dibaca pelanggan.',
    budgetType: 'range',
    budgetMin: 120000,
    budgetMax: 220000,
    workMode: 'remote',
    regionId: regionByCode['32.01'],
    locationDetail: 'Cibinong, dekat Stadion Pakansari',
    fullAddress: 'Jl. Raya Mayor Oking No. 45 RT 02/04, Cibinong (Samping Apotek Sehat)',
    neededBy: new Date(Date.now() + 86400000 * 7),
    maxProposals: 10,
    status: 'open',
    proposalsCount: 1,
    viewsCount: 34,
    expiresAt: new Date(Date.now() + 86400000 * 14)
  });

  await db.insert(jobProposals).values({
    jobRequestId: req1.insertId,
    userId: mayaId,
    message:
      'Halo Pak Rahmat! Saya Maya dari jurusan DKV SMKN 4 Yogyakarta. Saya sudah biasa membuat desain menu kedai kopi siap cetak CMYK 300 DPI lengkap dengan revisi sampai pas.',
    offeredPrice: 165000,
    estimatedDays: 3,
    portfolioProductId: p2.insertId,
    status: 'pending'
  });

  await db.insert(jobRequests).values({
    code: 'VOC-REQ-261029-M002',
    userId: pembeliId,
    categoryId: catMap['rpl-web'],
    title: 'Pembuatan Landing Page Katalog Kue & Tombol Pesan WhatsApp',
    description:
      'Mencari siswa RPL yang bisa membuat halaman web sederhana untuk menampilkan 15 produk roti & kopi kami supaya mudah dibuka pelanggan dari bio Instagram dan langsung terhubung ke WhatsApp kasir.',
    budgetType: 'fixed',
    budgetMin: 350000,
    budgetMax: 350000,
    workMode: 'remote',
    regionId: regionByCode['32.01'],
    locationDetail: 'Kabupaten Bogor (Full Online via Zoom/WA)',
    fullAddress: 'Jl. Raya Mayor Oking No. 45, Cibinong',
    neededBy: new Date(Date.now() + 86400000 * 10),
    maxProposals: 8,
    status: 'open',
    proposalsCount: 0,
    viewsCount: 22,
    expiresAt: new Date(Date.now() + 86400000 * 14)
  });

  await db.insert(jobRequests).values({
    code: 'VOC-REQ-261029-S003',
    userId: companyId,
    categoryId: catMap['tata-boga-kuliner'],
    title: '60 Kotak Snack Box Higienis untuk Workshop UMKM di Malang',
    description:
      'Tim kami mengadakan pelatihan kasir digital bagi UMKM di Kota Malang minggu depan. Membutuhkan 60 kotak snack box berisi 3 kue tradisional/roti manis + air mineral dari Unit Produksi Tata Boga SMK.',
    budgetType: 'range',
    budgetMin: 900000,
    budgetMax: 1200000,
    workMode: 'onsite',
    regionId: regionByCode['35.73'],
    locationDetail: 'Kec. Klojen, Kota Malang',
    fullAddress: 'Aula Gedung Malang Creative Center Lt. 3, Kota Malang',
    neededBy: new Date(Date.now() + 86400000 * 6),
    maxProposals: 6,
    status: 'open',
    proposalsCount: 0,
    viewsCount: 18,
    expiresAt: new Date(Date.now() + 86400000 * 10)
  });

  // 11. Tantangan Industri (#7) — 1 Finished Challenge (with Certificate!) & 1 Open Challenge
  const [finishedChal] = await db.insert(challenges).values({
    companyId,
    slug: 'inovasi-dashboard-kasir-umkm-2026',
    title: 'Tantangan Desain & Prototipe Antarmuka Kasir Warung Ramah Lansia',
    summary:
      'Rancang tampilan aplikasi kasir layar sentuh yang ekstra jelas dan mudah digunakan oleh pemilik warung berusia 50+ tahun.',
    brief:
      'Banyak pemilik warung sembako tradisional kesulitan memakai aplikasi POS modern karena tombol terlalu kecil dan istilah bahasa Inggris yang membingungkan.\n\nPT Nusantara Digital Kreatif menantang siswa SMK jurusan RPL & DKV merancang antarmuka kasir yang ramah pengguna awam!',
    requirements:
      '1. Terbuka untuk Siswa SMK aktif maupun alumni maksimal 1 tahun lulus.\n2. Karya orisinal buatan sendiri.\n3. Menggunakan Bahasa Indonesia yang lugas.',
    deliverables:
      '1. Minimal 2 tangkapan layar tampilan (Halaman Transaksi & Ringkasan Harian).\n2. Penjelasan singkat alasan pemilihan ukuran tombol dan warna.\n3. Tautan demo web atau prototipe Figma (opsional).',
    judgingCriteria: [
      { name: 'Kemudahan Penggunaan (UX)', weight: 40 },
      { name: 'Kejelasan Visual & Tipografi', weight: 35 },
      { name: 'Kelengkapan Alur Kasir Warung', weight: 25 }
    ],
    categoryId: catMap['rpl-web'],
    targetMajors: ['Rekayasa Perangkat Lunak (RPL)', 'Desain Komunikasi Visual (DKV)'],
    coverImage:
      'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1000&q=80',
    rewardTypes: ['uang', 'sertifikat', 'magang'],
    prizeDescription:
      'Juara 1: Uang Pembinaan Rp 1.500.000 + Golden Ticket Magang Berbayar + Sertifikat QR Resmi. Seluruh finalis mendapat Sertifikat Portofolio Industri.',
    winnerSlots: 2,
    submissionDeadline: new Date(Date.now() - 86400000 * 10),
    announcementDate: new Date(Date.now() - 86400000 * 5),
    ipPolicy: 'winner_only',
    status: 'finished',
    submissionsCount: 1,
    viewsCount: 189
  });

  const [winSub] = await db.insert(challengeSubmissions).values({
    challengeId: finishedChal.insertId,
    userId: andreazId,
    title: 'WarungKu POS: Antarmuka Kasir Tombol Kontras Tinggi & Suara Konfirmasi',
    description:
      'Prototipe web kasir responsif dengan tombol nominal uang bergambar warna asli pecahan Rupiah serta fitur pembacaan suara total belanja otomatis.',
    images: [
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80'
    ],
    externalLink: 'https://github.com/voc-market/warungku-pos-prototype',
    isPublicAfterFinish: true,
    status: 'winner',
    rank: 1,
    scores: {
      'Kemudahan Penggunaan (UX)': 96,
      'Kejelasan Visual & Tipografi': 92,
      'Kelengkapan Alur Kasir Warung': 94
    },
    totalScore: '94.10',
    feedback:
      'Ide menampilkan warna asli pecahan uang Rupiah dan konfirmasi suara sangat brilian serta langsung menjawab masalah pemilik warung lansia. Eksekusi kode rapi!'
  });

  await db.insert(certificates).values({
    code: 'VOC-CERT-2026A001',
    userId: andreazId,
    challengeId: finishedChal.insertId,
    submissionId: winSub.insertId,
    type: 'winner',
    title: 'Juara 1 — Tantangan Desain & Prototipe Antarmuka Kasir Warung Ramah Lansia',
    issuerName: 'PT Nusantara Digital Kreatif'
  });

  await db.insert(challenges).values({
    companyId,
    slug: 'kemasan-ramah-lingkungan-kopi-lokal-2026',
    title: 'Tantangan Desain Kemasan Ekonomis & Ramah Lingkungan untuk UMKM Kuliner',
    summary:
      'Ciptakan konsep kemasan produk makanan ringan atau kopi lokal yang hemat biaya produksi namun tampak premium di rak toko.',
    brief:
      'UMKM kuliner daerah sering kalah bersaing karena kemasan plastik polos tanpa identitas merek. Buatlah desain kemasan ekonomis (standing pouch / box kertas kraft) yang mudah dicetak skala kecil oleh UMKM namun langsung memikat mata pembeli!',
    requirements:
      '1. Siswa SMK semua jurusan (diutamakan DKV, Kriya, dan Tata Boga).\n2. Menyertakan estimasi biaya cetak per kemasan agar realistis bagi UMKM.',
    deliverables:
      '1. Mockup tampilan depan & belakang kemasan (1–5 gambar WebP/PNG/JPG).\n2. Deskripsi material kemasan dan keunggulan desain.',
    judgingCriteria: [
      { name: 'Daya Tarik Visual & Branding', weight: 40 },
      { name: 'Efisiensi Biaya Produksi UMKM', weight: 35 },
      { name: 'Informasi Label & Keamanan Pangan', weight: 25 }
    ],
    categoryId: catMap['dkv-desain'],
    targetMajors: ['Desain Komunikasi Visual (DKV)', 'Tata Boga & Kuliner', 'Kriya Kreatif & Desain Produk'],
    coverImage:
      'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=1000&q=80',
    rewardTypes: ['uang', 'sertifikat', 'magang'],
    prizeDescription:
      'Total Hadiah Rp 2.500.000 untuk 3 Karya Terbaik + Sertifikat Kompetisi Terverifikasi QR & Peluang Proyek Desain Mitra UMKM.',
    winnerSlots: 3,
    submissionDeadline: new Date(Date.now() + 86400000 * 18),
    announcementDate: new Date(Date.now() + 86400000 * 25),
    ipPolicy: 'winner_only',
    status: 'open',
    submissionsCount: 0,
    viewsCount: 94
  });

  // 12. Sample Hiring Invitation (#8) & Notifications
  await db.insert(hiringInvitations).values({
    companyId,
    studentId: andreazId,
    type: 'magang',
    position: 'Junior Frontend & IoT Engineer Intern',
    message:
      'Halo Andreaz, tim engineering PT Nusantara Digital Kreatif sangat terkesan dengan karya juara WarungKu POS dan proyek IoT di Paspor Kerjamu. Kami mengundangmu mengikuti program Magang Industri berbayar selama 4 bulan.',
    regionId: regionByCode['31.74'],
    salaryInfo: 'Uang Saku Rp 2.500.000/bulan + Sertifikat Industri',
    status: 'pending',
    expiresAt: new Date(Date.now() + 86400000 * 14)
  });

  await db.insert(notifications).values([
    {
      userId: andreazId,
      type: 'hiring_invitation',
      title: 'Undangan Magang Baru dari PT Nusantara Digital Kreatif!',
      body: 'Anda diundang untuk posisi Junior Frontend & IoT Engineer Intern. Tinjau detailnya sekarang.',
      actionUrl: '/undangan'
    },
    {
      userId: guruCibinongId,
      type: 'student_invited',
      title: 'Siswa Bimbingan Diundang Mitra Industri',
      body: 'Andreaz Pratama menerima undangan Magang dari PT Nusantara Digital Kreatif.',
      actionUrl: '/dashboard/guru'
    },
    {
      userId: pembeliId,
      type: 'new_proposal',
      title: 'Penawaran Siswa Baru Masuk!',
      body: 'Maya Anggraini mengajukan penawaran pada permintaan "Butuh Desain Ulang Menu & Standing Banner".',
      actionUrl: `/butuh-bantuan/VOC-REQ-261029-K001`
    }
  ]);

  // 13. Generate OG Cards for all published products (#14)
  const allProdRows = await db.select({ id: products.id }).from(products);
  for (const pr of allProdRows) {
    try {
      await OgCardService.generateForPostId(pr.id);
    } catch (e) {
      console.warn(`[Seed] OG Card generation skipped for post #${pr.id}:`, e);
    }
  }

  // Ensure backfill & student stats calculation are 100% synced
  await backfillSchools();
  await StatsService.refreshAllStudents();

  // 14. Evaluate Creator Levels & Badges for demo students (#11)
  await BadgeService.evaluateUser(andreazId);
  await BadgeService.evaluateUser(sitiId);
  await BadgeService.evaluateUser(mayaId);
  await BadgeService.evaluateUser(budiId);

  // Verify schoolId check is quiet
  void p4;
  void p5;
  void p6;
  void p7;
  void eq;
}

if (import.meta.main) {
  console.log('Seeding VOC-Market Tier 1 + Tier 2 realistic demo data...');
  await runSeed();
  await pool.end();
  console.log('Seed complete! Demo accounts (password: password123):');
  console.log(' - Siswa SMK      : andreaz@voc.id / draz_me | siti@voc.id / siti_bakery | maya@voc.id / maya_art');
  console.log(' - Guru Admin SMK : hendra.guru@voc.id / guru_hendra | ratna.guru@voc.id / guru_ratna');
  console.log(' - Mitra Industri : hrd@nusantaratech.co.id / pt_nusantara');
  console.log(' - Admin Platform : admin@voc.id / admin_voc');
  console.log(' - Pembeli / UMKM : rahmat@umkm.id / warung_rahmat');
}
