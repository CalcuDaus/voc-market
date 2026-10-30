import { beforeEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { db } from '../src/server/db';
import {
  badges,
  categories,
  orders,
  productDailyStats,
  products,
  regions,
  reviews,
  schools,
  subdistricts,
  users
} from '../src/server/db/schema';
import {
  createFakePngFile,
  extractSessionCookie,
  resetTestState,
  testApp
} from './setup';
import { PricingService } from '../src/server/services/pricing.service';
import { GeoService } from '../src/server/services/geo.service';
import { BadgeService } from '../src/server/services/badge.service';
import { OgCardService } from '../src/server/services/og-card.service';

async function registerUser(payload: Record<string, unknown>) {
  const body: Record<string, unknown> = { ...payload };
  if (!body.firstName && body.name) {
    const parts = String(body.name).split(' ');
    body.firstName = parts[0] || 'User';
    body.lastName = parts.slice(1).join(' ') || 'Voc';
  }
  if (!body.confirmPassword && body.password) {
    body.confirmPassword = body.password;
  }
  const res = await testApp.handle(
    new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  );
  return {
    status: res.status,
    cookie: extractSessionCookie(res),
    json: await res.json()
  };
}

describe('Tier 3 — Pembelajaran & Retensi (HPP, Badges, Geo, WhatsApp OG, Mini Dashboard)', () => {
  beforeEach(async () => {
    await resetTestState();
  });

  test('3.1. WhatsApp OG Card WebP 1200x630 generation & file creation', async () => {
    const hash = await Bun.password.hash('pass123', { algorithm: 'bcrypt', cost: 4 });
    const [uRes] = await db.insert(users).values({
      name: 'Andreaz Pratama',
      username: 'andreaz_og',
      email: 'andreaz_og@voc.id',
      password: hash,
      phoneNumber: '0812345678',
      userType: 'smk',
      schoolName: 'SMKN 1 Cibinong',
      isVerified: true
    });
    const userId = uRes.insertId;

    const [pRes] = await db.insert(products).values({
      userId,
      type: 'product',
      name: 'Lampu Meja Akrilik CNC Presisi Siswa SMK',
      code: 'VOC-PRD-OG01',
      description: 'Lampu tidur custom grafir nama dan logo bergaransi.',
      image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=600',
      price: 85000,
      costPrice: 45000,
      status: 'published'
    });
    const postId = pRes.insertId;

    const ogPath = await OgCardService.generateForPostId(postId);
    expect(ogPath).toBeTruthy();
    expect(ogPath?.startsWith('/uploads/og/post-')).toBe(true);

    const fullDiskPath = join(process.cwd(), 'public', ogPath!.replace(/^\//, ''));
    expect(existsSync(fullDiskPath)).toBe(true);

    const metadata = await sharp(fullDiskPath).metadata();
    expect(metadata.width).toBe(1200);
    expect(metadata.height).toBe(630);
    expect(metadata.format).toBe('webp');
  });

  test('3.2. PricingService: HPP calculation, margin classification & public confidentiality', async () => {
    // 1. Margin analysis rules
    const loss = PricingService.analyzeMargin(100000, 80000);
    expect(loss.status).toBe('loss');
    expect(loss.marginPercent).toBeLessThan(0);

    const thin = PricingService.analyzeMargin(90000, 100000);
    expect(thin.status).toBe('thin');
    expect(thin.marginPercent).toBe(10);

    const healthy = PricingService.analyzeMargin(70000, 100000);
    expect(healthy.status).toBe('healthy');
    expect(healthy.marginPercent).toBe(30);

    const premium = PricingService.analyzeMargin(40000, 100000);
    expect(premium.status).toBe('premium');
    expect(premium.marginPercent).toBe(60);

    // 2. Setup category and benchmark
    const [cRes] = await db.insert(categories).values({
      name: 'Elektronika & IoT',
      slug: 'elektronika-iot',
      icon: 'cpu'
    });
    const catId = cRes.insertId;

    const { cookie, json: regJson } = await registerUser({
      name: 'Budi Siswa',
      username: 'budi_siswa',
      email: 'budi@voc.id',
      password: 'password123',
      phoneNumber: '0812999999',
      userType: 'smk',
      schoolName: 'SMKN 1 Cibinong'
    });
    const sellerId = regJson.user.id;

    // Insert sample posts with various prices to test quantiles
    const samplePrices = [50000, 100000, 150000, 200000, 300000];
    for (let i = 0; i < samplePrices.length; i++) {
      await db.insert(products).values({
        userId: sellerId,
        categoryId: catId,
        type: 'product',
        name: `Item IoT #${i + 1}`,
        code: `VOC-PRD-TEST-${i + 1}`,
        description: 'Deskripsi uji coba HPP dan benchmark.',
        image: '/images/voc-logo.png',
        price: samplePrices[i],
        costPrice: Math.round(samplePrices[i] * 0.7),
        costBreakdown: {
          material: Math.round(samplePrices[i] * 0.4),
          packaging: 5000,
          overhead: 5000,
          labor: Math.round(samplePrices[i] * 0.2)
        },
        status: 'published'
      });
    }

    const benchRes = await testApp.handle(
      new Request(`http://localhost/api/pricing/benchmark?categoryId=${catId}&type=product`, {
        headers: { Cookie: cookie }
      })
    );
    expect(benchRes.status).toBe(200);
    const benchJson = await benchRes.json();
    expect(benchJson.benchmark.count).toBe(5);
    expect(benchJson.benchmark.minPrice).toBe(50000);
    expect(benchJson.benchmark.maxPrice).toBe(300000);
    expect(benchJson.benchmark.medianPrice).toBe(150000);

    // 3. Strict confidentiality test: Public visitor vs Seller owner
    const [targetPost] = await db.select().from(products).where(eq(products.categoryId, catId)).limit(1);

    // Public visitor
    const pubRes = await testApp.handle(new Request(`http://localhost/api/posts/${targetPost.id}`));
    const pubJson = await pubRes.json();
    expect(pubJson.post.costPrice).toBeUndefined();
    expect(pubJson.post.costBreakdown).toBeUndefined();

    // Catalog list
    const listRes = await testApp.handle(new Request('http://localhost/api/posts'));
    const listJson = await listRes.json();
    for (const item of listJson.items) {
      expect(item.costPrice).toBeUndefined();
      expect(item.costBreakdown).toBeUndefined();
    }
  });

  test('3.3. GeoService: Haversine distance, detection & nearest sorting', async () => {
    // 1. Calculate direct distance
    // Cibinong (-6.481944, 106.853056) to Bogor Tengah (-6.597500, 106.797500) is approx ~14 km
    const dist = GeoService.haversineDistance(-6.481944, 106.853056, -6.5975, 106.7975);
    expect(dist).toBeGreaterThan(12);
    expect(dist).toBeLessThan(16);

    // 2. Setup regions and subdistricts
    const [regRes] = await db.insert(regions).values({
      code: '32.01',
      name: 'Kabupaten Bogor',
      province: 'Jawa Barat',
      type: 'kabupaten'
    });
    const regId = regRes.insertId;

    const [cibinongRes] = await db.insert(subdistricts).values({
      regionId: regId,
      name: 'Cibinong',
      latitude: '-6.481944',
      longitude: '106.853056'
    });
    const cibinongId = cibinongRes.insertId;

    const [bojongRes] = await db.insert(subdistricts).values({
      regionId: regId,
      name: 'Bojonggede',
      latitude: '-6.495278',
      longitude: '106.797222'
    });
    const bojongId = bojongRes.insertId;

    // Detect endpoint with coordinates near Cibinong
    const detectRes = await testApp.handle(
      new Request('http://localhost/api/location/detect?lat=-6.4820&lng=106.8531')
    );
    expect(detectRes.status).toBe(200);
    const detectJson = await detectRes.json();
    expect(detectJson.subdistrict.name).toBe('Cibinong');

    // 3. Test nearest sorting on GET /api/posts
    const hash = await Bun.password.hash('pass123', { algorithm: 'bcrypt', cost: 4 });
    const [uRes] = await db.insert(users).values({
      name: 'Siswa Cibinong',
      username: 'siswa_cib',
      email: 'cib@voc.id',
      password: hash,
      phoneNumber: '0812333444',
      userType: 'smk'
    });
    const uId = uRes.insertId;

    // Post 1 in Cibinong (distance 0)
    await db.insert(products).values({
      userId: uId,
      subdistrictId: cibinongId,
      type: 'product',
      name: 'Karya Cibinong Dekat',
      code: 'VOC-PRD-CIB01',
      description: 'Layanan servis langsung di Cibinong.',
      image: '/images/voc-logo.png',
      price: 50000,
      serviceAreaType: 'delivery',
      status: 'published'
    });

    // Post 2 in Bojonggede (~6 km away)
    await db.insert(products).values({
      userId: uId,
      subdistrictId: bojongId,
      type: 'product',
      name: 'Karya Bojonggede Jauh',
      code: 'VOC-PRD-BOJ01',
      description: 'Layanan servis di Bojonggede.',
      image: '/images/voc-logo.png',
      price: 50000,
      serviceAreaType: 'delivery',
      status: 'published'
    });

    const sortRes = await testApp.handle(
      new Request(`http://localhost/api/posts?subdistrictId=${cibinongId}&sort=nearest`)
    );
    expect(sortRes.status).toBe(200);
    const sortJson = await sortRes.json();
    expect(sortJson.items.length).toBeGreaterThanOrEqual(2);
    expect(sortJson.items[0].name).toBe('Karya Cibinong Dekat');
    expect(sortJson.items[0].distanceLabel).toContain('Satu kecamatan');
  });

  test('3.4. BadgeService: Level 1-4 progression & 7 automated badges', async () => {
    // 1. Insert 7 official badges
    await db.insert(badges).values([
      { slug: 'first_project', name: 'Langkah Pertama', description: 'Pesanan riil perdana', icon: 'rocket', color: 'blue', category: 'work_ethic' },
      { slug: 'on_time_hero', name: 'Tepat Waktu', description: 'Tepat waktu', icon: 'clock', color: 'emerald', category: 'work_ethic' },
      { slug: 'quality_craft', name: 'Karya Berkualitas', description: 'Berkualitas', icon: 'award', color: 'amber', category: 'quality' },
      { slug: 'five_star_streak', name: 'Bintang Lima Beruntun', description: '5 bintang 5', icon: 'star', color: 'amber', category: 'quality' },
      { slug: 'repeat_trusted', name: 'Langganan Terpercaya', description: 'Pesanan berulang', icon: 'heart', color: 'violet', category: 'entrepreneurship' },
      { slug: 'smart_hpp', name: 'Ahli HPP & Margin', description: 'HPP sehat', icon: 'calculator', color: 'violet', category: 'entrepreneurship' },
      { slug: 'tefa_verified', name: 'Standar Industri TeFa', description: 'Standar TeFa', icon: 'shield-check', color: 'blue', category: 'school' }
    ]);

    const hash = await Bun.password.hash('pass123', { algorithm: 'bcrypt', cost: 4 });
    const [uRes] = await db.insert(users).values({
      name: 'Siswa Prestasi',
      username: 'siswa_prestasi',
      email: 'prestasi@voc.id',
      password: hash,
      phoneNumber: '0812555666',
      userType: 'smk',
      isVerified: true
    });
    const sId = uRes.insertId;

    const [buyerRes] = await db.insert(users).values({
      name: 'Pembeli Tetap',
      username: 'pembeli_tetap',
      email: 'tetap@buyer.id',
      password: hash,
      phoneNumber: '0812777888',
      userType: 'public'
    });
    const bId = buyerRes.insertId;

    // Initially Level 1
    const eval1 = await BadgeService.evaluateUser(sId);
    expect(eval1.creatorLevel).toBe(1);
    expect(eval1.levelTitle).toBe('Kreator Pemula');

    // Create a product with healthy HPP and TeFa verified
    const [pRes] = await db.insert(products).values({
      userId: sId,
      type: 'product',
      name: 'Produk TeFa Kriya',
      code: 'VOC-PRD-TEFA01',
      description: 'Produk unit produksi sekolah teruji.',
      image: '/images/voc-logo.png',
      price: 100000,
      costPrice: 70000,
      costBreakdown: { material: 40000, packaging: 10000, overhead: 10000, labor: 10000 },
      isVerifiedByTeacher: true,
      isTefa: true,
      status: 'published'
    });

    // Create 2 completed orders from the same buyer
    const [ord1] = await db.insert(orders).values({
      orderCode: 'VOC-ORD-T3-001',
      source: 'product',
      productId: pRes.insertId,
      sellerId: sId,
      buyerId: bId,
      buyerName: 'Pembeli Tetap',
      buyerPhone: '0812777888',
      quantity: 1,
      agreedPrice: 100000,
      unitCostSnapshot: 70000,
      status: 'completed',
      reviewToken: 'token_t3_ord1'
    });

    await db.insert(reviews).values({
      orderId: ord1.insertId,
      productId: pRes.insertId,
      sellerId: sId,
      reviewerName: 'Pembeli Tetap',
      rating: 5,
      comment: 'Keren banget!',
      endorsementTags: 'Rapi & Berkualitas,Tepat Waktu'
    });

    const [ord2] = await db.insert(orders).values({
      orderCode: 'VOC-ORD-T3-002',
      source: 'product',
      productId: pRes.insertId,
      sellerId: sId,
      buyerId: bId,
      buyerName: 'Pembeli Tetap',
      buyerPhone: '0812777888',
      quantity: 2,
      agreedPrice: 200000,
      unitCostSnapshot: 140000,
      status: 'completed',
      reviewToken: 'token_t3_ord2'
    });

    // Evaluate again: user now has 2 completed orders, 1 published product -> Level 2
    // Badges awarded: first_project, repeat_trusted (2 orders from same buyer), tefa_verified
    const eval2 = await BadgeService.evaluateUser(sId);
    expect(eval2.creatorLevel).toBe(2);
    expect(eval2.levelTitle).toBe('Kreator Aktif');

    const badgeSlugs = eval2.unlockedBadges.map((b) => b.slug);
    expect(badgeSlugs).toContain('first_project');
    expect(badgeSlugs).toContain('repeat_trusted');
    expect(badgeSlugs).toContain('tefa_verified');
  });

  test('3.5. Seller Dashboard KPI aggregation & Excel CSV export with UTF-8 BOM', async () => {
    const { cookie, json: regJson } = await registerUser({
      name: 'Siti Baker',
      username: 'siti_baker',
      email: 'siti_baker@voc.id',
      password: 'password123',
      phoneNumber: '0812888999',
      userType: 'smk',
      schoolName: 'SMKN 3 Malang'
    });

    const userId = regJson.user.id;

    // Create published post
    const [pRes] = await db.insert(products).values({
      userId,
      type: 'product',
      name: 'Roti Manis Siswa Tata Boga',
      code: 'VOC-PRD-ROTI',
      description: 'Roti coklat lembut higienis.',
      image: '/images/voc-logo.png',
      price: 20000,
      costPrice: 12000,
      status: 'published'
    });
    const prodId = pRes.insertId;

    // Add completed order: 5 items @ 20.000 = agreed 100.000, unitCost = 12.000 (total HPP = 60.000, profit = 40.000)
    await db.insert(orders).values({
      orderCode: 'VOC-ORD-ROTI-01',
      source: 'product',
      productId: prodId,
      sellerId: userId,
      buyerName: 'Ibu Pelanggan',
      buyerPhone: '0819999888',
      quantity: 5,
      agreedPrice: 100000,
      unitCostSnapshot: 12000,
      status: 'completed',
      completedAt: new Date(),
      reviewToken: 'token_roti_01'
    });

    // Add daily stats
    await db.insert(productDailyStats).values({
      productId: prodId,
      statDate: new Date().toISOString().slice(0, 10),
      views: 50,
      shares: 10,
      ordersCreated: 1
    });

    // 1. Fetch dashboard
    const dashRes = await testApp.handle(
      new Request('http://localhost/api/seller/dashboard?period=30d', {
        headers: { Cookie: cookie }
      })
    );
    expect(dashRes.status).toBe(200);
    const dashJson = await dashRes.json();
    expect(dashJson.dashboard.summary.grossRevenue).toBe(100000);
    expect(dashJson.dashboard.summary.totalHppCost).toBe(60000);
    expect(dashJson.dashboard.summary.netProfit).toBe(40000);
    expect(dashJson.dashboard.summary.completedOrdersCount).toBe(1);
    expect(dashJson.dashboard.worksPerformance.length).toBe(1);

    // 2. Fetch CSV Report
    const csvRes = await testApp.handle(
      new Request('http://localhost/api/seller/report/csv?period=30d', {
        headers: { Cookie: cookie }
      })
    );
    expect(csvRes.status).toBe(200);
    expect(csvRes.headers.get('content-type')).toContain('text/csv');

    const csvText = await csvRes.text();
    // Verify UTF-8 BOM is present at the beginning (\uFEFF)
    expect(csvText.startsWith('\uFEFF')).toBe(true);
    // Verify CSV header columns
    expect(csvText).toContain('Kode Pesanan');
    expect(csvText).toContain('Nama Pelanggan');
    expect(csvText).toContain('Modal Pokok HPP (Rp)');
    expect(csvText).toContain('Laba Bersih (Rp)');
    // Verify data row
    expect(csvText).toContain('VOC-ORD-ROTI-01');
    expect(csvText).toContain('100000');
    expect(csvText).toContain('60000');
    expect(csvText).toContain('40000');
  });
});
