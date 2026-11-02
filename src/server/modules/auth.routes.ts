import { Elysia } from 'elysia';
import { and, eq, or } from 'drizzle-orm';
import { db } from '../db';
import { orders, schools, users } from '../db/schema';
import { resolveOrCreateSchool } from '../db/backfill-schools';
import {
  buildClearSessionCookie,
  buildSessionCookie,
  createSession,
  destroySessionFromRequest,
  extractSessionTokenFromRequest,
  resolveSessionContextFromRequest,
  resolveUserFromRequest,
  sanitizeSelfUser,
  touchSession
} from '../middleware/auth';
import { sanitizeXss } from '../middleware/security';
import { attachRateLimitHeaders, checkRateLimit, getClientIp } from '../middleware/rate-limit';
import { ImageValidationError, saveUploadedWebp } from '../services/image.service';
import { getUnreadNotificationsCount } from '../services/notify.service';
import { StatsService } from '../services/stats.service';

export const authRoutes = new Elysia({ prefix: '/api/auth' })
  .get('/session', async ({ request }) => {
    const ctx = await resolveSessionContextFromRequest(request);
    if (!ctx.user || !ctx.session) {
      return {
        authenticated: false,
        user: null,
        expiresAt: null,
        remainingSeconds: 0,
        isRemembered: false
      };
    }
    return {
      authenticated: true,
      user: sanitizeSelfUser(ctx.user),
      expiresAt: ctx.session.expiresAt.toISOString(),
      remainingSeconds: ctx.session.remainingSeconds,
      isRemembered: ctx.session.isRemembered
    };
  })

  .post('/ping', async ({ request, set }) => {
    const token = extractSessionTokenFromRequest(request);
    if (!token) {
      set.status = 401;
      return { error: 'Sesi tidak valid atau telah berakhir.', code: 'SESSION_EXPIRED' };
    }
    const newExpiresAt = await touchSession(token);
    if (!newExpiresAt) {
      set.status = 401;
      return { error: 'Sesi telah berakhir.', code: 'SESSION_EXPIRED' };
    }
    return { ok: true, expiresAt: newExpiresAt.toISOString() };
  })

  .get('/me', async ({ request }) => {
    const ctx = await resolveSessionContextFromRequest(request);
    const user = ctx.user;
    if (!user) {
      return {
        user: null,
        pendingOrdersCount: 0,
        unreadNotificationsCount: 0,
        schoolSlug: null,
        sessionExpiresAt: null,
        isRemembered: false
      };
    }

    let pendingOrdersCount = 0;
    if (user.userType === 'smk') {
      const pending = await db
        .select({ id: orders.id })
        .from(orders)
        .where(and(eq(orders.sellerId, user.id), eq(orders.status, 'requested')));
      pendingOrdersCount = pending.length;
    }

    let schoolSlug: string | null = null;
    if (user.schoolId) {
      const [sc] = await db
        .select({ slug: schools.slug })
        .from(schools)
        .where(eq(schools.id, user.schoolId))
        .limit(1);
      schoolSlug = sc?.slug ?? null;
    }

    const unreadNotificationsCount = await getUnreadNotificationsCount(user.id);

    return {
      user: sanitizeSelfUser(user),
      pendingOrdersCount,
      unreadNotificationsCount,
      schoolSlug,
      sessionExpiresAt: ctx.session?.expiresAt.toISOString() ?? null,
      remainingSeconds: ctx.session?.remainingSeconds ?? 0,
      isRemembered: ctx.session?.isRemembered ?? false
    };
  })

  .post('/register', async ({ request, body, set }) => {
    const ip = getClientIp(request);
    const rl = checkRateLimit('register', ip, 5, 60_000);
    attachRateLimitHeaders(set.headers, rl);
    if (!rl.allowed) {
      set.status = 429;
      return {
        error: `Terlalu banyak percobaan pendaftaran. Mohon tunggu ${rl.retryAfterSec} detik.`
      };
    }

    const data = (body ?? {}) as Record<string, unknown>;
    const email = sanitizeXss(String(data.email ?? '')).trim().toLowerCase();
    const firstName = sanitizeXss(String(data.firstName ?? data.first_name ?? '')).trim();
    const lastName = sanitizeXss(String(data.lastName ?? data.last_name ?? '')).trim();
    const username = sanitizeXss(String(data.username ?? '')).trim().toLowerCase();
    const password = String(data.password ?? '');
    const confirmPassword = String(data.confirmPassword ?? data.confirm_password ?? password);
    const phoneNumber = sanitizeXss(String(data.phoneNumber ?? data.phone_number ?? '')).trim();
    const userTypeRaw = String(data.userType ?? data.user_type ?? 'smk').trim();

    // Admin CANNOT be registered through public endpoint!
    if (!['smk', 'public', 'teacher', 'company'].includes(userTypeRaw)) {
      set.status = 422;
      return { error: 'Peran pengguna tidak valid.' };
    }
    const userType = userTypeRaw as 'smk' | 'public' | 'teacher' | 'company';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      set.status = 422;
      return { error: 'Format email tidak valid.' };
    }
    if (!firstName) {
      set.status = 422;
      return { error: 'Nama depan wajib diisi.' };
    }
    if (!username || !/^[a-z0-9_-]{3,50}$/.test(username)) {
      set.status = 422;
      return { error: 'Username minimal 3 karakter (huruf kecil, angka, garis bawah/strip).' };
    }
    if (password.length < 6) {
      set.status = 422;
      return { error: 'Password minimal 6 karakter.' };
    }
    if (password !== confirmPassword) {
      set.status = 422;
      return { error: 'Konfirmasi password tidak cocok.' };
    }
    if (phoneNumber.replace(/[^\d]/g, '').length < 8) {
      set.status = 422;
      return { error: 'Nomor WhatsApp aktif wajib diisi.' };
    }

    const regionId = Number(data.regionId ?? data.region_id ?? 0) || null;
    const rawSchoolId = Number(data.schoolId ?? data.school_id ?? 0) || null;
    const rawSchoolName = String(data.schoolName ?? data.school_name ?? '').trim() || null;

    let resolvedSchoolId: number | null = null;
    let resolvedSchoolName: string | null = rawSchoolName;
    let shouldBeSchoolAdmin = false;

    if (userType === 'smk' || userType === 'teacher') {
      const resolvedSchool = await resolveOrCreateSchool({
        schoolId: rawSchoolId,
        schoolName: rawSchoolName,
        regionId
      });
      if (!resolvedSchool) {
        set.status = 422;
        return { error: 'Nama sekolah SMK wajib diisi untuk Siswa dan Guru Pembimbing.' };
      }
      resolvedSchoolId = resolvedSchool.id;
      resolvedSchoolName = resolvedSchool.name;

      if (userType === 'teacher') {
        const existingAdmins = await db
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.schoolId, resolvedSchoolId),
              eq(users.userType, 'teacher'),
              eq(users.isSchoolAdmin, true)
            )
          )
          .limit(1);
        shouldBeSchoolAdmin = existingAdmins.length === 0;
      }
    }

    const companyName = String(data.companyName ?? data.company_name ?? '').trim() || null;
    const companySector = String(data.companySector ?? data.company_sector ?? '').trim() || null;
    const companyWebsite = String(data.companyWebsite ?? data.company_website ?? '').trim() || null;
    const companyNib = String(data.companyNib ?? data.company_nib ?? '').trim() || null;

    if (userType === 'company' && !companyName) {
      set.status = 422;
      return { error: 'Nama resmi perusahaan / mitra industri wajib diisi.' };
    }

    const existing = await db
      .select({ id: users.id, email: users.email, username: users.username })
      .from(users)
      .where(or(eq(users.email, email), eq(users.username, username)))
      .limit(1);

    if (existing[0]) {
      set.status = 409;
      return {
        error:
          existing[0].email === email
            ? 'Email ini sudah terdaftar.'
            : 'Username ini sudah digunakan, silakan pilih yang lain.'
      };
    }

    let avatarPath: string | null = null;
    const avatarFile = data.avatar ?? data.foto_profil;
    if (avatarFile instanceof Blob && avatarFile.size > 0) {
      try {
        avatarPath = await saveUploadedWebp(avatarFile, 'avatars', {
          maxWidth: 400,
          maxBytes: 3 * 1024 * 1024
        });
      } catch (err) {
        if (err instanceof ImageValidationError) {
          set.status = 422;
          return { error: err.message };
        }
        throw err;
      }
    }

    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    const hashedPassword = await Bun.password.hash(password, {
      algorithm: 'bcrypt',
      cost: 10
    });

    const studentStatusRaw = String(data.studentStatus ?? data.student_status ?? '').trim();
    const studentStatus = ['active', 'final_year', 'alumni'].includes(studentStatusRaw)
      ? (studentStatusRaw as 'active' | 'final_year' | 'alumni')
      : null;
    const graduationYear = Number(data.graduationYear ?? data.graduation_year ?? 0) || null;

    const [inserted] = await db.insert(users).values({
      name: userType === 'company' && companyName ? companyName : fullName,
      username,
      firstName,
      lastName: lastName || null,
      email,
      password: hashedPassword,
      avatar: avatarPath,
      phoneNumber,
      userType,
      schoolName: resolvedSchoolName,
      schoolId: resolvedSchoolId,
      regionId,
      isSchoolAdmin: shouldBeSchoolAdmin,
      isAdmin: false, // Strictly false on registration
      nisn: String(data.nisn ?? '').trim() || null,
      nip: String(data.nip ?? '').trim() || null,
      major: String(data.major ?? '').trim() || null,
      skills: String(data.skills ?? '').trim() || null,
      businessName: String(data.businessName ?? data.business_name ?? '').trim() || null,
      businessType: String(data.businessType ?? data.business_type ?? '').trim() || null,
      companyName,
      companySector,
      companyWebsite,
      companyNib,
      companyVerifiedAt: null, // Must be verified by Admin
      studentStatus: userType === 'smk' ? studentStatus : null,
      graduationYear: userType === 'smk' ? graduationYear : null,
      lastActiveAt: new Date(),
      bio: String(data.bio ?? '').trim() || null,
      isVerified: userType === 'teacher'
    });

    if (userType === 'smk') {
      await StatsService.refreshStudentStats(inserted.insertId);
    }

    const [createdUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, inserted.insertId))
      .limit(1);

    const session = await createSession(createdUser.id, true);
    set.headers['Set-Cookie'] = buildSessionCookie(session.rawToken, session.maxAgeSec);
    set.status = 201;

    return {
      user: sanitizeSelfUser(createdUser)
    };
  })

  .post('/login', async ({ request, body, set }) => {
    const data = (body ?? {}) as Record<string, unknown>;
    const identifier = String(data.identifier ?? data.email ?? '')
      .trim()
      .toLowerCase();
    const password = String(data.password ?? '');
    const remember = Boolean(data.remember);

    const ip = getClientIp(request);
    const rl = checkRateLimit('login', `${identifier}|${ip}`, 5, 60_000);
    attachRateLimitHeaders(set.headers, rl);
    if (!rl.allowed) {
      set.status = 429;
      return {
        error: `Terlalu banyak percobaan masuk. Mohon tunggu ${rl.retryAfterSec} detik sebelum mencoba kembali.`
      };
    }

    if (!identifier || !password) {
      set.status = 422;
      return { error: 'Email/Username dan password wajib diisi.' };
    }

    const found = await db
      .select()
      .from(users)
      .where(or(eq(users.email, identifier), eq(users.username, identifier)))
      .limit(1);

    const user = found[0];
    if (!user) {
      set.status = 401;
      return { error: 'Email/Username atau password salah.' };
    }

    const valid = await Bun.password.verify(password, user.password);
    if (!valid) {
      set.status = 401;
      return { error: 'Email/Username atau password salah.' };
    }

    await db.update(users).set({ lastActiveAt: new Date() }).where(eq(users.id, user.id));

    const session = await createSession(user.id, remember);
    set.headers['Set-Cookie'] = buildSessionCookie(session.rawToken, session.maxAgeSec);

    return {
      user: sanitizeSelfUser(user),
      session: {
        expiresAt: session.expiresAt.toISOString(),
        maxAgeSec: session.maxAgeSec,
        isRemembered: remember
      }
    };
  })

  .post('/logout', async ({ request, set }) => {
    await destroySessionFromRequest(request);
    set.headers['Set-Cookie'] = buildClearSessionCookie();
    return { success: true };
  });
