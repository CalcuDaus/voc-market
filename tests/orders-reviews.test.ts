import { beforeEach, describe, expect, test } from 'bun:test';
import {
  createFakePngFile,
  extractSessionCookie,
  resetTestState,
  testApp
} from './setup';

describe('Tier 1 — Guest Checkout Order Workflow, Stock Decrement & Verified Reviews', () => {
  beforeEach(async () => {
    await resetTestState();
  });

  test('completes full order lifecycle from guest buyer to seller proof upload and verified review', async () => {
    // 1. Register SMK student & create product with stock = 5
    const regSeller = await testApp.handle(
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'siti@smkn3.id',
          firstName: 'Siti',
          lastName: 'Bakery',
          username: 'siti_kue',
          password: 'password123',
          confirmPassword: 'password123',
          phoneNumber: '087811223344',
          userType: 'smk',
          schoolName: 'SMKN 3 Malang',
          major: 'Tata Boga'
        })
      })
    );
    const sellerCookie = extractSessionCookie(regSeller);

    const postForm = new FormData();
    postForm.append('type', 'product');
    postForm.append('name', 'Nastar Keju Wijsman 500gr');
    postForm.append('price', '55000');
    postForm.append('costPrice', '35000');
    postForm.append('stock', '5');
    postForm.append('description', 'Kue nastar lembut buatan unit produksi Tata Boga SMK.');
    postForm.append('image', await createFakePngFile('nastar.png'));

    const postRes = await testApp.handle(
      new Request('http://localhost/api/posts', {
        method: 'POST',
        headers: { Cookie: sellerCookie },
        body: postForm
      })
    );
    const post = await postRes.json();

    // 2. Guest buyer places order for quantity = 2 WITHOUT logging in!
    const orderRes = await testApp.handle(
      new Request('http://localhost/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: post.id,
          buyerName: 'Ibu Dewi Warga',
          buyerPhone: '081355667788',
          buyerAddress: 'Jl. Soekarno Hatta No. 10, Malang',
          buyerNotes: 'Tolong dikemas rapi untuk hantaran.',
          quantity: 2
        })
      })
    );
    expect(orderRes.status).toBe(201);
    const orderCreated = await orderRes.json();
    expect(orderCreated.orderCode).toStartWith('VOC-ORD-');
    expect(orderCreated.reviewToken.length).toBeGreaterThanOrEqual(32);
    expect(orderCreated.whatsappUrl).toContain('https://wa.me/6287811223344');

    // 3. Tracking without token is blocked (403); with valid token returns 200
    const badTrack = await testApp.handle(
      new Request(`http://localhost/api/orders/track/${orderCreated.orderCode}?token=wrong`)
    );
    expect(badTrack.status).toBe(403);

    const goodTrack = await testApp.handle(
      new Request(
        `http://localhost/api/orders/track/${orderCreated.orderCode}?token=${orderCreated.reviewToken}`
      )
    );
    expect(goodTrack.status).toBe(200);
    const trackText = await goodTrack.text();
    expect(trackText).not.toContain('unitCostSnapshot');
    const trackJson = JSON.parse(trackText);
    expect(trackJson.order.agreedPrice).toBe(110000);
    expect(trackJson.order.status).toBe('requested');

    // 4. Attempting review BEFORE completion must fail with HTTP 422
    const prematureReview = await testApp.handle(
      new Request(`http://localhost/api/orders/${orderCreated.orderCode}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: orderCreated.reviewToken,
          rating: 5,
          comment: 'Belum selesai tapi coba review.'
        })
      })
    );
    expect(prematureReview.status).toBe(422);

    // 5. Seller transitions: requested -> accepted -> in_progress -> completed (with WebP proof)
    const sellerOrders = await (
      await testApp.handle(
        new Request('http://localhost/api/seller/orders', {
          headers: { Cookie: sellerCookie }
        })
      )
    ).json();
    const orderId = sellerOrders.items[0].id;

    const step1 = await testApp.handle(
      new Request(`http://localhost/api/seller/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          Cookie: sellerCookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'accepted' })
      })
    );
    expect(step1.status).toBe(200);

    const step2 = await testApp.handle(
      new Request(`http://localhost/api/seller/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          Cookie: sellerCookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'in_progress',
          progressNote: 'Adonan sedang dipanggang di dapur sekolah.'
        })
      })
    );
    expect(step2.status).toBe(200);

    const completeForm = new FormData();
    completeForm.append('status', 'completed');
    completeForm.append('progressNote', '2 toples nastar sudah diserahkan ke Ibu Dewi.');
    completeForm.append('proofImage', await createFakePngFile('bukti_serah_terima.png'));

    const step3 = await testApp.handle(
      new Request(`http://localhost/api/seller/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { Cookie: sellerCookie },
        body: completeForm
      })
    );
    expect(step3.status).toBe(200);
    const completedData = await step3.json();
    expect(completedData.proofImageUrl.endsWith('.webp')).toBe(true);

    // Verify product stock automatically decreased from 5 -> 3
    const detailAfter = await (
      await testApp.handle(new Request(`http://localhost/api/posts/${post.id}`))
    ).json();
    expect(detailAfter.post.stock).toBe(3);

    // 6. Buyer submits verified review -> 201; duplicate review -> 409
    const revRes = await testApp.handle(
      new Request(`http://localhost/api/orders/${orderCreated.orderCode}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: orderCreated.reviewToken,
          rating: 5,
          comment: 'Nastarnya enak sekali dan pengantaran tepat waktu!',
          endorsementTags: ['Rapi & Berkualitas', 'Tepat Waktu']
        })
      })
    );
    expect(revRes.status).toBe(201);

    const dupRevRes = await testApp.handle(
      new Request(`http://localhost/api/orders/${orderCreated.orderCode}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: orderCreated.reviewToken,
          rating: 4,
          comment: 'Coba kirim ulasan ganda.'
        })
      })
    );
    expect(dupRevRes.status).toBe(409);
  });
});

