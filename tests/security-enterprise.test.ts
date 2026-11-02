import { beforeEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../src/server/db';
import { sessions, users } from '../src/server/db/schema';
import { runCleanupExpiredSessions } from '../src/server/services/cron.service';
import { sanitizeXss, sanitizePayload } from '../src/server/middleware/security';
import {
  extractSessionCookie,
  resetTestState,
  testApp
} from './setup';

describe('Enterprise Security & Session Hardening (Meta Standard)', () => {
  beforeEach(async () => {
    await resetTestState();
  });

  describe('Pillar 1: XSS Defense & Security Headers', () => {
    test('sanitizes malicious script tags and inline event handlers', () => {
      const malicious = '<script>alert("pwned")</script>Hello <img src="x" onerror="evil()" /> World';
      const cleaned = sanitizeXss(malicious);
      expect(cleaned).not.toContain('<script>');
      expect(cleaned).not.toContain('onerror=');
      expect(cleaned).toContain('Hello');
      expect(cleaned).toContain('World');

      const nested = sanitizePayload({
        title: 'Safe Title <script>bad()</script>',
        bio: 'Hello <iframe src="javascript:alert(1)"></iframe>',
        password: 'my<secret>password123' // password should remain intact
      });

      expect((nested as any).title).toBe('Safe Title');
      expect((nested as any).bio).not.toContain('<iframe');
      expect((nested as any).password).toBe('my<secret>password123');
    });

    test('enforces strict Content-Security-Policy and modern security headers', async () => {
      const res = await testApp.handle(new Request('http://localhost/api/health'));
      expect(res.status).toBe(200);

      const csp = res.headers.get('content-security-policy') || '';
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("frame-ancestors 'self'");

      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
      expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
      expect(res.headers.get('x-xss-protection')).toBe('1; mode=block');
      expect(res.headers.get('cross-origin-opener-policy')).toBe('same-origin');
      expect(res.headers.get('cross-origin-resource-policy')).toBe('same-origin');
    });

    test('cleans XSS payloads submitted through registration and login', async () => {
      const res = await testApp.handle(
        new Request('http://localhost/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'xss_tester@voc.id',
            firstName: 'Budi<script>steal()</script>',
            lastName: 'Santoso<img src=x onerror=alert(1)>',
            username: 'budi_sec',
            password: 'password123',
            confirmPassword: 'password123',
            phoneNumber: '081234567891',
            userType: 'public'
          })
        })
      );

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.user.name).not.toContain('<script>');
      expect(json.user.name).not.toContain('onerror=');
      expect(json.user.name).toContain('Budi Santoso');
    });
  });

  describe('Pillar 2: Rate Limiter & Rate Limit Headers', () => {
    test('attaches RateLimit headers on login attempts', async () => {
      const res = await testApp.handle(
        new Request('http://localhost/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': '192.168.1.50'
          },
          body: JSON.stringify({
            identifier: 'nonexistent@test.com',
            password: 'wrong'
          })
        })
      );

      expect(res.status).toBe(401);
      expect(res.headers.get('x-ratelimit-limit')).toBe('5');
      expect(res.headers.get('x-ratelimit-remaining')).toBeDefined();
      expect(res.headers.get('x-ratelimit-reset')).toBeDefined();
    });
  });

  describe('Pillar 3 & 4: Remember Me, Session Lifecycle & Auto-Logout', () => {
    test('remember=true grants 30-day session while remember=false grants 2-hour session', async () => {
      // 1. Register test user
      await testApp.handle(
        new Request('http://localhost/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'session_user@voc.id',
            firstName: 'Session',
            lastName: 'User',
            username: 'session_user',
            password: 'password123',
            confirmPassword: 'password123',
            phoneNumber: '081234567899',
            userType: 'public'
          })
        })
      );

      // 2. Login with remember = false
      const loginShort = await testApp.handle(
        new Request('http://localhost/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: 'session_user',
            password: 'password123',
            remember: false
          })
        })
      );

      expect(loginShort.status).toBe(200);
      const cookieShort = loginShort.headers.get('set-cookie') || '';
      // 2 hours = 7200 sec
      expect(cookieShort).toContain('Max-Age=7200');

      const jsonShort = await loginShort.json();
      expect(jsonShort.session.maxAgeSec).toBe(7200);
      expect(jsonShort.session.isRemembered).toBe(false);

      const sessHeaderShort = extractSessionCookie(loginShort);

      // Verify /api/auth/session
      const checkShort = await testApp.handle(
        new Request('http://localhost/api/auth/session', {
          headers: { Cookie: sessHeaderShort }
        })
      );
      const checkShortJson = await checkShort.json();
      expect(checkShortJson.authenticated).toBe(true);
      expect(checkShortJson.isRemembered).toBe(false);
      expect(checkShortJson.remainingSeconds).toBeGreaterThan(0);
      expect(checkShortJson.remainingSeconds).toBeLessThanOrEqual(7200);

      // 3. Login with remember = true
      const loginRemember = await testApp.handle(
        new Request('http://localhost/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: 'session_user',
            password: 'password123',
            remember: true
          })
        })
      );

      expect(loginRemember.status).toBe(200);
      const cookieRemember = loginRemember.headers.get('set-cookie') || '';
      // 30 days = 2592000 sec
      expect(cookieRemember).toContain('Max-Age=2592000');

      const jsonRemember = await loginRemember.json();
      expect(jsonRemember.session.maxAgeSec).toBe(2592000);
      expect(jsonRemember.session.isRemembered).toBe(true);
    });

    test('ping endpoint extends session and rejects expired/invalid sessions', async () => {
      // 1. Register and login
      const reg = await testApp.handle(
        new Request('http://localhost/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'ping_user@voc.id',
            firstName: 'Ping',
            lastName: 'User',
            username: 'ping_user',
            password: 'password123',
            confirmPassword: 'password123',
            phoneNumber: '081234567888',
            userType: 'public'
          })
        })
      );
      const cookie = extractSessionCookie(reg);

      // 2. Ping with valid session
      const pingValid = await testApp.handle(
        new Request('http://localhost/api/auth/ping', {
          method: 'POST',
          headers: { Cookie: cookie }
        })
      );
      expect(pingValid.status).toBe(200);
      const pingJson = await pingValid.json();
      expect(pingJson.ok).toBe(true);
      expect(pingJson.expiresAt).toBeDefined();

      // 3. Ping with no/invalid session returns 401 SESSION_EXPIRED
      const pingInvalid = await testApp.handle(
        new Request('http://localhost/api/auth/ping', {
          method: 'POST',
          headers: { Cookie: 'voc_session=invalid_token_12345' }
        })
      );
      expect(pingInvalid.status).toBe(401);
      const invalidJson = await pingInvalid.json();
      expect(invalidJson.code).toBe('SESSION_EXPIRED');
    });

    test('runCleanupExpiredSessions cron purges expired records from database', async () => {
      // Insert user and expired session directly
      const [u] = await db
        .select({ id: users.id })
        .from(users)
        .limit(1);

      if (u) {
        await db.insert(sessions).values({
          id: 'test_expired_session_hash',
          userId: u.id,
          expiresAt: new Date(Date.now() - 3600_000) // expired 1 hour ago
        });

        await runCleanupExpiredSessions();

        const remaining = await db
          .select()
          .from(sessions)
          .where(eq(sessions.id, 'test_expired_session_hash'));
        expect(remaining.length).toBe(0);
      }
    });
  });
});

