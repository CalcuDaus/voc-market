import { beforeEach, describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  createFakePngFile,
  extractSessionCookie,
  resetTestState,
  testApp
} from './setup';

describe('Tier 1 — Auth, Security Headers & Rate Limiter', () => {
  beforeEach(async () => {
    await resetTestState();
  });

  test('attaches required HTTP security headers on responses', async () => {
    const res = await testApp.handle(new Request('http://localhost/api/health'));
    expect(res.status).toBe(200);
    expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(res.headers.get('permissions-policy')).toBe(
      'camera=(), microphone=(), geolocation=()'
    );
  });

  test('registers SMK student with PNG avatar converted to WebP and sets HttpOnly cookie', async () => {
    const form = new FormData();
    form.append('email', 'siswa@smk.id');
    form.append('firstName', 'Ahmad');
    form.append('lastName', 'Fauzi');
    form.append('username', 'ahmad_fauzi');
    form.append('password', 'password123');
    form.append('confirmPassword', 'password123');
    form.append('phoneNumber', '081234567890');
    form.append('userType', 'smk');
    form.append('schoolName', 'SMKN 1 Cibinong');
    form.append('major', 'RPL');
    form.append('skills', 'TypeScript, Svelte');
    form.append('avatar', await createFakePngFile('avatar.png'));

    const res = await testApp.handle(
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        body: form
      })
    );

    expect(res.status).toBe(201);
    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie).toContain('voc_session=');
    expect(setCookie).toContain('HttpOnly');

    const json = await res.json();
    expect(json.user.username).toBe('ahmad_fauzi');
    expect(json.user.userType).toBe('smk');
    expect(json.user.avatarUrl.endsWith('.webp')).toBe(true);

    // Check WebP RIFF....WEBP binary signature
    const diskPath = join(process.cwd(), 'public', json.user.avatarUrl);
    const fileBuf = await readFile(diskPath);
    expect(fileBuf.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(fileBuf.subarray(8, 12).toString('ascii')).toBe('WEBP');
  });

  test('registers Public buyer & Teacher, supports login via email or username, and logout', async () => {
    // Public buyer
    const regBuyer = await testApp.handle(
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'pembeli@warga.id',
          firstName: 'Rina',
          lastName: 'Melati',
          username: 'rina_warga',
          password: 'password123',
          confirmPassword: 'password123',
          phoneNumber: '089876543210',
          userType: 'public'
        })
      })
    );
    expect(regBuyer.status).toBe(201);

    // Teacher
    const regTeacher = await testApp.handle(
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'guru@smkn1.id',
          firstName: 'Bapak',
          lastName: 'Darmawan',
          username: 'pak_darmawan',
          password: 'password123',
          confirmPassword: 'password123',
          phoneNumber: '081122334455',
          userType: 'teacher',
          schoolName: 'SMKN 1 Cibinong',
          nip: '198001012006041001'
        })
      })
    );
    expect(regTeacher.status).toBe(201);

    // Login by username
    const loginByUsername = await testApp.handle(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'rina_warga',
          password: 'password123'
        })
      })
    );
    expect(loginByUsername.status).toBe(200);
    const cookie = extractSessionCookie(loginByUsername);

    // Verify /me
    const meRes = await testApp.handle(
      new Request('http://localhost/api/auth/me', {
        headers: { Cookie: cookie }
      })
    );
    const meJson = await meRes.json();
    expect(meJson.user.username).toBe('rina_warga');

    // Logout
    const logoutRes = await testApp.handle(
      new Request('http://localhost/api/auth/logout', {
        method: 'POST',
        headers: { Cookie: cookie }
      })
    );
    expect(logoutRes.status).toBe(200);

    const meAfterLogout = await testApp.handle(
      new Request('http://localhost/api/auth/me', {
        headers: { Cookie: cookie }
      })
    );
    const meAfterJson = await meAfterLogout.json();
    expect(meAfterJson.user).toBeNull();
  });

  test('rate limiter blocks 6th failed login attempt within 1 minute with HTTP 429', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await testApp.handle(
        new Request('http://localhost/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': '10.10.10.99'
          },
          body: JSON.stringify({
            identifier: 'attacker@voc.id',
            password: 'wrong'
          })
        })
      );
      expect(res.status).toBe(401);
    }

    const sixth = await testApp.handle(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '10.10.10.99'
        },
        body: JSON.stringify({
          identifier: 'attacker@voc.id',
          password: 'wrong'
        })
      })
    );
    expect(sixth.status).toBe(429);
  });
});

