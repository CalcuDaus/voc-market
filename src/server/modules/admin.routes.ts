import { Elysia } from 'elysia';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db';
import {
  certificates,
  challenges,
  jobRequests,
  products,
  regions,
  reports,
  schools,
  users
} from '../db/schema';
import { resolveUserFromRequest, sanitizePublicUser, type UserRow } from '../middleware/auth';
import { NotifyService } from '../services/notify.service';
import { StatsService } from '../services/stats.service';
import { REPORT_REASON_LABELS } from '../../shared/constants';

function requirePlatformAdmin(user: UserRow | null): user is UserRow {
  if (!user) return false;
  return Boolean(user.isAdmin) || user.userType === 'admin';
}

export const adminRoutes = new Elysia({ prefix: '/api/admin' })
  .get('/overview', async ({ request, set }) => {
    const admin = await resolveUserFromRequest(request);
    if (!admin) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }
    if (!requirePlatformAdmin(admin)) {
      set.status = 403;
      return { error: 'Akses ditolak. Halaman ini khusus Admin Moderasi Platform.' };
    }

    const companyRows = await db
      .select({ user: users, region: regions })
      .from(users)
      .leftJoin(regions, eq(users.regionId, regions.id))
      .where(eq(users.userType, 'company'))
      .orderBy(desc(users.createdAt));

    const schoolRows = await db
      .select({ school: schools, region: regions })
      .from(schools)
      .leftJoin(regions, eq(schools.regionId, regions.id))
      .orderBy(desc(schools.createdAt));

    const challengeRows = await db
      .select({ challenge: challenges, company: users })
      .from(challenges)
      .innerJoin(users, eq(challenges.companyId, users.id))
      .orderBy(desc(challenges.updatedAt));

    const reportRows = await db
      .select({ report: reports, reporter: users })
      .from(reports)
      .leftJoin(users, eq(reports.reporterId, users.id))
      .orderBy(desc(reports.createdAt))
      .limit(100);

    return {
      summary: {
        pendingCompaniesCount: companyRows.filter((c) => !c.user.companyVerifiedAt).length,
        unverifiedSchoolsCount: schoolRows.filter((s) => !s.school.isVerified).length,
        pendingChallengesCount: challengeRows.filter((c) => c.challenge.status === 'pending_review')
          .length,
        openReportsCount: reportRows.filter((r) => r.report.status === 'open').length
      },
      companies: companyRows.map(({ user, region }) => ({
        ...sanitizePublicUser(user),
        email: user.email,
        phoneNumber: user.phoneNumber,
        companyNib: user.companyNib,
        regionName: region?.name ?? null
      })),
      schools: schoolRows.map(({ school, region }) => ({
        id: school.id,
        npsn: school.npsn,
        name: school.name,
        slug: school.slug,
        regionName: region?.name ?? null,
        hasTefa: Boolean(school.hasTefa),
        isVerified: Boolean(school.isVerified),
        officialPhone: school.officialPhone,
        website: school.website
      })),
      challenges: challengeRows.map(({ challenge, company }) => ({
        id: challenge.id,
        slug: challenge.slug,
        title: challenge.title,
        summary: challenge.summary,
        prizeDescription: challenge.prizeDescription,
        rewardTypes: challenge.rewardTypes ?? [],
        ipPolicy: challenge.ipPolicy,
        status: challenge.status,
        rejectionReason: challenge.rejectionReason,
        submissionDeadline: challenge.submissionDeadline.toISOString(),
        createdAt: challenge.createdAt.toISOString(),
        company: sanitizePublicUser(company)
      })),
      reports: reportRows.map(({ report, reporter }) => ({
        id: report.id,
        targetType: report.targetType,
        targetId: report.targetId,
        reason: report.reason,
        reasonLabel: REPORT_REASON_LABELS[report.reason] || report.reason,
        details: report.details,
        status: report.status,
        createdAt: report.createdAt.toISOString(),
        reporter: reporter
          ? { id: reporter.id, name: reporter.name, username: reporter.username }
          : null
      }))
    };
  })

  .post('/companies/:id/verify', async ({ request, params, body, set }) => {
    const admin = await resolveUserFromRequest(request);
    if (!admin) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }
    if (!requirePlatformAdmin(admin)) {
      set.status = 403;
      return { error: 'Hanya Admin Platform yang dapat memverifikasi perusahaan.' };
    }

    const companyId = Number(params.id);
    const [company] = await db.select().from(users).where(eq(users.id, companyId)).limit(1);
    if (!company || company.userType !== 'company') {
      set.status = 404;
      return { error: 'Akun perusahaan tidak ditemukan.' };
    }

    const data = (body ?? {}) as Record<string, unknown>;
    const verified =
      data.verified !== undefined ? Boolean(data.verified) : company.companyVerifiedAt === null;

    const verifiedAt = verified ? new Date() : null;

    await db
      .update(users)
      .set({
        companyVerifiedAt: verifiedAt,
        isVerified: verified,
        verifiedBy: verified ? admin.id : null,
        verifiedAt
      })
      .where(eq(users.id, company.id));

    if (verified) {
      await NotifyService.send({
        userId: company.id,
        type: 'company_verified',
        title: 'Akun Mitra Industri Terverifikasi!',
        body: 'Selamat! Anda kini dapat mengakses Direktori Cari Talenta dan mempublikasikan Tantangan Industri.',
        actionUrl: '/talenta'
      });
    }

    return {
      success: true,
      companyId: company.id,
      isCompanyVerified: verified,
      companyVerifiedAt: verifiedAt ? verifiedAt.toISOString() : null
    };
  })

  .post('/schools/:id/verify', async ({ request, params, body, set }) => {
    const admin = await resolveUserFromRequest(request);
    if (!admin) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }
    if (!requirePlatformAdmin(admin)) {
      set.status = 403;
      return { error: 'Khusus Admin Platform.' };
    }

    const schoolId = Number(params.id);
    const [school] = await db.select().from(schools).where(eq(schools.id, schoolId)).limit(1);
    if (!school) {
      set.status = 404;
      return { error: 'Sekolah tidak ditemukan.' };
    }

    const data = (body ?? {}) as Record<string, unknown>;
    const isVerified =
      data.isVerified !== undefined ? Boolean(data.isVerified) : !school.isVerified;

    await db.update(schools).set({ isVerified }).where(eq(schools.id, school.id));

    return {
      success: true,
      schoolId: school.id,
      isVerified
    };
  })

  .post('/challenges/:id/moderate', async ({ request, params, body, set }) => {
    const admin = await resolveUserFromRequest(request);
    if (!admin) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }
    if (!requirePlatformAdmin(admin)) {
      set.status = 403;
      return { error: 'Khusus Admin Platform.' };
    }

    const challengeId = Number(params.id);
    const [challenge] = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, challengeId))
      .limit(1);

    if (!challenge) {
      set.status = 404;
      return { error: 'Tantangan tidak ditemukan.' };
    }

    const data = (body ?? {}) as Record<string, unknown>;
    const action = String(data.action ?? '').trim(); // 'approve' | 'reject'
    if (!['approve', 'reject'].includes(action)) {
      set.status = 422;
      return { error: 'Tindakan moderasi harus approve atau reject.' };
    }

    const rejectionReason =
      action === 'reject'
        ? String(data.rejectionReason ?? 'Mohon perjelas brief dan apresiasi bagi siswa.').trim()
        : null;

    if (action === 'approve') {
      await db
        .update(challenges)
        .set({ status: 'open', rejectionReason: null })
        .where(eq(challenges.id, challenge.id));

      await NotifyService.send({
        userId: challenge.companyId,
        type: 'challenge_approved',
        title: 'Tantangan Industri Disetujui & Tayang!',
        body: `"${challenge.title}" kini telah terbuka bagi seluruh Siswa SMK di VOC-Market.`,
        actionUrl: `/tantangan/${challenge.slug}`
      });

      return { success: true, status: 'open' };
    } else {
      await db
        .update(challenges)
        .set({ status: 'rejected', rejectionReason })
        .where(eq(challenges.id, challenge.id));

      await NotifyService.send({
        userId: challenge.companyId,
        type: 'challenge_rejected',
        title: 'Tantangan Industri Memerlukan Revisi',
        body: `Catatan Admin untuk "${challenge.title}": ${rejectionReason}`,
        actionUrl: `/tantangan/${challenge.slug}`
      });

      return { success: true, status: 'rejected', rejectionReason };
    }
  })

  .post('/certificates/:code/revoke', async ({ request, params, body, set }) => {
    const admin = await resolveUserFromRequest(request);
    if (!admin) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }
    if (!requirePlatformAdmin(admin)) {
      set.status = 403;
      return { error: 'Khusus Admin Platform.' };
    }

    const code = String(params.code || '').trim().toUpperCase();
    const [cert] = await db
      .select()
      .from(certificates)
      .where(eq(certificates.code, code))
      .limit(1);

    if (!cert) {
      set.status = 404;
      return { error: 'Sertifikat tidak ditemukan.' };
    }

    const data = (body ?? {}) as Record<string, unknown>;
    const revoke = data.revoke !== undefined ? Boolean(data.revoke) : cert.revokedAt === null;
    const revokedAt = revoke ? new Date() : null;

    await db
      .update(certificates)
      .set({ revokedAt })
      .where(eq(certificates.id, cert.id));

    await StatsService.refreshStudentStats(cert.userId);

    return {
      success: true,
      code: cert.code,
      isRevoked: revoke,
      revokedAt: revokedAt ? revokedAt.toISOString() : null
    };
  })

  .patch('/reports/:id', async ({ request, params, body, set }) => {
    const admin = await resolveUserFromRequest(request);
    if (!admin) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }
    if (!requirePlatformAdmin(admin)) {
      set.status = 403;
      return { error: 'Khusus Admin Platform.' };
    }

    const reportId = Number(params.id);
    const [report] = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1);
    if (!report) {
      set.status = 404;
      return { error: 'Laporan tidak ditemukan.' };
    }

    const data = (body ?? {}) as Record<string, unknown>;
    const statusRaw = String(data.status ?? '').trim();
    const hideTarget = Boolean(data.hideTarget);

    if (!['reviewed', 'actioned', 'dismissed'].includes(statusRaw)) {
      set.status = 422;
      return { error: 'Status tindak lanjut laporan tidak valid.' };
    }

    if (hideTarget || statusRaw === 'actioned') {
      if (report.targetType === 'request') {
        await db
          .update(jobRequests)
          .set({ status: 'hidden' })
          .where(eq(jobRequests.id, report.targetId));
      } else if (report.targetType === 'post') {
        await db
          .update(products)
          .set({ status: 'archived' })
          .where(eq(products.id, report.targetId));
      } else if (report.targetType === 'challenge') {
        await db
          .update(challenges)
          .set({ status: 'cancelled' })
          .where(eq(challenges.id, report.targetId));
      }
    }

    await db
      .update(reports)
      .set({
        status: statusRaw as 'reviewed' | 'actioned' | 'dismissed',
        handledBy: admin.id
      })
      .where(eq(reports.id, report.id));

    return {
      success: true,
      id: report.id,
      status: statusRaw
    };
  });

