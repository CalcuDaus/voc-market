import { beforeEach, describe, expect, test } from 'bun:test';
import { db } from '../src/server/db';
import { backfillSchools } from '../src/server/db/backfill-schools';
import { products, regions, schools, users } from '../src/server/db/schema';
import {
  createFakePngFile,
  extractSessionCookie,
  resetTestState,
  testApp
} from './setup';

async function registerJson(payload: Record<string, unknown>) {
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

describe('Tier 2 (#9) — Regions, Backfill Sekolah & Etalase Sekolah', () => {
  beforeEach(async () => {
    await resetTestState();
  });

  test('backfillSchools merges variant SMK names into single schoolId and links legacy products', async () => {
    const hash = await Bun.password.hash('password123', { algorithm: 'bcrypt', cost: 4 });

    // Insert legacy users without schoolId and with messy casing/spelling of SMKN 1 Cibinong
    const [tRes] = await db.insert(users).values({
      name: 'Guru Hendra',
      username: 'guru_legacy',
      email: 'guru_legacy@voc.id',
      password: hash,
      phoneNumber: '0811223344',
      userType: 'teacher',
      schoolName: 'SMK Negeri 1 Cibinong',
      isVerified: true
    });

    const [s1Res] = await db.insert(users).values({
      name: 'Siswa Satu',
      username: 'siswa_satu',
      email: 's1@voc.id',
      password: hash,
      phoneNumber: '0812111111',
      userType: 'smk',
      schoolName: '  smkn   1   cibinong ',
      major: 'RPL'
    });

    const [s2Res] = await db.insert(users).values({
      name: 'Siswa Dua',
      username: 'siswa_dua',
      email: 's2@voc.id',
      password: hash,
      phoneNumber: '0812222222',
      userType: 'smk',
      schoolName: 'SMKN 1 CIBINONG',
      major: 'TKJ'
    });

    await db.insert(products).values({
      userId: s1Res.insertId,
      type: 'product',
      name: 'Alat IoT Hidroponik',
      code: 'VOC-PRD-LEGACY1',
      description: 'Alat penyiram tanaman otomatis buatan siswa RPL.',
      image: '/uploads/posts/dummy.webp',
      price: 120000,
      status: 'published'
    });

    const result = await backfillSchools();
    expect(result.schoolsCreatedOrLinked).toBe(1);
    expect(result.usersUpdated).toBe(3);
    expect(result.productsUpdated).toBe(1);

    const allSchools = await db.select().from(schools);
    expect(allSchools.length).toBe(1);
    expect(allSchools[0].name).toBe('SMKN 1 Cibinong');
    expect(allSchools[0].slug).toBe('smkn-1-cibinong');
    expect(allSchools[0].majors).toContain('RPL');
    expect(allSchools[0].majors).toContain('TKJ');

    const allUsers = await db.select().from(users);
    for (const u of allUsers) {
      expect(u.schoolId).toBe(allSchools[0].id);
      expect(u.schoolName).toBe('SMKN 1 Cibinong');
    }

    // Verified teacher automatically promoted to school admin
    const teacher = allUsers.find((u) => u.id === tRes.insertId)!;
    expect(Boolean(teacher.isSchoolAdmin)).toBe(true);
    void s2Res;
  });

  test('serves /api/schools/:slug with stats & TeFa tab, injects OG tags, and restricts /manage strictly to isSchoolAdmin of that school', async () => {
    const [regBogor] = await db.insert(regions).values({
      code: '32.01',
      name: 'Kabupaten Bogor',
      province: 'Jawa Barat',
      type: 'kabupaten'
    });

    // 1st teacher registered at SMKN 1 Cibinong becomes isSchoolAdmin = true
    const adminTeacher = await registerJson({
      email: 'admin.guru@smkn1.id',
      firstName: 'Hendra',
      lastName: 'Admin',
      username: 'hendra_admin',
      password: 'password123',
      confirmPassword: 'password123',
      phoneNumber: '0811000111',
      userType: 'teacher',
      schoolName: 'SMKN 1 Cibinong',
      regionId: regBogor.insertId
    });
    expect(adminTeacher.status).toBe(201);
    expect(adminTeacher.json.user.isSchoolAdmin).toBe(true);

    // 2nd teacher at same school gets isSchoolAdmin = false
    const regularTeacher = await registerJson({
      email: 'biasa.guru@smkn1.id',
      firstName: 'Budi',
      lastName: 'Guru',
      username: 'budi_guru',
      password: 'password123',
      confirmPassword: 'password123',
      phoneNumber: '0811000222',
      userType: 'teacher',
      schoolName: 'SMKN 1 Cibinong'
    });
    expect(regularTeacher.status).toBe(201);
    expect(regularTeacher.json.user.isSchoolAdmin).toBe(false);

    // Teacher from DIFFERENT school (isSchoolAdmin = true for SMKN 3 Malang, NOT Cibinong!)
    const otherSchoolTeacher = await registerJson({
      email: 'malang.guru@smkn3.id',
      firstName: 'Ratna',
      lastName: 'Malang',
      username: 'ratna_malang',
      password: 'password123',
      confirmPassword: 'password123',
      phoneNumber: '0811000333',
      userType: 'teacher',
      schoolName: 'SMKN 3 Malang'
    });
    expect(otherSchoolTeacher.status).toBe(201);

    // Student at SMKN 1 Cibinong uploads a product
    const student = await registerJson({
      email: 'siswa.cibinong@voc.id',
      firstName: 'Dika',
      lastName: 'Pratama',
      username: 'dika_rpl',
      password: 'password123',
      confirmPassword: 'password123',
      phoneNumber: '081299988877',
      userType: 'smk',
      schoolName: 'smk negeri 1 cibinong',
      major: 'RPL'
    });
    expect(student.status).toBe(201);
    expect(student.json.user.schoolId).toBe(adminTeacher.json.user.schoolId);

    const postForm = new FormData();
    postForm.append('type', 'product');
    postForm.append('name', 'Lampu Akrilik TeFa');
    postForm.append('description', 'Lampu grafir CNC buatan unit produksi sekolah.');
    postForm.append('price', '95000');
    postForm.append('stock', '10');
    postForm.append('image', await createFakePngFile('tefa.png'));

    const createPostRes = await testApp.handle(
      new Request('http://localhost/api/posts', {
        method: 'POST',
        headers: { Cookie: student.cookie },
        body: postForm
      })
    );
    expect(createPostRes.status).toBe(201);
    const createdPost = await createPostRes.json();

    // Teacher marks post as Verified + Official TeFa Product
    const verifyPostRes = await testApp.handle(
      new Request(`http://localhost/api/teacher/posts/${createdPost.id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminTeacher.cookie
        },
        body: JSON.stringify({
          isVerified: true,
          teacherNote: 'Standar kualitas TeFa lulus QC.',
          isTefa: true,
          tefaUnit: 'TeFa Technopark RPL & Kriya'
        })
      })
    );
    expect(verifyPostRes.status).toBe(200);

    // Non-admin teacher at same school gets 403 when trying to edit school etalase
    const forbiddenSameSchool = await testApp.handle(
      new Request('http://localhost/api/schools/smkn-1-cibinong/manage', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: regularTeacher.cookie
        },
        body: JSON.stringify({ description: 'Coba ubah tanpa izin' })
      })
    );
    expect(forbiddenSameSchool.status).toBe(403);

    // Admin teacher from OTHER school also gets 403
    const forbiddenOtherSchool = await testApp.handle(
      new Request('http://localhost/api/schools/smkn-1-cibinong/manage', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: otherSchoolTeacher.cookie
        },
        body: JSON.stringify({ description: 'Coba ubah dari sekolah lain' })
      })
    );
    expect(forbiddenOtherSchool.status).toBe(403);

    // Authorized School Admin updates school etalase with logo WebP
    const manageForm = new FormData();
    manageForm.append('npsn', '20231421');
    manageForm.append('description', 'Etalase Resmi Teaching Factory SMKN 1 Cibinong.');
    manageForm.append('hasTefa', 'true');
    manageForm.append('tefaDescription', 'Melayani pesanan CNC & aplikasi web.');
    manageForm.append('officialPhone', '02187907234');
    manageForm.append('logo', await createFakePngFile('logo.png'));

    const manageOk = await testApp.handle(
      new Request('http://localhost/api/schools/smkn-1-cibinong/manage', {
        method: 'PUT',
        headers: { Cookie: adminTeacher.cookie },
        body: manageForm
      })
    );
    expect(manageOk.status).toBe(200);
    const manageJson = await manageOk.json();
    expect(manageJson.logoUrl.endsWith('.webp')).toBe(true);

    // Public GET /api/schools/smkn-1-cibinong returns stats, works, and tefaWorks without leaking student phone
    const showRes = await testApp.handle(
      new Request('http://localhost/api/schools/smkn-1-cibinong')
    );
    expect(showRes.status).toBe(200);
    const showJson = await showRes.json();
    expect(showJson.school.npsn).toBe('20231421');
    expect(showJson.school.hasTefa).toBe(true);
    expect(showJson.school.stats.totalStudents).toBe(1);
    expect(showJson.school.stats.totalWorks).toBe(1);
    expect(showJson.school.stats.tefaWorksCount).toBe(1);
    expect(showJson.school.tefaWorks.length).toBe(1);
    expect(showJson.school.tefaWorks[0].tefaUnit).toBe('TeFa Technopark RPL & Kriya');
    expect(showJson.school.officialWhatsappUrl).toContain('622187907234');
    expect(JSON.stringify(showJson)).not.toContain('081299988877');

    // Dynamic Open Graph tags on /sekolah/smkn-1-cibinong
    const ogRes = await testApp.handle(new Request('http://localhost/sekolah/smkn-1-cibinong'));
    const ogHtml = await ogRes.text();
    expect(ogHtml).toContain('Etalase Sekolah: SMKN 1 Cibinong');
  });
});

