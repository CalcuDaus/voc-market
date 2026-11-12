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
  sessions,
  users
} from '../db/schema';
import {
  getAvatarUrl,
  resolveUserFromRequest,
  sanitizePublicUser,
  type UserRow
} from '../middleware/auth';
import { NotifyService } from '../services/notify.service';
import { StatsService } from '../services/stats.service';
import { POST_TYPE_LABELS, REPORT_REASON_LABELS, USER_ROLE_LABELS } from '../../shared/constants';

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
      return { error: 'Akses ditolak. Halaman ini khusus Superadmin & Admin Moderasi Platform.' };
    }

    const postRows = await db
      .select({ post: products, author: users })
      .from(products)
      .innerJoin(users, eq(products.userId, users.id))
      .orderBy(desc(products.createdAt))
      .limit(300);

    const allUserRows = await db
      .select({ user: users, region: regions })
      .from(users)
      .leftJoin(regions, eq(users.regionId, regions.id))
      .orderBy(desc(users.createdAt));

    const requestRows = await db
      .select({ req: jobRequests, requester: users })
      .from(jobRequests)
      .innerJoin(users, eq(jobRequests.userId, users.id))
      .orderBy(desc(jobRequests.createdAt))
      .limit(200);

    const companyRows = allUserRows.filter((u) => u.user.userType === 'company');

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
      .limit(150);

    const postMap = new Map(postRows.map((p) => [p.post.id, p.post.name]));
    const userMap = new Map(allUserRows.map((u) => [u.user.id, u.user.name]));
    const requestMap = new Map(requestRows.map((r) => [r.req.id, r.req.title]));
    const challengeMap = new Map(challengeRows.map((c) => [c.challenge.id, c.challenge.title]));

    return {
      summary: {
        totalPostsCount: postRows.length,
        archivedPostsCount: postRows.filter((p) => p.post.status === 'archived').length,
        totalUsersCount: allUserRows.length,
        totalRequestsCount: requestRows.length,
        pendingCompaniesCount: companyRows.filter((c) => !c.user.companyVerifiedAt).length,
        unverifiedSchoolsCount: schoolRows.filter((s) => !s.school.isVerified).length,
        pendingChallengesCount: challengeRows.filter((c) => c.challenge.status === 'pending_review')
          .length,
        openReportsCount: reportRows.filter((r) => r.report.status === 'open').length
      },
      posts: postRows.map(({ post, author }) => ({
        id: post.id,
        name: post.name,
        code: post.code,
        type: post.type,
        typeLabel: POST_TYPE_LABELS[post.type] || post.type,
        price: post.price,
        imageUrl: post.image,
        status: post.status,
        isVerifiedByTeacher: Boolean(post.isVerifiedByTeacher),
        viewsCount: post.viewsCount,
        likesCount: post.likesCount,
        createdAt: post.createdAt.toISOString(),
        author: {
          id: author.id,
          name: author.name,
          username: author.username,
          schoolName: author.schoolName
        }
      })),
      users: allUserRows.map(({ user, region }) => ({
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        userType: user.userType,
        roleLabel: USER_ROLE_LABELS[user.userType] || user.userType,
        isAdmin: Boolean(user.isAdmin),
        isVerified: Boolean(user.isVerified),
        schoolName: user.schoolName,
        companyName: user.companyName,
        major: user.major,
        regionName: region?.name ?? null,
        avatarUrl: getAvatarUrl(user),
        createdAt: user.createdAt.toISOString()
      })),
      requests: requestRows.map(({ req, requester }) => ({
        id: req.id,
        title: req.title,
        description: req.description,
        status: req.status,
        budgetMin: req.budgetMin,
        budgetMax: req.budgetMax,
        createdAt: req.createdAt.toISOString(),
        requester: {
          id: requester.id,
          name: requester.name,
          username: requester.username
        }
      })),
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
      reports: reportRows.map(({ report, reporter }) => {
        let targetTitle = `#${report.targetId}`;
        if (report.targetType === 'post') {
          targetTitle = postMap.get(report.targetId) || `Karya #${report.targetId}`;
        } else if (report.targetType === 'user') {
          targetTitle = userMap.get(report.targetId) || `Akun #${report.targetId}`;
        } else if (report.targetType === 'request') {
          targetTitle = requestMap.get(report.targetId) || `Permintaan #${report.targetId}`;
        } else if (report.targetType === 'challenge') {
          targetTitle = challengeMap.get(report.targetId) || `Tantangan #${report.targetId}`;
        }

        return {
          id: report.id,
          targetType: report.targetType,
          targetId: report.targetId,
          targetTitle,
          reason: report.reason,
          reasonLabel: REPORT_REASON_LABELS[report.reason] || report.reason,
          details: report.details,
          status: report.status,
          createdAt: report.createdAt.toISOString(),
          reporter: reporter
            ? { id: reporter.id, name: reporter.name, username: reporter.username }
            : null
        };
      })
    };
  })

  // Takedown or Restore Post
  .post('/posts/:id/takedown', async ({ request, params, body, set }) => {
    const admin = await resolveUserFromRequest(request);
    if (!admin || !requirePlatformAdmin(admin)) {
      set.status = 403;
      return { error: 'Khusus Superadmin / Admin Platform.' };
    }

    const postId = Number(params.id);
    const [post] = await db.select().from(products).where(eq(products.id, postId)).limit(1);
    if (!post) {
      set.status = 404;
      return { error: 'Postingan karya tidak ditemukan.' };
    }

    const data = (body ?? {}) as Record<string, unknown>;
    const nextStatus =
      data.status === 'published' || data.status === 'archived'
        ? data.status
        : post.status === 'published'
          ? 'archived'
          : 'published';
    const reason = String(
      data.reason ?? 'Melanggar Ketentuan & Kebijakan Konten Skill-Hub (SARA / Asusila / Di Luar Karya Vokasi).'
    ).trim();

    await db.update(products).set({ status: nextStatus }).where(eq(products.id, post.id));

    if (nextStatus === 'archived') {
      await NotifyService.send({
        userId: post.userId,
        type: 'post_takedown',
        title: 'Postingan Karya Di-takedown oleh Superadmin',
        body: `Karya "${post.name}" telah diturunkan dari publikasi. Alasan: ${reason}`,
        actionUrl: `/karya/${post.id}`
      });
    } else {
      await NotifyService.send({
        userId: post.userId,
        type: 'post_restored',
        title: 'Postingan Karya Dipulihkan oleh Superadmin',
        body: `Karya "${post.name}" kini telah kembali tayang di katalog publik.`,
        actionUrl: `/karya/${post.id}`
      });
    }

    return {
      success: true,
      postId: post.id,
      status: nextStatus
    };
  })

  // Permanently Delete Post
  .delete('/posts/:id', async ({ request, params, set }) => {
    const admin = await resolveUserFromRequest(request);
    if (!admin || !requirePlatformAdmin(admin)) {
      set.status = 403;
      return { error: 'Khusus Superadmin / Admin Platform.' };
    }

    const postId = Number(params.id);
    const [post] = await db.select().from(products).where(eq(products.id, postId)).limit(1);
    if (!post) {
      set.status = 404;
      return { error: 'Postingan karya tidak ditemukan.' };
    }

    await db.delete(products).where(eq(products.id, post.id));

    return {
      success: true,
      deletedId: post.id
    };
  })

  // Update User Account (Role, Verification, Admin Status, Password Reset, Takedown All Posts)
  .patch('/users/:id', async ({ request, params, body, set }) => {
    const admin = await resolveUserFromRequest(request);
    if (!admin || !requirePlatformAdmin(admin)) {
      set.status = 403;
      return { error: 'Khusus Superadmin / Admin Platform.' };
    }

    const targetId = Number(params.id);
    const [targetUser] = await db.select().from(users).where(eq(users.id, targetId)).limit(1);
    if (!targetUser) {
      set.status = 404;
      return { error: 'Akun pengguna tidak ditemukan.' };
    }

    const data = (body ?? {}) as Record<string, unknown>;
    const updates: Record<string, any> = {};

    if (
      typeof data.userType === 'string' &&
      ['smk', 'public', 'teacher', 'company', 'admin'].includes(data.userType)
    ) {
      if (targetUser.id === admin.id && data.userType !== 'admin') {
        set.status = 422;
        return { error: 'Anda tidak dapat mencopot peran Admin dari akun Anda sendiri.' };
      }
      updates.userType = data.userType;
      if (data.userType === 'admin') {
        updates.isAdmin = true;
      }
    }

    if (typeof data.isAdmin === 'boolean') {
      if (targetUser.id === admin.id && !data.isAdmin) {
        set.status = 422;
        return { error: 'Anda tidak dapat mencopot hak Superadmin dari akun Anda sendiri.' };
      }
      updates.isAdmin = data.isAdmin;
    }

    if (typeof data.isVerified === 'boolean') {
      updates.isVerified = data.isVerified;
      updates.verifiedAt = data.isVerified ? new Date() : null;
      updates.verifiedBy = data.isVerified ? admin.id : null;
    }

    if (typeof data.newPassword === 'string' && data.newPassword.trim().length >= 6) {
      updates.password = await Bun.password.hash(data.newPassword.trim(), {
        algorithm: 'bcrypt',
        cost: 10
      });
    }

    if (Object.keys(updates).length > 0) {
      await db.update(users).set(updates).where(eq(users.id, targetUser.id));
    }

    if (data.takedownAllPosts) {
      await db
        .update(products)
        .set({ status: 'archived' })
        .where(eq(products.userId, targetUser.id));
    }

    if (data.revokeSessions) {
      await db.delete(sessions).where(eq(sessions.userId, targetUser.id));
    }

    return {
      success: true,
      userId: targetUser.id,
      updates
    };
  })

  // Permanently Delete User Account
  .delete('/users/:id', async ({ request, params, set }) => {
    const admin = await resolveUserFromRequest(request);
    if (!admin || !requirePlatformAdmin(admin)) {
      set.status = 403;
      return { error: 'Khusus Superadmin / Admin Platform.' };
    }

    const targetId = Number(params.id);
    if (targetId === admin.id) {
      set.status = 422;
      return { error: 'Anda tidak dapat menghapus akun Superadmin yang sedang Anda gunakan.' };
    }

    const [targetUser] = await db.select().from(users).where(eq(users.id, targetId)).limit(1);
    if (!targetUser) {
      set.status = 404;
      return { error: 'Akun pengguna tidak ditemukan.' };
    }

    await db.delete(sessions).where(eq(sessions.userId, targetUser.id));
    await db.delete(users).where(eq(users.id, targetUser.id));

    return {
      success: true,
      deletedUserId: targetUser.id
    };
  })

  // Moderate / Takedown Job Request ("Papan Butuh Bantuan")
  .post('/requests/:id/moderate', async ({ request, params, body, set }) => {
    const admin = await resolveUserFromRequest(request);
    if (!admin || !requirePlatformAdmin(admin)) {
      set.status = 403;
      return { error: 'Khusus Superadmin / Admin Platform.' };
    }

    const reqId = Number(params.id);
    const [jobReq] = await db.select().from(jobRequests).where(eq(jobRequests.id, reqId)).limit(1);
    if (!jobReq) {
      set.status = 404;
      return { error: 'Permintaan tidak ditemukan.' };
    }

    const data = (body ?? {}) as Record<string, unknown>;
    if (data.action === 'delete') {
      await db.delete(jobRequests).where(eq(jobRequests.id, jobReq.id));
      return { success: true, deletedId: jobReq.id };
    }

    const nextStatus =
      data.status === 'open' || data.status === 'hidden'
        ? data.status
        : jobReq.status === 'hidden'
          ? 'open'
          : 'hidden';

    await db.update(jobRequests).set({ status: nextStatus }).where(eq(jobRequests.id, jobReq.id));

    return {
      success: true,
      requestId: jobReq.id,
      status: nextStatus
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
        body: `"${challenge.title}" kini telah terbuka bagi seluruh Siswa SMK di Skill-Hub.`,
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
    const deleteTarget = Boolean(data.deleteTarget);

    if (!['reviewed', 'actioned', 'dismissed'].includes(statusRaw)) {
      set.status = 422;
      return { error: 'Status tindak lanjut laporan tidak valid.' };
    }

    if (deleteTarget) {
      if (report.targetType === 'post') {
        await db.delete(products).where(eq(products.id, report.targetId));
      } else if (report.targetType === 'request') {
        await db.delete(jobRequests).where(eq(jobRequests.id, report.targetId));
      }
    } else if (hideTarget || statusRaw === 'actioned') {
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
      } else if (report.targetType === 'user') {
        await db
          .update(products)
          .set({ status: 'archived' })
          .where(eq(products.userId, report.targetId));
        await db.delete(sessions).where(eq(sessions.userId, report.targetId));
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
