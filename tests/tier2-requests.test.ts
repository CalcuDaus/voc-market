import { beforeEach, describe, expect, test } from 'bun:test';
import {
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

describe('Tier 2 (#6) — Papan "Butuh Bantuan" (Request Board)', () => {
  beforeEach(async () => {
    await resetTestState();
  });

  test('citizen posts request, hides fullAddress from public, enforces maxProposals, creates Order on accept, and marks request completed when order completes', async () => {
    const citizen = await registerUser({
      email: 'umkm@warung.id',
      firstName: 'Pak',
      lastName: 'Slamet',
      username: 'warung_slamet',
      password: 'password123',
      confirmPassword: 'password123',
      phoneNumber: '081311112222',
      userType: 'public'
    });

    const studentA = await registerUser({
      email: 'siswa.a@voc.id',
      firstName: 'Raka',
      lastName: 'DKV',
      username: 'raka_dkv',
      password: 'password123',
      confirmPassword: 'password123',
      phoneNumber: '081200001111',
      userType: 'smk',
      schoolName: 'SMKN 4 Yogyakarta',
      major: 'DKV'
    });

    const studentB = await registerUser({
      email: 'siswa.b@voc.id',
      firstName: 'Nadia',
      lastName: 'DKV',
      username: 'nadia_dkv',
      password: 'password123',
      confirmPassword: 'password123',
      phoneNumber: '081200002222',
      userType: 'smk',
      schoolName: 'SMKN 4 Yogyakarta',
      major: 'DKV'
    });

    const studentC = await registerUser({
      email: 'siswa.c@voc.id',
      firstName: 'Fajar',
      lastName: 'DKV',
      username: 'fajar_dkv',
      password: 'password123',
      confirmPassword: 'password123',
      phoneNumber: '081200003333',
      userType: 'smk',
      schoolName: 'SMKN 1 Cibinong',
      major: 'DKV'
    });

    // Guest cannot post request (safety guard for minors)
    const guestPost = await testApp.handle(
      new Request('http://localhost/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Butuh Desain Spanduk Pecel Lele',
          description: 'Ukuran 3x1 meter siap cetak dengan ilustrasi menarik.'
        })
      })
    );
    expect(guestPost.status).toBe(401);

    // Citizen posts request with maxProposals = 2 and private fullAddress
    const createReqRes = await testApp.handle(
      new Request('http://localhost/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: citizen.cookie
        },
        body: JSON.stringify({
          title: 'Butuh Desain Logo & Spanduk Warung Kopi Slamet',
          description: 'Mohon dibuatkan logo sederhana dan spanduk ukuran 3x1 meter siap cetak.',
          budgetType: 'range',
          budgetMin: 100000,
          budgetMax: 200000,
          workMode: 'onsite',
          locationDetail: 'Kecamatan Umbulharjo, dekat Terminal',
          fullAddress: 'Jl. Rahasia Blok Z9 No. 99 RT 05/02 (Rumah Pagar Hijau)',
          maxProposals: 2
        })
      })
    );
    expect(createReqRes.status).toBe(201);
    const { code } = await createReqRes.json();

    // Public guest & non-selected student MUST NOT see fullAddress
    const publicDetailRes = await testApp.handle(
      new Request(`http://localhost/api/requests/${code}`)
    );
    expect(publicDetailRes.status).toBe(200);
    const publicDetailJson = await publicDetailRes.json();
    expect(publicDetailJson.request.fullAddress).toBeNull();
    expect(JSON.stringify(publicDetailJson)).not.toContain('Blok Z9 No. 99');

    // Poster CAN see fullAddress
    const ownerDetailRes = await testApp.handle(
      new Request(`http://localhost/api/requests/${code}`, {
        headers: { Cookie: citizen.cookie }
      })
    );
    const ownerDetailJson = await ownerDetailRes.json();
    expect(ownerDetailJson.request.fullAddress).toContain('Blok Z9 No. 99');

    // Student A submits proposal #1
    const propARes = await testApp.handle(
      new Request(`http://localhost/api/requests/${code}/proposals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: studentA.cookie
        },
        body: JSON.stringify({
          message: 'Siap Pak Slamet! Saya kerjakan 2 pilihan desain dalam 3 hari.',
          offeredPrice: 150000,
          estimatedDays: 3
        })
      })
    );
    expect(propARes.status).toBe(201);
    const propA = await propARes.json();

    // Duplicate proposal by Student A rejected with 409
    const dupPropRes = await testApp.handle(
      new Request(`http://localhost/api/requests/${code}/proposals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: studentA.cookie
        },
        body: JSON.stringify({
          message: 'Coba kirim penawaran kedua.',
          offeredPrice: 140000,
          estimatedDays: 2
        })
      })
    );
    expect(dupPropRes.status).toBe(409);

    // Student B submits proposal #2 (reaches maxProposals = 2)
    const propBRes = await testApp.handle(
      new Request(`http://localhost/api/requests/${code}/proposals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: studentB.cookie
        },
        body: JSON.stringify({
          message: 'Halo Pak, saya berpengalaman mendesain spanduk UMKM kuliner.',
          offeredPrice: 175000,
          estimatedDays: 4
        })
      })
    );
    expect(propBRes.status).toBe(201);

    // Student C blocked by maxProposals = 2 with HTTP 422!
    const propCRes = await testApp.handle(
      new Request(`http://localhost/api/requests/${code}/proposals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: studentC.cookie
        },
        body: JSON.stringify({
          message: 'Saya juga ingin mengajukan penawaran desain.',
          offeredPrice: 130000,
          estimatedDays: 2
        })
      })
    );
    expect(propCRes.status).toBe(422);

    // Poster accepts Student A's proposal -> creates Order (source='job_request') & rejects Student B
    const acceptRes = await testApp.handle(
      new Request(`http://localhost/api/proposals/${propA.id}/accept`, {
        method: 'POST',
        headers: { Cookie: citizen.cookie }
      })
    );
    expect(acceptRes.status).toBe(200);
    const acceptJson = await acceptRes.json();
    expect(acceptJson.orderCode).toMatch(/^VOC-ORD-/);

    // Accepted Student A CAN now see fullAddress; rejected Student B CANNOT
    const studentADetail = await (
      await testApp.handle(
        new Request(`http://localhost/api/requests/${code}`, {
          headers: { Cookie: studentA.cookie }
        })
      )
    ).json();
    expect(studentADetail.request.status).toBe('assigned');
    expect(studentADetail.request.fullAddress).toContain('Blok Z9 No. 99');

    const studentBDetail = await (
      await testApp.handle(
        new Request(`http://localhost/api/requests/${code}`, {
          headers: { Cookie: studentB.cookie }
        })
      )
    ).json();
    expect(studentBDetail.request.fullAddress).toBeNull();
    expect(studentBDetail.request.myProposal.status).toBe('rejected');

    // Verify order exists in Student A's /api/seller/orders with source = 'job_request'
    const sellerOrdersJson = await (
      await testApp.handle(
        new Request('http://localhost/api/seller/orders', {
          headers: { Cookie: studentA.cookie }
        })
      )
    ).json();
    expect(sellerOrdersJson.items.length).toBe(1);
    const createdOrder = sellerOrdersJson.items[0];
    expect(createdOrder.source).toBe('job_request');
    expect(createdOrder.status).toBe('accepted');
    expect(createdOrder.agreedPrice).toBe(150000);

    // Student A completes the order -> job_requests.status automatically becomes 'completed'
    const completeOrderRes = await testApp.handle(
      new Request(`http://localhost/api/seller/orders/${createdOrder.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: studentA.cookie
        },
        body: JSON.stringify({
          status: 'completed',
          progressNote: 'File master logo & spanduk siap cetak sudah diserahkan.'
        })
      })
    );
    expect(completeOrderRes.status).toBe(200);

    const finalReqJson = await (
      await testApp.handle(new Request(`http://localhost/api/requests/${code}`))
    ).json();
    expect(finalReqJson.request.status).toBe('completed');
  });
});

