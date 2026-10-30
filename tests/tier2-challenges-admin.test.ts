import { beforeEach, describe, expect, test } from 'bun:test';
import { db } from '../src/server/db';
import { users } from '../src/server/db/schema';
import { NotifyService } from '../src/server/services/notify.service';
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

describe('Tier 2 (#7) — Tantangan Industri, Sertifikat QR, WebSocket & Moderasi Admin', () => {
  beforeEach(async () => {
    await resetTestState();
  });

  test('validates judgingCriteria===100, hides submissions until finished, requires feedback on announce, issues & revokes QR certificates, and handles reports + live WebSocket push', async () => {
    // 1. Setup Platform Admin
    const hash = await Bun.password.hash('password123', { algorithm: 'bcrypt', cost: 4 });
    await db.insert(users).values({
      name: 'Admin Moderasi',
      username: 'admin_mod',
      email: 'admin.mod@voc.id',
      password: hash,
      phoneNumber: '0811000011',
      userType: 'admin',
      isAdmin: true
    });
    const adminLogin = await testApp.handle(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'admin_mod', password: 'password123' })
      })
    );
    const adminCookie = extractSessionCookie(adminLogin);

    // 2. Register & Verify Company
    const company = await registerUser({
      email: 'challenge@nusantara.co.id',
      firstName: 'Dian',
      lastName: 'HRD',
      username: 'nusantara_corp',
      password: 'password123',
      confirmPassword: 'password123',
      phoneNumber: '081155556666',
      userType: 'company',
      companyName: 'PT Nusantara Inovasi',
      companySector: 'Teknologi'
    });
    await testApp.handle(
      new Request(`http://localhost/api/admin/companies/${company.json.user.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ verified: true })
      })
    );

    // 3. Register Two Students
    const studentWinner = await registerUser({
      email: 'juara@smk.id',
      firstName: 'Laras',
      lastName: 'Putri',
      username: 'laras_juara',
      password: 'password123',
      confirmPassword: 'password123',
      phoneNumber: '081212121212',
      userType: 'smk',
      schoolName: 'SMKN 1 Cibinong',
      major: 'RPL'
    });

    const studentOther = await registerUser({
      email: 'peserta2@smk.id',
      firstName: 'Riko',
      lastName: 'Pratama',
      username: 'riko_peserta',
      password: 'password123',
      confirmPassword: 'password123',
      phoneNumber: '081234343434',
      userType: 'smk',
      schoolName: 'SMKN 4 Yogyakarta',
      major: 'DKV'
    });

    const futureDeadline = new Date(Date.now() + 7 * 86_400_000).toISOString();
    const futureAnnounce = new Date(Date.now() + 14 * 86_400_000).toISOString();

    // 4. Reject challenge creation when judgingCriteria sum !== 100 (e.g. 80%)
    const invalidWeightRes = await testApp.handle(
      new Request('http://localhost/api/company/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: company.cookie },
        body: JSON.stringify({
          title: 'Tantangan UI Aplikasi Koperasi Sekolah',
          summary: 'Desain antarmuka koperasi siswa SMK yang modern dan cepat.',
          brief: 'Buatlah rancangan aplikasi koperasi digital untuk memudahkan siswa membeli alat tulis.',
          requirements: 'Siswa SMK aktif seluruh Indonesia.',
          deliverables: 'Minimal 1 mockup tampilan utama.',
          judgingCriteria: [
            { name: 'Kreativitas', weight: 50 },
            { name: 'Kerapian', weight: 30 }
          ],
          rewardTypes: ['uang', 'sertifikat'],
          prizeDescription: 'Total hadiah Rp 1.500.000 + Sertifikat QR.',
          submissionDeadline: futureDeadline,
          announcementDate: futureAnnounce
        })
      })
    );
    expect(invalidWeightRes.status).toBe(422);

    // 5. Valid challenge creation (weights 60 + 40 === 100) -> starts in 'draft'
    const createChalRes = await testApp.handle(
      new Request('http://localhost/api/company/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: company.cookie },
        body: JSON.stringify({
          title: 'Tantangan UI Aplikasi Koperasi Sekolah',
          summary: 'Desain antarmuka koperasi siswa SMK yang modern dan cepat.',
          brief: 'Buatlah rancangan aplikasi koperasi digital untuk memudahkan siswa membeli alat tulis.',
          requirements: 'Siswa SMK aktif seluruh Indonesia.',
          deliverables: 'Minimal 1 mockup tampilan utama.',
          judgingCriteria: [
            { name: 'Kreativitas & UX', weight: 60 },
            { name: 'Kerapian Visual', weight: 40 }
          ],
          rewardTypes: ['uang', 'sertifikat'],
          prizeDescription: 'Total hadiah Rp 1.500.000 + Sertifikat QR.',
          submissionDeadline: futureDeadline,
          announcementDate: futureAnnounce
        })
      })
    );
    expect(createChalRes.status).toBe(201);
    const { id: challengeId, slug } = await createChalRes.json();

    // Draft challenge is hidden from public/students (404)
    const draftPublicCheck = await testApp.handle(
      new Request(`http://localhost/api/challenges/${slug}`, {
        headers: { Cookie: studentWinner.cookie }
      })
    );
    expect(draftPublicCheck.status).toBe(404);

    // Company submits for review -> Admin approves -> 'open'
    const submitRevRes = await testApp.handle(
      new Request(`http://localhost/api/company/challenges/${slug}/submit-review`, {
        method: 'POST',
        headers: { Cookie: company.cookie }
      })
    );
    expect(submitRevRes.status).toBe(200);

    const modRes = await testApp.handle(
      new Request(`http://localhost/api/admin/challenges/${challengeId}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ action: 'approve' })
      })
    );
    expect(modRes.status).toBe(200);

    // 6. Both students submit entries
    const subForm1 = new FormData();
    subForm1.append('title', 'KoperasiKu: Belanja Tanpa Antre QRIS');
    subForm1.append('description', 'Aplikasi pemesanan alat tulis & kantin koperasi berbasis mobile web.');
    subForm1.append('images', await createFakePngFile('ui1.png'));

    const sub1Res = await testApp.handle(
      new Request(`http://localhost/api/challenges/${slug}/submissions`, {
        method: 'POST',
        headers: { Cookie: studentWinner.cookie },
        body: subForm1
      })
    );
    expect(sub1Res.status).toBe(201);
    const sub1 = await sub1Res.json();

    const subForm2 = new FormData();
    subForm2.append('title', 'SmartKoperasi Dashboard');
    subForm2.append('description', 'Desain dashboard stok barang koperasi siswa yang bersih.');
    subForm2.append('images', await createFakePngFile('ui2.png'));

    const sub2Res = await testApp.handle(
      new Request(`http://localhost/api/challenges/${slug}/submissions`, {
        method: 'POST',
        headers: { Cookie: studentOther.cookie },
        body: subForm2
      })
    );
    expect(sub2Res.status).toBe(201);
    const sub2 = await sub2Res.json();

    // 7. Anti-Plagiarism Check: While status === 'open', studentOther MUST NOT see studentWinner's submission!
    const otherViewWhileOpen = await (
      await testApp.handle(
        new Request(`http://localhost/api/challenges/${slug}`, {
          headers: { Cookie: studentOther.cookie }
        })
      )
    ).json();
    expect(otherViewWhileOpen.challenge.submissions.length).toBe(0);
    expect(otherViewWhileOpen.challenge.mySubmission.id).toBe(sub2.id);

    // Host company CAN see all submissions
    const companyView = await (
      await testApp.handle(
        new Request(`http://localhost/api/challenges/${slug}`, {
          headers: { Cookie: company.cookie }
        })
      )
    ).json();
    expect(companyView.challenge.submissions.length).toBe(2);

    // 8. Company marks sub1 as 'winner' WITHOUT feedback -> announce MUST fail with HTTP 422!
    const evalNoFeedback = await testApp.handle(
      new Request(`http://localhost/api/company/challenges/submissions/${sub1.id}/evaluate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: company.cookie },
        body: JSON.stringify({
          status: 'winner',
          rank: 1,
          scores: { 'Kreativitas & UX': 95, 'Kerapian Visual': 90 },
          feedback: ''
        })
      })
    );
    expect(evalNoFeedback.status).toBe(200);

    const announceFail = await testApp.handle(
      new Request(`http://localhost/api/company/challenges/${slug}/announce`, {
        method: 'POST',
        headers: { Cookie: company.cookie }
      })
    );
    expect(announceFail.status).toBe(422);

    // 9. Company adds constructive feedback to winner & shortlisted finalist -> announce succeeds!
    await testApp.handle(
      new Request(`http://localhost/api/company/challenges/submissions/${sub1.id}/evaluate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: company.cookie },
        body: JSON.stringify({
          status: 'winner',
          rank: 1,
          scores: { 'Kreativitas & UX': 95, 'Kerapian Visual': 90 },
          feedback: 'Alur pre-order istirahat sangat realistis dan UI kontras mudah dipakai!'
        })
      })
    );

    await testApp.handle(
      new Request(`http://localhost/api/company/challenges/submissions/${sub2.id}/evaluate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: company.cookie },
        body: JSON.stringify({
          status: 'shortlisted',
          rank: 2,
          scores: { 'Kreativitas & UX': 85, 'Kerapian Visual': 88 },
          feedback: 'Tata letak tabel inventori sangat rapi dan siap diimplementasikan.'
        })
      })
    );

    const announceOk = await testApp.handle(
      new Request(`http://localhost/api/company/challenges/${slug}/announce`, {
        method: 'POST',
        headers: { Cookie: company.cookie }
      })
    );
    expect(announceOk.status).toBe(200);
    const announceJson = await announceOk.json();
    expect(announceJson.status).toBe('finished');
    expect(announceJson.issuedCertificatesCount).toBe(2);

    const winnerCert = announceJson.certificates.find(
      (c: { type: string }) => c.type === 'winner'
    );
    expect(winnerCert.code).toMatch(/^VOC-CERT-/);

    // After 'finished', public gallery shows submissions + certificates
    const finishedGallery = await (
      await testApp.handle(new Request(`http://localhost/api/challenges/${slug}`))
    ).json();
    expect(finishedGallery.challenge.submissions.length).toBe(2);

    // 10. Verify Certificate QR SVG endpoint & Revocation handling
    const certVerifyRes = await testApp.handle(
      new Request(`http://localhost/api/certificates/${winnerCert.code}`)
    );
    expect(certVerifyRes.status).toBe(200);
    const certVerifyJson = await certVerifyRes.json();
    expect(certVerifyJson.certificate.isValid).toBe(true);
    expect(certVerifyJson.certificate.isRevoked).toBe(false);
    expect(certVerifyJson.certificate.qrSvg).toContain('<svg');

    // Admin revokes certificate -> /api/certificates/:code shows isRevoked = true & isValid = false
    const revokeRes = await testApp.handle(
      new Request(`http://localhost/api/admin/certificates/${winnerCert.code}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ revoke: true })
      })
    );
    expect(revokeRes.status).toBe(200);

    const certAfterRevoke = await (
      await testApp.handle(
        new Request(`http://localhost/api/certificates/${winnerCert.code}`)
      )
    ).json();
    expect(certAfterRevoke.certificate.isValid).toBe(false);
    expect(certAfterRevoke.certificate.isRevoked).toBe(true);
    expect(certAfterRevoke.certificate.revokedAt).not.toBeNull();

    // 11. Content Reporting & Admin Moderation hides abusive request
    const badReqRes = await testApp.handle(
      new Request('http://localhost/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: company.cookie },
        body: JSON.stringify({
          title: 'Permintaan Mencurigakan Minta Biaya Pendaftaran',
          description: 'Silakan transfer uang pendaftaran terlebih dahulu sebelum kerja.'
        })
      })
    );
    const badReq = await badReqRes.json();

    const reportRes = await testApp.handle(
      new Request('http://localhost/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: studentWinner.cookie },
        body: JSON.stringify({
          targetType: 'request',
          targetId: badReq.id,
          reason: 'penipuan',
          details: 'Meminta uang transfer di awal kepada siswa.'
        })
      })
    );
    expect(reportRes.status).toBe(201);
    const reportJson = await reportRes.json();

    const actionReportRes = await testApp.handle(
      new Request(`http://localhost/api/admin/reports/${reportJson.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ status: 'actioned', hideTarget: true })
      })
    );
    expect(actionReportRes.status).toBe(200);

    // Hidden request returns 404 to public
    const hiddenCheck = await testApp.handle(
      new Request(`http://localhost/api/requests/${badReq.code}`)
    );
    expect(hiddenCheck.status).toBe(404);

    // 12. Real-time WebSocket /ws live push verification
    const srv = testApp.listen(0);
    const port = srv.server?.port;
    try {
      const receivedEvents: Record<string, unknown>[] = [];
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('WebSocket timeout')), 4000);
        const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`, {
          headers: { Cookie: studentWinner.cookie }
        } as unknown as string[]);

        ws.onmessage = async (ev) => {
          const parsed = JSON.parse(String(ev.data)) as Record<string, unknown>;
          receivedEvents.push(parsed);
          if (parsed.event === 'connected') {
            await NotifyService.send({
              userId: studentWinner.json.user.id,
              type: 'ws_live_test',
              title: 'Uji Push Real-Time WebSocket',
              body: 'Notifikasi terkirim instan melalui Elysia WS.'
            });
          } else if (parsed.event === 'notification') {
            clearTimeout(timer);
            ws.close();
            resolve();
          }
        };
        ws.onerror = (err) => {
          clearTimeout(timer);
          reject(err);
        };
      });

      expect(receivedEvents.some((e) => e.event === 'connected')).toBe(true);
      const pushEvt = receivedEvents.find((e) => e.event === 'notification') as {
        notification: { type: string; title: string };
      };
      expect(pushEvt.notification.type).toBe('ws_live_test');
    } finally {
      await srv.stop();
    }
  });
});

