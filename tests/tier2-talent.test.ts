import { beforeEach, describe, expect, test } from 'bun:test';
import { db } from '../src/server/db';
import { orders, regions, reviews, users } from '../src/server/db/schema';
import { StatsService } from '../src/server/services/stats.service';
import {
  createFakePngFile,
  extractSessionCookie,
  resetTestState,
  testApp
} from './setup';

async function registerUser(payload: Record<string, unknown>) {
  const res = await testApp.handle(
    new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  );
  return {
    status: res.status,
    cookie: extractSessionCookie(res),
    json: await res.json()
  };
}

async function uploadPortfolioWork(cookie: string, title: string) {
  const form = new FormData();
  form.append('type', 'portfolio');
  form.append('name', title);
  form.append('description', 'Proyek aplikasi kasir berbasis web dan sensor IoT sekolah.');
  form.append('image', await createFakePngFile('work.png'));

  const res = await testApp.handle(
    new Request('http://localhost/api/posts', {
      method: 'POST',
      headers: { Cookie: cookie },
      body: form
    })
  );
  expect(res.status).toBe(201);
  return res.json();
}

describe('Tier 2 (#8) — Status "Siap Kerja", Cari Talenta & Undangan Industri', () => {
  beforeEach(async () => {
    await resetTestState();
  });

  test('enforces openToWork checklist & grade X guard, blocks unverified company (403), sorts by talentScore without leaking phone, notifies teacher on invite, and unlocks phone only on accept', async () => {
    const [regBogor] = await db.insert(regions).values({
      code: '32.01',
      name: 'Kabupaten Bogor',
      province: 'Jawa Barat',
      type: 'kabupaten'
    });

    // Create Admin directly in DB (since register blocks userType='admin')
    const hash = await Bun.password.hash('password123', { algorithm: 'bcrypt', cost: 4 });
    await db.insert(users).values({
      name: 'Admin VOC',
      username: 'admin_test',
      email: 'admin@test.id',
      password: hash,
      phoneNumber: '0811000099',
      userType: 'admin',
      isAdmin: true
    });
    const adminLogin = await testApp.handle(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'admin_test', password: 'password123' })
      })
    );
    const adminCookie = extractSessionCookie(adminLogin);

    // Teacher at SMKN 1 Cibinong
    const teacher = await registerUser({
      email: 'guru.pembimbing@smkn1.id',
      firstName: 'Hendra',
      lastName: 'Guru',
      username: 'guru_cibinong',
      password: 'password123',
      confirmPassword: 'password123',
      phoneNumber: '081133334444',
      userType: 'teacher',
      schoolName: 'SMKN 1 Cibinong',
      regionId: regBogor.insertId
    });

    // Student 1 (incomplete profile, 0 works initially)
    const student1 = await registerUser({
      email: 'siswa1@smkn1.id',
      firstName: 'Andreaz',
      lastName: 'RPL',
      username: 'andreaz_rpl',
      password: 'password123',
      confirmPassword: 'password123',
      phoneNumber: '081277778888',
      userType: 'smk',
      schoolName: 'SMKN 1 Cibinong',
      regionId: regBogor.insertId
    });

    // Activating openToWork before completing profile & uploading 1 work -> HTTP 422 with missingFields
    const failIncomplete = await testApp.handle(
      new Request('http://localhost/api/open-to-work', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: student1.cookie
        },
        body: JSON.stringify({ openToWork: true })
      })
    );
    expect(failIncomplete.status).toBe(422);
    const failIncompleteJson = await failIncomplete.json();
    expect(failIncompleteJson.missingFields).toContain('major');
    expect(failIncompleteJson.missingFields).toContain('skills');
    expect(failIncompleteJson.missingFields).toContain('headline');
    expect(failIncompleteJson.missingFields).toContain('publishedWorks');

    await uploadPortfolioWork(student1.cookie, 'Sistem Kasir Web UMKM');

    // Grade X/XI active student choosing 'kerja' (full-time) -> HTTP 422!
    const failGradeXFulltime = await testApp.handle(
      new Request('http://localhost/api/open-to-work', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: student1.cookie
        },
        body: JSON.stringify({
          openToWork: true,
          major: 'Rekayasa Perangkat Lunak (RPL)',
          skills: 'TypeScript, Svelte, MySQL',
          headline: 'Siswa RPL Siap PKL Industri Software',
          studentStatus: 'active',
          jobPreferences: {
            types: ['pkl', 'kerja'],
            regionIds: [regBogor.insertId],
            willingToRelocate: false
          }
        })
      })
    );
    expect(failGradeXFulltime.status).toBe(422);

    // Grade XII (final_year) student with complete profile + 1 work -> HTTP 200
    const okStudent1 = await testApp.handle(
      new Request('http://localhost/api/open-to-work', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: student1.cookie
        },
        body: JSON.stringify({
          openToWork: true,
          major: 'Rekayasa Perangkat Lunak (RPL)',
          skills: 'TypeScript, Svelte, MySQL',
          headline: 'Fullstack Web Developer Kelas XII RPL',
          studentStatus: 'final_year',
          graduationYear: 2027,
          jobPreferences: {
            types: ['magang', 'kerja'],
            regionIds: [regBogor.insertId],
            willingToRelocate: true
          }
        })
      })
    );
    expect(okStudent1.status).toBe(200);

    // Student 2 (lower score: unverified, 0 orders/reviews)
    const student2 = await registerUser({
      email: 'siswa2@smkn1.id',
      firstName: 'Bagas',
      lastName: 'RPL',
      username: 'bagas_rpl',
      password: 'password123',
      confirmPassword: 'password123',
      phoneNumber: '081266665555',
      userType: 'smk',
      schoolName: 'SMKN 1 Cibinong',
      regionId: regBogor.insertId,
      major: 'Rekayasa Perangkat Lunak (RPL)',
      skills: 'HTML, CSS'
    });
    await uploadPortfolioWork(student2.cookie, 'Landing Page Sederhana');
    const okStudent2 = await testApp.handle(
      new Request('http://localhost/api/open-to-work', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: student2.cookie
        },
        body: JSON.stringify({
          openToWork: true,
          headline: 'Frontend Pemula Siap PKL',
          studentStatus: 'active',
          jobPreferences: {
            types: ['pkl', 'freelance'],
            regionIds: [regBogor.insertId],
            willingToRelocate: false
          }
        })
      })
    );
    expect(okStudent2.status).toBe(200);

    // Boost Student 1's talentScore: Teacher verifies student1 + completed order + 5-star review
    await testApp.handle(
      new Request(`http://localhost/api/teacher/students/${student1.json.user.id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: teacher.cookie
        },
        body: JSON.stringify({ isVerified: true })
      })
    );

    const [ord] = await db.insert(orders).values({
      orderCode: 'VOC-ORD-TESTSCORE-1',
      source: 'product',
      sellerId: student1.json.user.id,
      buyerName: 'Pelanggan Uji',
      buyerPhone: '081399990000',
      quantity: 1,
      agreedPrice: 250000,
      status: 'completed',
      reviewToken: 'tok_test_score_123456'
    });
    await db.insert(reviews).values({
      orderId: ord.insertId,
      sellerId: student1.json.user.id,
      reviewerName: 'Pelanggan Uji',
      rating: 5,
      comment: 'Sangat rapi dan tepat waktu!'
    });
    await StatsService.refreshStudentStats(student1.json.user.id);

    // Register Company (initially companyVerifiedAt === null)
    const company = await registerUser({
      email: 'hrd@industribaru.co.id',
      firstName: 'Sari',
      lastName: 'HRD',
      username: 'pt_maju_jaya',
      password: 'password123',
      confirmPassword: 'password123',
      phoneNumber: '081199998888',
      userType: 'company',
      companyName: 'PT Maju Jaya Teknologi',
      companySector: 'Software House',
      companyNib: '9120009998887'
    });
    expect(company.status).toBe(201);
    expect(company.json.user.isCompanyVerified).toBe(false);

    // Unverified company MUST receive HTTP 403 on /api/talent and /invite!
    const unverifiedSearch = await testApp.handle(
      new Request('http://localhost/api/talent', {
        headers: { Cookie: company.cookie }
      })
    );
    expect(unverifiedSearch.status).toBe(403);

    // Admin verifies company
    const verifyCompRes = await testApp.handle(
      new Request(`http://localhost/api/admin/companies/${company.json.user.id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminCookie
        },
        body: JSON.stringify({ verified: true })
      })
    );
    expect(verifyCompRes.status).toBe(200);

    // Verified company searches /api/talent -> sorted by talentScore DESC, NEVER leaks phoneNumber or email!
    const talentRes = await testApp.handle(
      new Request(
        `http://localhost/api/talent?major=RPL&regionId=${regBogor.insertId}`,
        { headers: { Cookie: company.cookie } }
      )
    );
    expect(talentRes.status).toBe(200);
    const talentJson = await talentRes.json();
    expect(talentJson.items.length).toBe(2);
    expect(talentJson.items[0].username).toBe('andreaz_rpl');
    expect(talentJson.items[1].username).toBe('bagas_rpl');
    expect(talentJson.items[0].talentScore).toBeGreaterThan(talentJson.items[1].talentScore);

    // Privacy check: phone & email of students MUST NOT appear anywhere in /api/talent response
    const rawTalentPayload = JSON.stringify(talentJson);
    expect(rawTalentPayload).not.toContain('081277778888');
    expect(rawTalentPayload).not.toContain('siswa1@smkn1.id');

    // Rating filter works
    const highRatedOnly = await (
      await testApp.handle(
        new Request('http://localhost/api/talent?minRating=4.5', {
          headers: { Cookie: company.cookie }
        })
      )
    ).json();
    expect(highRatedOnly.items.length).toBe(1);
    expect(highRatedOnly.items[0].username).toBe('andreaz_rpl');

    // Company invites Student 1 -> notifies Student 1 AND Teacher at SMKN 1 Cibinong!
    const inviteRes = await testApp.handle(
      new Request('http://localhost/api/talent/andreaz_rpl/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: company.cookie
        },
        body: JSON.stringify({
          type: 'magang',
          position: 'Junior Web Developer Intern',
          message: 'Kami tertarik dengan portofolio kasir web Anda untuk magang 3 bulan.',
          salaryInfo: 'Rp 2.000.000/bulan'
        })
      })
    );
    expect(inviteRes.status).toBe(201);
    const inviteJson = await inviteRes.json();
    expect(inviteJson.notifiedTeachersCount).toBe(1);

    // Verify Teacher received notification!
    const teacherNotifs = await (
      await testApp.handle(
        new Request('http://localhost/api/notifications', {
          headers: { Cookie: teacher.cookie }
        })
      )
    ).json();
    expect(
      teacherNotifs.items.some((n: { type: string }) => n.type === 'student_invited')
    ).toBe(true);

    // Before student accepts, company's /api/invitations MUST NOT expose studentPhone
    const companyInvBefore = await (
      await testApp.handle(
        new Request('http://localhost/api/invitations', {
          headers: { Cookie: company.cookie }
        })
      )
    ).json();
    expect(companyInvBefore.items[0].studentPhone).toBeNull();
    expect(companyInvBefore.items[0].studentWhatsappUrl).toBeNull();

    // Student accepts invitation -> unlocks studentPhone & WhatsApp link for company!
    const acceptInvRes = await testApp.handle(
      new Request(`http://localhost/api/invitations/${inviteJson.id}/accept`, {
        method: 'POST',
        headers: { Cookie: student1.cookie }
      })
    );
    expect(acceptInvRes.status).toBe(200);

    const companyInvAfter = await (
      await testApp.handle(
        new Request('http://localhost/api/invitations', {
          headers: { Cookie: company.cookie }
        })
      )
    ).json();
    expect(companyInvAfter.items[0].status).toBe('accepted');
    expect(companyInvAfter.items[0].studentPhone).toBe('081277778888');
    expect(companyInvAfter.items[0].studentWhatsappUrl).toContain('6281277778888');
  });
});

