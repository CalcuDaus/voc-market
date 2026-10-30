import { beforeEach, describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  createFakePngFile,
  extractSessionCookie,
  resetTestState,
  testApp
} from './setup';

async function registerUser(params: {
  username: string;
  email: string;
  userType: 'smk' | 'public' | 'teacher';
  schoolName?: string;
}) {
  const res = await testApp.handle(
    new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: params.email,
        firstName: params.username,
        lastName: 'Test',
        username: params.username,
        password: 'password123',
        confirmPassword: 'password123',
        phoneNumber: '081299998888',
        userType: params.userType,
        schoolName: params.schoolName || 'SMKN 1 Cibinong',
        nisn: '0051122334'
      })
    })
  );
  const data = await res.json();
  return { cookie: extractSessionCookie(res), user: data.user };
}

describe('Tier 1 — Catalog, WebP Upload, Privacy, Detail Views, Edit/Delete & Like', () => {
  beforeEach(async () => {
    await resetTestState();
  });

  test('uploads product as WebP, enforces privacy in public catalog/search, and blocks non-SMK upload', async () => {
    const smk = await registerUser({
      username: 'kreator_rpl',
      email: 'rpl@voc.id',
      userType: 'smk'
    });
    const buyer = await registerUser({
      username: 'pembeli_umum',
      email: 'umum@voc.id',
      userType: 'public'
    });

    // Public buyer cannot upload works
    const forbiddenForm = new FormData();
    forbiddenForm.append('type', 'product');
    forbiddenForm.append('name', 'Produk Ilegal');
    forbiddenForm.append('price', '50000');
    forbiddenForm.append('description', 'Deskripsi cukup panjang untuk validasi.');
    forbiddenForm.append('image', await createFakePngFile('ilegal.png'));

    const forbiddenRes = await testApp.handle(
      new Request('http://localhost/api/posts', {
        method: 'POST',
        headers: { Cookie: buyer.cookie },
        body: forbiddenForm
      })
    );
    expect(forbiddenRes.status).toBe(403);

    // SMK student uploads product
    const form = new FormData();
    form.append('type', 'product');
    form.append('name', 'Lampu Akrilik Grafir CNC');
    form.append('price', '85000');
    form.append('costPrice', '42000');
    form.append('stock', '10');
    form.append('description', 'Lampu hias kamar buatan bengkel siswa SMK presisi.');
    form.append('image', await createFakePngFile('lampu.png'));

    const createRes = await testApp.handle(
      new Request('http://localhost/api/posts', {
        method: 'POST',
        headers: { Cookie: smk.cookie },
        body: form
      })
    );
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.imageUrl.endsWith('.webp')).toBe(true);

    const diskBuf = await readFile(join(process.cwd(), 'public', created.imageUrl));
    expect(diskBuf.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(diskBuf.subarray(8, 12).toString('ascii')).toBe('WEBP');

    // Public catalog MUST NOT leak costPrice, phoneNumber, nisn, or password
    const feedRes = await testApp.handle(new Request('http://localhost/api/posts'));
    expect(feedRes.status).toBe(200);
    const feedText = await feedRes.text();
    expect(feedText).not.toContain('42000');
    expect(feedText).not.toContain('costPrice');
    expect(feedText).not.toContain('081299998888');
    expect(feedText).not.toContain('0051122334');
    expect(feedText).not.toContain('password');

    // Search endpoint returns item and escapes wildcards safely
    const searchRes = await testApp.handle(
      new Request('http://localhost/api/search?q=Akrilik')
    );
    expect(searchRes.status).toBe(200);
    const searchJson = await searchRes.json();
    expect(searchJson.posts.length).toBe(1);
    expect(searchJson.posts[0].name).toBe('Lampu Akrilik Grafir CNC');
  });

  test('increments viewsCount with deduplication, enforces owner-only edit/delete, and toggles likes', async () => {
    const owner = await registerUser({
      username: 'pemilik_karya',
      email: 'owner@voc.id',
      userType: 'smk'
    });
    const stranger = await registerUser({
      username: 'siswa_lain',
      email: 'stranger@voc.id',
      userType: 'smk'
    });

    const form = new FormData();
    form.append('type', 'service');
    form.append('name', 'Jasa Tune Up Motor Injeksi');
    form.append('priceMin', '45000');
    form.append('priceMax', '100000');
    form.append('description', 'Servis ringan motor matic injeksi menggunakan scanner resmi.');
    form.append('image', await createFakePngFile('motor.png'));

    const created = await (
      await testApp.handle(
        new Request('http://localhost/api/posts', {
          method: 'POST',
          headers: { Cookie: owner.cookie },
          body: form
        })
      )
    ).json();

    // First view by stranger -> viewsCount becomes 1
    const view1 = await (
      await testApp.handle(
        new Request(`http://localhost/api/posts/${created.id}`, {
          headers: { Cookie: stranger.cookie }
        })
      )
    ).json();
    expect(view1.post.viewsCount).toBe(1);

    // Immediate second view by same stranger -> deduplicated, still 1
    const view2 = await (
      await testApp.handle(
        new Request(`http://localhost/api/posts/${created.id}`, {
          headers: { Cookie: stranger.cookie }
        })
      )
    ).json();
    expect(view2.post.viewsCount).toBe(1);

    // Stranger cannot edit or delete owner's post (403)
    const editByStranger = await testApp.handle(
      new Request(`http://localhost/api/posts/${created.id}`, {
        method: 'PUT',
        headers: {
          Cookie: stranger.cookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: 'Bajak Judul' })
      })
    );
    expect(editByStranger.status).toBe(403);

    const delByStranger = await testApp.handle(
      new Request(`http://localhost/api/posts/${created.id}`, {
        method: 'DELETE',
        headers: { Cookie: stranger.cookie }
      })
    );
    expect(delByStranger.status).toBe(403);

    // Owner CAN edit post
    const editByOwner = await testApp.handle(
      new Request(`http://localhost/api/posts/${created.id}`, {
        method: 'PUT',
        headers: {
          Cookie: owner.cookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Jasa Tune Up & Ganti Oli Motor Injeksi',
          priceMin: 50000,
          priceMax: 120000
        })
      })
    );
    expect(editByOwner.status).toBe(200);

    // Like toggle: 0 -> 1 -> 0
    const like1 = await (
      await testApp.handle(
        new Request(`http://localhost/api/posts/${created.id}/like`, {
          method: 'POST',
          headers: { Cookie: stranger.cookie }
        })
      )
    ).json();
    expect(like1.isLiked).toBe(true);
    expect(like1.likesCount).toBe(1);

    const like2 = await (
      await testApp.handle(
        new Request(`http://localhost/api/posts/${created.id}/like`, {
          method: 'POST',
          headers: { Cookie: stranger.cookie }
        })
      )
    ).json();
    expect(like2.isLiked).toBe(false);
    expect(like2.likesCount).toBe(0);

    // Owner CAN delete post
    const delByOwner = await testApp.handle(
      new Request(`http://localhost/api/posts/${created.id}`, {
        method: 'DELETE',
        headers: { Cookie: owner.cookie }
      })
    );
    expect(delByOwner.status).toBe(200);
  });
});

