import { beforeEach, describe, expect, test } from 'bun:test';
import {
  createFakePngFile,
  extractSessionCookie,
  resetTestState,
  testApp
} from './setup';

describe('Tier 1 — Teacher School Verification, Digital Work Passport + QR & Open Graph HTML', () => {
  beforeEach(async () => {
    await resetTestState();
  });

  test('enforces same-school teacher verification, renders Passport metrics + QR SVG, and injects OG meta tags', async () => {
    // 1. Register Teacher at SMKN 1 Cibinong
    const regTeacher = await testApp.handle(
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'hendra@smkn1cibinong.id',
          firstName: 'Hendra',
          lastName: 'Guru',
          username: 'guru_cibinong',
          password: 'password123',
          confirmPassword: 'password123',
          phoneNumber: '081100001111',
          userType: 'teacher',
          schoolName: 'SMKN 1 Cibinong',
          nip: '197901012005011001'
        })
      })
    );
    const teacherCookie = extractSessionCookie(regTeacher);

    // 2. Register Student A at SMKN 1 Cibinong & Student B at SMKN 4 Yogyakarta
    const regStudentA = await testApp.handle(
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'andreaz@smkn1cibinong.id',
          firstName: 'Andreaz',
          lastName: 'Pratama',
          username: 'andreaz_rpl',
          password: 'password123',
          confirmPassword: 'password123',
          phoneNumber: '081200001111',
          userType: 'smk',
          schoolName: 'SMKN 1 Cibinong',
          major: 'RPL'
        })
      })
    );
    const studentACookie = extractSessionCookie(regStudentA);
    const studentA = (await regStudentA.json()).user;

    const regStudentB = await testApp.handle(
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'maya@smkn4jogja.id',
          firstName: 'Maya',
          lastName: 'DKV',
          username: 'maya_jogja',
          password: 'password123',
          confirmPassword: 'password123',
          phoneNumber: '081200002222',
          userType: 'smk',
          schoolName: 'SMKN 4 Yogyakarta',
          major: 'DKV'
        })
      })
    );
    const studentB = (await regStudentB.json()).user;

    // 3. Student A uploads a service
    const form = new FormData();
    form.append('type', 'service');
    form.append('name', 'Pembuatan Website Profil UMKM Responsif');
    form.append('priceMin', '150000');
    form.append('priceMax', '350000');
    form.append('description', 'Jasa pembuatan landing page modern cepat dan hemat kuota.');
    form.append('image', await createFakePngFile('web.png'));

    const postA = await (
      await testApp.handle(
        new Request('http://localhost/api/posts', {
          method: 'POST',
          headers: { Cookie: studentACookie },
          body: form
        })
      )
    ).json();

    // 4. Teacher verifies Student A (200) & stamps TeFa on Post A (200), but fails on Student B (403)
    const verifyA = await testApp.handle(
      new Request(`http://localhost/api/teacher/students/${studentA.id}/verify`, {
        method: 'POST',
        headers: {
          Cookie: teacherCookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isVerified: true })
      })
    );
    expect(verifyA.status).toBe(200);

    const verifyB = await testApp.handle(
      new Request(`http://localhost/api/teacher/students/${studentB.id}/verify`, {
        method: 'POST',
        headers: {
          Cookie: teacherCookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isVerified: true })
      })
    );
    expect(verifyB.status).toBe(403);

    const stampPostA = await testApp.handle(
      new Request(`http://localhost/api/teacher/posts/${postA.id}/verify`, {
        method: 'POST',
        headers: {
          Cookie: teacherCookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isVerified: true,
          teacherNote: 'Kode rapi dan telah diuji standar Teaching Factory RPL.'
        })
      })
    );
    expect(stampPostA.status).toBe(200);

    // 5. Complete 1 real order & review so Passport has verified track record
    const ord = await (
      await testApp.handle(
        new Request('http://localhost/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: postA.id,
            buyerName: 'Pak Budi Bengkel',
            buyerPhone: '081388889999',
            quantity: 1
          })
        })
      )
    ).json();

    const sellerList = await (
      await testApp.handle(
        new Request('http://localhost/api/seller/orders', {
          headers: { Cookie: studentACookie }
        })
      )
    ).json();

    await testApp.handle(
      new Request(`http://localhost/api/seller/orders/${sellerList.items[0].id}/status`, {
        method: 'PATCH',
        headers: { Cookie: studentACookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'accepted' })
      })
    );
    await testApp.handle(
      new Request(`http://localhost/api/seller/orders/${sellerList.items[0].id}/status`, {
        method: 'PATCH',
        headers: { Cookie: studentACookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', agreedPrice: 200000 })
      })
    );

    await testApp.handle(
      new Request(`http://localhost/api/orders/${ord.orderCode}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: ord.reviewToken,
          rating: 5,
          comment: 'Websitenya bagus sekali dan mudah dipakai!',
          endorsementTags: ['Solutif', 'Tepat Waktu']
        })
      })
    );

    // 6. Verify Digital Work Passport endpoint
    const passRes = await testApp.handle(
      new Request('http://localhost/api/passport/andreaz_rpl')
    );
    expect(passRes.status).toBe(200);
    const passJson = await passRes.json();
    expect(passJson.passport.student.isVerified).toBe(true);
    expect(passJson.passport.student.verifierName).toBe('Hendra Guru');
    expect(passJson.passport.metrics.completedOrdersCount).toBe(1);
    expect(passJson.passport.metrics.avgRating).toBe(5);
    expect(passJson.passport.metrics.totalProjectValue).toBe(200000);
    expect(passJson.passport.metrics.tefaApprovedWorksCount).toBe(1);
    expect(passJson.passport.qrSvg).toContain('<svg');

    // 7. Verify HTML Open Graph Meta injection on /karya/:id and /paspor-kerja/:username
    const ogPostHtml = await (
      await testApp.handle(new Request(`http://localhost/karya/${postA.id}`))
    ).text();
    expect(ogPostHtml).toContain('property="og:title"');
    expect(ogPostHtml).toContain('Pembuatan Website Profil UMKM Responsif');

    const ogPassHtml = await (
      await testApp.handle(new Request('http://localhost/paspor-kerja/andreaz_rpl'))
    ).text();
    expect(ogPassHtml).toContain('Paspor Kerja Digital: Andreaz Pratama');
  });
});

