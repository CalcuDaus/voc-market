import { Elysia } from 'elysia';
import { randomBytes } from 'node:crypto';
import { and, desc, eq, inArray, like, or, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  categories,
  certificates,
  challenges,
  challengeSubmissions,
  schools,
  users,
  type JudgingCriterion,
  type RewardType
} from '../db/schema';
import { slugifyText } from '../db/backfill-schools';
import { resolveUserFromRequest, sanitizePublicUser, type UserRow } from '../middleware/auth';
import { escapeLikePattern } from './posts.routes';
import { ImageValidationError, saveUploadedWebp } from '../services/image.service';
import { NotifyService } from '../services/notify.service';
import { generateQrSvg } from '../services/qr.service';
import { StatsService } from '../services/stats.service';
import {
  CERTIFICATE_TYPE_LABELS,
  CHALLENGE_STATUS_LABELS
} from '../../shared/constants';

function isVerifiedCompanyOrAdmin(user: UserRow | null): boolean {
  if (!user) return false;
  if (user.isAdmin || user.userType === 'admin') return true;
  return user.userType === 'company' && user.companyVerifiedAt !== null;
}

function parseJsonArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as T[];
    } catch {
      return [];
    }
  }
  return [];
}

function validateJudgingCriteria(raw: unknown): {
  valid: boolean;
  criteria: JudgingCriterion[];
  error?: string;
} {
  const arr = parseJsonArray<Record<string, unknown>>(raw);
  if (arr.length === 0) {
    return {
      valid: false,
      criteria: [],
      error: 'Kriteria penilaian wajib diisi minimal 1 aspek.'
    };
  }

  const criteria: JudgingCriterion[] = [];
  let totalWeight = 0;

  for (const item of arr) {
    const name = String(item?.name ?? '').trim();
    const weight = Number(item?.weight ?? 0);
    if (!name || !Number.isFinite(weight) || weight <= 0) {
      return {
        valid: false,
        criteria: [],
        error: 'Setiap kriteria penilaian harus memiliki nama dan bobot lebih dari 0.'
      };
    }
    const cleanWeight = Math.round(weight);
    criteria.push({ name, weight: cleanWeight });
    totalWeight += cleanWeight;
  }

  if (totalWeight !== 100) {
    return {
      valid: false,
      criteria: [],
      error: `Total bobot kriteria penilaian wajib tepat 100% (saat ini ${totalWeight}%).`
    };
  }

  return { valid: true, criteria };
}

function parseRewardTypes(raw: unknown): RewardType[] {
  let items: string[] = [];
  if (Array.isArray(raw)) {
    items = raw.map((r) => String(r).trim());
  } else if (typeof raw === 'string') {
    const t = raw.trim();
    if (t.startsWith('[')) {
      items = parseJsonArray<string>(t).map((r) => String(r).trim());
    } else {
      items = t.split(',').map((r) => r.trim());
    }
  }
  const allowed = new Set<RewardType>(['uang', 'sertifikat', 'magang', 'kerja', 'produk']);
  return Array.from(new Set(items.filter((i): i is RewardType => allowed.has(i as RewardType))));
}

function extractUploadedFiles(data: Record<string, unknown>): Blob[] {
  const files: Blob[] = [];
  const pushIfBlob = (val: unknown) => {
    if (val instanceof Blob && val.size > 0) {
      files.push(val);
    }
  };

  if (Array.isArray(data.images)) {
    for (const f of data.images) pushIfBlob(f);
  } else {
    pushIfBlob(data.images);
  }

  pushIfBlob(data.image);
  for (let i = 1; i <= 5; i++) {
    pushIfBlob(data[`image${i}`]);
    pushIfBlob(data[`images[${i - 1}]`]);
  }

  return files;
}

export const challengesRoutes = new Elysia({ prefix: '/api' })
  .get('/challenges', async ({ request, query, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(query.limit || 12)));
    const offset = (page - 1) * limit;

    const conditions = [];

    if (query.mine === '1' || query.mine === 'true') {
      if (!currentUser) {
        set.status = 401;
        return { error: 'Silakan masuk terlebih dahulu.' };
      }
      conditions.push(eq(challenges.companyId, currentUser.id));
    } else {
      const statusParam = String(query.status ?? '').trim();
      if (['open', 'judging', 'finished'].includes(statusParam)) {
        conditions.push(eq(challenges.status, statusParam as 'open' | 'judging' | 'finished'));
      } else {
        conditions.push(inArray(challenges.status, ['open', 'judging', 'finished']));
      }
    }

    const categoryId = Number(query.categoryId || 0);
    if (categoryId > 0) {
      conditions.push(eq(challenges.categoryId, categoryId));
    }

    const q = String(query.q ?? '').trim().slice(0, 100);
    if (q.length >= 2) {
      const esc = escapeLikePattern(q);
      conditions.push(
        or(
          like(challenges.title, `%${esc}%`),
          like(challenges.summary, `%${esc}%`),
          like(challenges.prizeDescription, `%${esc}%`)
        )!
      );
    }

    const whereClause = and(...conditions);

    const [{ total }] = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(challenges)
      .where(whereClause);

    const rows = await db
      .select({
        challenge: challenges,
        company: users,
        category: categories
      })
      .from(challenges)
      .innerJoin(users, eq(challenges.companyId, users.id))
      .leftJoin(categories, eq(challenges.categoryId, categories.id))
      .where(whereClause)
      .orderBy(
        sql`CASE WHEN ${challenges.status} = 'open' THEN 0 WHEN ${challenges.status} = 'judging' THEN 1 ELSE 2 END`,
        desc(challenges.createdAt)
      )
      .limit(limit)
      .offset(offset);

    return {
      items: rows.map(({ challenge, company, category }) => ({
        id: challenge.id,
        slug: challenge.slug,
        title: challenge.title,
        summary: challenge.summary,
        coverImageUrl: challenge.coverImage,
        categoryId: challenge.categoryId,
        categoryName: category?.name ?? null,
        targetMajors: challenge.targetMajors ?? [],
        rewardTypes: challenge.rewardTypes ?? [],
        prizeDescription: challenge.prizeDescription,
        winnerSlots: challenge.winnerSlots,
        submissionDeadline: challenge.submissionDeadline.toISOString(),
        announcementDate: challenge.announcementDate.toISOString(),
        ipPolicy: challenge.ipPolicy,
        status: challenge.status,
        statusLabel: CHALLENGE_STATUS_LABELS[challenge.status] || challenge.status,
        rejectionReason: challenge.rejectionReason,
        submissionsCount: challenge.submissionsCount,
        viewsCount: challenge.viewsCount,
        createdAt: challenge.createdAt.toISOString(),
        company: sanitizePublicUser(company)
      })),
      total: Number(total || 0),
      page,
      totalPages: Math.max(1, Math.ceil(Number(total || 0) / limit))
    };
  })

  .get('/challenges/:slug', async ({ request, params, set }) => {
    const slug = String(params.slug || '').trim().toLowerCase();
    const currentUser = await resolveUserFromRequest(request);

    const rows = await db
      .select({
        challenge: challenges,
        company: users,
        category: categories
      })
      .from(challenges)
      .innerJoin(users, eq(challenges.companyId, users.id))
      .leftJoin(categories, eq(challenges.categoryId, categories.id))
      .where(eq(challenges.slug, slug))
      .limit(1);

    if (!rows[0]) {
      set.status = 404;
      return { error: 'Tantangan industri tidak ditemukan.' };
    }

    const { challenge, company, category } = rows[0];
    const isAdmin = Boolean(currentUser && (currentUser.isAdmin || currentUser.userType === 'admin'));
    const isCompanyOwner = Boolean(currentUser && currentUser.id === challenge.companyId);

    const isPubliclyVisible = ['open', 'judging', 'finished'].includes(challenge.status);
    if (!isPubliclyVisible && !isCompanyOwner && !isAdmin) {
      set.status = 404;
      return { error: 'Tantangan industri belum dipublikasikan atau tidak ditemukan.' };
    }

    await db
      .update(challenges)
      .set({ viewsCount: sql`${challenges.viewsCount} + 1` })
      .where(eq(challenges.id, challenge.id));

    const allSubRows = await db
      .select({
        sub: challengeSubmissions,
        student: users
      })
      .from(challengeSubmissions)
      .innerJoin(users, eq(challengeSubmissions.userId, users.id))
      .where(eq(challengeSubmissions.challengeId, challenge.id))
      .orderBy(desc(challengeSubmissions.totalScore), desc(challengeSubmissions.submittedAt));

    const certBySubmission = new Map<number, string>();
    if (allSubRows.length > 0) {
      const certRows = await db
        .select({ submissionId: certificates.submissionId, code: certificates.code })
        .from(certificates)
        .where(eq(certificates.challengeId, challenge.id));
      for (const c of certRows) {
        if (c.submissionId) certBySubmission.set(c.submissionId, c.code);
      }
    }

    const formatSubmissionDto = (row: (typeof allSubRows)[number], includeScores: boolean) => ({
      id: row.sub.id,
      title: row.sub.title,
      description: row.sub.description,
      images: row.sub.images ?? [],
      externalLink: row.sub.externalLink,
      isPublicAfterFinish: Boolean(row.sub.isPublicAfterFinish),
      status: row.sub.status,
      rank: row.sub.rank,
      scores: includeScores ? row.sub.scores ?? null : null,
      totalScore: row.sub.totalScore ? Number(row.sub.totalScore) : null,
      feedback:
        includeScores || challenge.status === 'finished' ? row.sub.feedback ?? null : null,
      certificateCode: certBySubmission.get(row.sub.id) ?? null,
      submittedAt: row.sub.submittedAt.toISOString(),
      student: sanitizePublicUser(row.student)
    });

    const mySubRow = currentUser
      ? allSubRows.find((r) => r.sub.userId === currentUser.id)
      : undefined;

    // STRICT ANTI-PLAGIARISM RULE (Section 4.4 #2):
    // Before 'finished', other participants' submissions MUST NOT be exposed to public/other students!
    let visibleSubmissions: ReturnType<typeof formatSubmissionDto>[] = [];
    if (isCompanyOwner || isAdmin) {
      visibleSubmissions = allSubRows.map((r) => formatSubmissionDto(r, true));
    } else if (challenge.status === 'finished') {
      const statusPriority: Record<string, number> = {
        winner: 1,
        runner_up: 2,
        shortlisted: 3,
        honorable: 4,
        participant: 5
      };
      visibleSubmissions = allSubRows
        .filter((r) => r.sub.status !== 'disqualified' && r.sub.isPublicAfterFinish)
        .sort((a, b) => {
          const pa = statusPriority[a.sub.status] ?? 9;
          const pb = statusPriority[b.sub.status] ?? 9;
          if (pa !== pb) return pa - pb;
          return (a.sub.rank ?? 99) - (b.sub.rank ?? 99);
        })
        .map((r) => formatSubmissionDto(r, true));
    }

    return {
      challenge: {
        id: challenge.id,
        slug: challenge.slug,
        title: challenge.title,
        summary: challenge.summary,
        brief: challenge.brief,
        requirements: challenge.requirements,
        deliverables: challenge.deliverables,
        judgingCriteria: challenge.judgingCriteria,
        categoryId: challenge.categoryId,
        categoryName: category?.name ?? null,
        targetMajors: challenge.targetMajors ?? [],
        coverImageUrl: challenge.coverImage,
        rewardTypes: challenge.rewardTypes ?? [],
        prizeDescription: challenge.prizeDescription,
        winnerSlots: challenge.winnerSlots,
        submissionDeadline: challenge.submissionDeadline.toISOString(),
        announcementDate: challenge.announcementDate.toISOString(),
        ipPolicy: challenge.ipPolicy,
        status: challenge.status,
        statusLabel: CHALLENGE_STATUS_LABELS[challenge.status] || challenge.status,
        rejectionReason: challenge.rejectionReason,
        submissionsCount: challenge.submissionsCount,
        viewsCount: challenge.viewsCount + 1,
        createdAt: challenge.createdAt.toISOString(),
        isCompanyOwner,
        company: sanitizePublicUser(company),
        mySubmission: mySubRow
          ? formatSubmissionDto(mySubRow, challenge.status === 'finished' || isCompanyOwner)
          : null,
        submissions: visibleSubmissions
      }
    };
  })

  .post('/company/challenges', async ({ request, body, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    if (!currentUser) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }
    if (!isVerifiedCompanyOrAdmin(currentUser)) {
      set.status = 403;
      return {
        error:
          'Hanya akun Mitra Industri yang sudah diverifikasi Admin yang dapat membuat Tantangan Industri.'
      };
    }

    const data = (body ?? {}) as Record<string, unknown>;
    const title = String(data.title ?? '').trim();
    const summary = String(data.summary ?? '').trim();
    const brief = String(data.brief ?? '').trim();
    const requirements = String(data.requirements ?? '').trim();
    const deliverables = String(data.deliverables ?? '').trim();
    const categoryId = Number(data.categoryId ?? data.category_id ?? 0) || null;
    const prizeDescription = String(data.prizeDescription ?? data.prize_description ?? '').trim();
    const winnerSlots = Math.min(20, Math.max(1, Math.round(Number(data.winnerSlots ?? 3) || 3)));
    const ipPolicyRaw = String(data.ipPolicy ?? data.ip_policy ?? 'winner_only').trim();

    if (title.length < 5 || title.length > 160) {
      set.status = 422;
      return { error: 'Judul tantangan wajib diisi (5–160 karakter).' };
    }
    if (summary.length < 10 || summary.length > 255) {
      set.status = 422;
      return { error: 'Ringkasan singkat tantangan wajib diisi (10–255 karakter).' };
    }
    if (brief.length < 20) {
      set.status = 422;
      return { error: 'Brief latar belakang tantangan minimal 20 karakter.' };
    }
    if (requirements.length < 10) {
      set.status = 422;
      return { error: 'Persyaratan peserta wajib diisi.' };
    }
    if (deliverables.length < 10) {
      set.status = 422;
      return { error: 'Format hasil karya yang wajib dikumpulkan (deliverables) harus diisi.' };
    }
    if (prizeDescription.length < 10) {
      set.status = 422;
      return { error: 'Rincian hadiah & apresiasi wajib diisi secara transparan.' };
    }
    if (!['winner_only', 'none'].includes(ipPolicyRaw)) {
      set.status = 422;
      return { error: 'Kebijakan hak cipta tidak valid (hanya winner_only atau none).' };
    }
    const ipPolicy = ipPolicyRaw as 'winner_only' | 'none';

    const criteriaCheck = validateJudgingCriteria(data.judgingCriteria ?? data.judging_criteria);
    if (!criteriaCheck.valid) {
      set.status = 422;
      return { error: criteriaCheck.error };
    }

    const rewardTypes = parseRewardTypes(data.rewardTypes ?? data.reward_types);
    if (rewardTypes.length === 0) {
      set.status = 422;
      return { error: 'Pilih minimal 1 bentuk apresiasi/hadiah (misal: uang, sertifikat, magang).' };
    }

    let targetMajors: string[] = [];
    if (data.targetMajors !== undefined) {
      if (Array.isArray(data.targetMajors)) {
        targetMajors = data.targetMajors.map((m) => String(m).trim()).filter(Boolean);
      } else if (typeof data.targetMajors === 'string') {
        const tm = data.targetMajors.trim();
        targetMajors = tm.startsWith('[')
          ? parseJsonArray<string>(tm).map((m) => String(m).trim()).filter(Boolean)
          : tm.split(',').map((m) => m.trim()).filter(Boolean);
      }
    }

    const submissionDeadline = new Date(String(data.submissionDeadline ?? ''));
    const announcementDate = new Date(String(data.announcementDate ?? ''));

    if (Number.isNaN(submissionDeadline.getTime()) || Number.isNaN(announcementDate.getTime())) {
      set.status = 422;
      return { error: 'Tanggal batas pengumpulan dan tanggal pengumuman wajib diisi.' };
    }
    if (announcementDate.getTime() < submissionDeadline.getTime()) {
      set.status = 422;
      return { error: 'Tanggal pengumuman tidak boleh mendahului batas pengumpulan karya.' };
    }

    let coverPath: string | null = null;
    if (data.coverImage instanceof Blob && data.coverImage.size > 0) {
      try {
        coverPath = await saveUploadedWebp(data.coverImage, 'challenges', {
          maxWidth: 1400,
          maxBytes: 5 * 1024 * 1024
        });
      } catch (err) {
        if (err instanceof ImageValidationError) {
          set.status = 422;
          return { error: err.message };
        }
        throw err;
      }
    }

    const baseSlug = slugifyText(title) || 'tantangan-industri';
    const slug = `${baseSlug}-${randomBytes(3).toString('hex')}`;

    const [inserted] = await db.insert(challenges).values({
      companyId: currentUser.id,
      slug,
      title,
      summary,
      brief,
      requirements,
      deliverables,
      judgingCriteria: criteriaCheck.criteria,
      categoryId,
      targetMajors,
      coverImage: coverPath,
      rewardTypes,
      prizeDescription,
      winnerSlots,
      submissionDeadline,
      announcementDate,
      ipPolicy,
      status: 'draft',
      submissionsCount: 0,
      viewsCount: 0
    });

    set.status = 201;
    return {
      id: inserted.insertId,
      slug,
      status: 'draft'
    };
  })

  .put('/company/challenges/:slug', async ({ request, params, body, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    if (!currentUser) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }

    const slug = String(params.slug || '').trim().toLowerCase();
    const [challenge] = await db.select().from(challenges).where(eq(challenges.slug, slug)).limit(1);
    if (!challenge) {
      set.status = 404;
      return { error: 'Tantangan tidak ditemukan.' };
    }

    const isAdmin = Boolean(currentUser.isAdmin || currentUser.userType === 'admin');
    if (challenge.companyId !== currentUser.id && !isAdmin) {
      set.status = 403;
      return { error: 'Anda tidak berhak mengubah tantangan ini.' };
    }
    if (!['draft', 'rejected'].includes(challenge.status) && !isAdmin) {
      set.status = 422;
      return { error: 'Hanya tantangan berstatus Draf atau Ditolak yang dapat diedit.' };
    }

    const data = (body ?? {}) as Record<string, unknown>;

    let nextCriteria = challenge.judgingCriteria;
    if (data.judgingCriteria !== undefined) {
      const check = validateJudgingCriteria(data.judgingCriteria);
      if (!check.valid) {
        set.status = 422;
        return { error: check.error };
      }
      nextCriteria = check.criteria;
    }

    let nextRewardTypes = challenge.rewardTypes;
    if (data.rewardTypes !== undefined) {
      const parsed = parseRewardTypes(data.rewardTypes);
      if (parsed.length === 0) {
        set.status = 422;
        return { error: 'Pilih minimal 1 bentuk apresiasi/hadiah.' };
      }
      nextRewardTypes = parsed;
    }

    let nextCover = challenge.coverImage;
    if (data.coverImage instanceof Blob && data.coverImage.size > 0) {
      try {
        nextCover = await saveUploadedWebp(data.coverImage, 'challenges', {
          maxWidth: 1400,
          maxBytes: 5 * 1024 * 1024
        });
      } catch (err) {
        if (err instanceof ImageValidationError) {
          set.status = 422;
          return { error: err.message };
        }
        throw err;
      }
    }

    const nextDeadline = data.submissionDeadline
      ? new Date(String(data.submissionDeadline))
      : challenge.submissionDeadline;
    const nextAnnounce = data.announcementDate
      ? new Date(String(data.announcementDate))
      : challenge.announcementDate;

    if (
      Number.isNaN(nextDeadline.getTime()) ||
      Number.isNaN(nextAnnounce.getTime()) ||
      nextAnnounce.getTime() < nextDeadline.getTime()
    ) {
      set.status = 422;
      return { error: 'Tanggal pengumpulan atau tanggal pengumuman tidak valid.' };
    }

    await db
      .update(challenges)
      .set({
        title: data.title !== undefined ? String(data.title).trim() : challenge.title,
        summary: data.summary !== undefined ? String(data.summary).trim() : challenge.summary,
        brief: data.brief !== undefined ? String(data.brief).trim() : challenge.brief,
        requirements:
          data.requirements !== undefined
            ? String(data.requirements).trim()
            : challenge.requirements,
        deliverables:
          data.deliverables !== undefined
            ? String(data.deliverables).trim()
            : challenge.deliverables,
        judgingCriteria: nextCriteria,
        rewardTypes: nextRewardTypes,
        prizeDescription:
          data.prizeDescription !== undefined
            ? String(data.prizeDescription).trim()
            : challenge.prizeDescription,
        winnerSlots:
          data.winnerSlots !== undefined
            ? Math.max(1, Math.round(Number(data.winnerSlots) || 3))
            : challenge.winnerSlots,
        submissionDeadline: nextDeadline,
        announcementDate: nextAnnounce,
        coverImage: nextCover
      })
      .where(eq(challenges.id, challenge.id));

    return { success: true, slug: challenge.slug };
  })

  .post('/company/challenges/:slug/submit-review', async ({ request, params, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    if (!currentUser) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }

    const slug = String(params.slug || '').trim().toLowerCase();
    const [challenge] = await db.select().from(challenges).where(eq(challenges.slug, slug)).limit(1);
    if (!challenge) {
      set.status = 404;
      return { error: 'Tantangan tidak ditemukan.' };
    }
    if (challenge.companyId !== currentUser.id) {
      set.status = 403;
      return { error: 'Hanya pemilik tantangan yang dapat mengajukan tinjauan Admin.' };
    }
    if (!['draft', 'rejected'].includes(challenge.status)) {
      set.status = 422;
      return { error: 'Tantangan ini sudah diajukan atau sedang berjalan.' };
    }

    await db
      .update(challenges)
      .set({
        status: 'pending_review',
        rejectionReason: null
      })
      .where(eq(challenges.id, challenge.id));

    const admins = await db
      .select({ id: users.id })
      .from(users)
      .where(or(eq(users.isAdmin, true), eq(users.userType, 'admin')));

    const companyTitle = currentUser.companyName || currentUser.name;
    for (const adm of admins) {
      await NotifyService.send({
        userId: adm.id,
        type: 'challenge_review',
        title: 'Tantangan Industri Baru Menunggu Moderasi',
        body: `${companyTitle} mengajukan tantangan "${challenge.title}".`,
        actionUrl: '/admin'
      });
    }

    return {
      success: true,
      status: 'pending_review'
    };
  })

  .post('/challenges/:slug/submissions', async ({ request, params, body, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    if (!currentUser) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }
    if (currentUser.userType !== 'smk') {
      set.status = 403;
      return { error: 'Hanya akun Siswa SMK yang dapat mengumpulkan karya tantangan.' };
    }

    const slug = String(params.slug || '').trim().toLowerCase();
    const [challenge] = await db.select().from(challenges).where(eq(challenges.slug, slug)).limit(1);
    if (!challenge) {
      set.status = 404;
      return { error: 'Tantangan tidak ditemukan.' };
    }
    if (challenge.status !== 'open') {
      set.status = 422;
      return { error: 'Pengumpulan karya untuk tantangan ini tidak sedang dibuka.' };
    }
    if (challenge.submissionDeadline.getTime() <= Date.now()) {
      set.status = 422;
      return { error: 'Batas waktu pengumpulan karya tantangan telah berakhir.' };
    }

    const [existingSub] = await db
      .select({ id: challengeSubmissions.id })
      .from(challengeSubmissions)
      .where(
        and(
          eq(challengeSubmissions.challengeId, challenge.id),
          eq(challengeSubmissions.userId, currentUser.id)
        )
      )
      .limit(1);

    if (existingSub) {
      set.status = 409;
      return { error: 'Anda sudah mengumpulkan karya pada tantangan ini.' };
    }

    const data = (body ?? {}) as Record<string, unknown>;
    const title = String(data.title ?? '').trim();
    const description = String(data.description ?? '').trim();
    const externalLink = String(data.externalLink ?? data.external_link ?? '').trim() || null;
    const isPublicAfterFinish =
      data.isPublicAfterFinish === undefined
        ? true
        : data.isPublicAfterFinish === true ||
          data.isPublicAfterFinish === 'true' ||
          data.isPublicAfterFinish === '1';

    if (title.length < 5 || title.length > 160) {
      set.status = 422;
      return { error: 'Judul karya wajib diisi (5–160 karakter).' };
    }
    if (description.length < 15) {
      set.status = 422;
      return { error: 'Penjelasan karya minimal 15 karakter.' };
    }
    if (externalLink && !/^https?:\/\/.+/i.test(externalLink)) {
      set.status = 422;
      return { error: 'Tautan eksternal harus diawali https:// atau http://.' };
    }

    const uploadedBlobs = extractUploadedFiles(data);
    if (uploadedBlobs.length === 0 || uploadedBlobs.length > 5) {
      set.status = 422;
      return { error: 'Unggah minimal 1 dan maksimal 5 gambar karya (JPG, PNG, atau WebP).' };
    }

    const savedImagePaths: string[] = [];
    try {
      for (const blob of uploadedBlobs) {
        const p = await saveUploadedWebp(blob, 'challenges', {
          maxWidth: 1400,
          maxBytes: 5 * 1024 * 1024
        });
        savedImagePaths.push(p);
      }
    } catch (err) {
      if (err instanceof ImageValidationError) {
        set.status = 422;
        return { error: err.message };
      }
      throw err;
    }

    const [inserted] = await db.insert(challengeSubmissions).values({
      challengeId: challenge.id,
      userId: currentUser.id,
      title,
      description,
      images: savedImagePaths,
      externalLink,
      isPublicAfterFinish,
      status: 'submitted'
    });

    await db
      .update(challenges)
      .set({ submissionsCount: sql`${challenges.submissionsCount} + 1` })
      .where(eq(challenges.id, challenge.id));

    await NotifyService.send({
      userId: challenge.companyId,
      type: 'new_challenge_submission',
      title: 'Karya Peserta Baru Masuk!',
      body: `${currentUser.name} mengumpulkan karya "${title}" pada tantangan "${challenge.title}".`,
      actionUrl: `/tantangan/${challenge.slug}`
    });

    set.status = 201;
    return {
      success: true,
      id: inserted.insertId,
      images: savedImagePaths
    };
  })

  .patch('/company/challenges/submissions/:id/evaluate', async ({ request, params, body, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    if (!currentUser) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }

    const subId = Number(params.id);
    const rows = await db
      .select({
        sub: challengeSubmissions,
        challenge: challenges
      })
      .from(challengeSubmissions)
      .innerJoin(challenges, eq(challengeSubmissions.challengeId, challenges.id))
      .where(eq(challengeSubmissions.id, subId))
      .limit(1);

    if (!rows[0]) {
      set.status = 404;
      return { error: 'Karya peserta tidak ditemukan.' };
    }

    const { sub, challenge } = rows[0];
    const isAdmin = Boolean(currentUser.isAdmin || currentUser.userType === 'admin');
    if (challenge.companyId !== currentUser.id && !isAdmin) {
      set.status = 403;
      return { error: 'Hanya perusahaan penyelenggara yang dapat menilai karya ini.' };
    }
    if (challenge.status === 'finished') {
      set.status = 422;
      return { error: 'Tantangan telah selesai dan hasil sudah diumumkan.' };
    }

    const data = (body ?? {}) as Record<string, unknown>;
    const statusRaw = String(data.status ?? sub.status).trim();
    const allowedStatuses = [
      'submitted',
      'shortlisted',
      'winner',
      'runner_up',
      'honorable',
      'participant',
      'disqualified'
    ];
    if (!allowedStatuses.includes(statusRaw)) {
      set.status = 422;
      return { error: 'Status evaluasi peserta tidak valid.' };
    }

    const nextRank =
      data.rank !== undefined
        ? Number(data.rank) > 0
          ? Math.round(Number(data.rank))
          : null
        : sub.rank;

    let nextScores = sub.scores ?? null;
    let nextTotalScore = sub.totalScore;

    if (data.scores && typeof data.scores === 'object' && !Array.isArray(data.scores)) {
      const scoreObj = data.scores as Record<string, unknown>;
      const cleanScores: Record<string, number> = {};
      let weightedSum = 0;

      for (const crit of challenge.judgingCriteria) {
        const val = Math.min(100, Math.max(0, Number(scoreObj[crit.name] ?? 0) || 0));
        cleanScores[crit.name] = val;
        weightedSum += (val * crit.weight) / 100;
      }

      nextScores = cleanScores;
      nextTotalScore = weightedSum.toFixed(2);
    }

    const nextFeedback =
      data.feedback !== undefined ? String(data.feedback || '').trim() || null : sub.feedback;

    await db
      .update(challengeSubmissions)
      .set({
        status: statusRaw as typeof sub.status,
        rank: nextRank,
        scores: nextScores,
        totalScore: nextTotalScore,
        feedback: nextFeedback
      })
      .where(eq(challengeSubmissions.id, sub.id));

    return {
      success: true,
      id: sub.id,
      status: statusRaw,
      rank: nextRank,
      totalScore: nextTotalScore ? Number(nextTotalScore) : null,
      feedback: nextFeedback
    };
  })

  .post('/company/challenges/:slug/announce', async ({ request, params, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    if (!currentUser) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }

    const slug = String(params.slug || '').trim().toLowerCase();
    const rows = await db
      .select({
        challenge: challenges,
        company: users
      })
      .from(challenges)
      .innerJoin(users, eq(challenges.companyId, users.id))
      .where(eq(challenges.slug, slug))
      .limit(1);

    if (!rows[0]) {
      set.status = 404;
      return { error: 'Tantangan tidak ditemukan.' };
    }

    const { challenge, company } = rows[0];
    const isAdmin = Boolean(currentUser.isAdmin || currentUser.userType === 'admin');
    if (challenge.companyId !== currentUser.id && !isAdmin) {
      set.status = 403;
      return { error: 'Hanya perusahaan penyelenggara yang dapat mengumumkan pemenang.' };
    }
    if (!['open', 'judging'].includes(challenge.status)) {
      set.status = 422;
      return { error: 'Hanya tantangan aktif/penjurian yang dapat diumumkan pemenangnya.' };
    }

    const subs = await db
      .select()
      .from(challengeSubmissions)
      .where(eq(challengeSubmissions.challengeId, challenge.id));

    if (subs.length === 0) {
      set.status = 422;
      return { error: 'Belum ada karya peserta pada tantangan ini.' };
    }

    const winners = subs.filter((s) => s.status === 'winner');
    if (winners.length === 0) {
      set.status = 422;
      return {
        error: 'Tentukan minimal 1 peserta sebagai Pemenang Utama (winner) sebelum mengumumkan.'
      };
    }

    // STRICT ANTI-EXPLOITATION RULE (Section 4.4 #3):
    // All 'winner', 'runner_up', and 'shortlisted' MUST have non-empty feedback!
    const missingFeedback = subs.filter(
      (s) =>
        ['winner', 'runner_up', 'shortlisted'].includes(s.status) &&
        (!s.feedback || !s.feedback.trim())
    );

    if (missingFeedback.length > 0) {
      set.status = 422;
      return {
        error:
          'Wajib memberikan umpan balik (feedback) tertulis kepada seluruh Pemenang, Runner-Up, dan Finalis (shortlisted) sebelum mengumumkan hasil.',
        missingSubmissionIds: missingFeedback.map((m) => m.id)
      };
    }

    const issuerName = company.companyName || company.name;
    const issuedCertificates: {
      userId: number;
      code: string;
      type: 'winner' | 'runner_up' | 'finalist' | 'participant';
      title: string;
    }[] = [];

    await db.transaction(async (tx) => {
      for (const sub of subs) {
        if (sub.status === 'disqualified') continue;

        let finalSubStatus = sub.status;
        if (finalSubStatus === 'submitted') {
          finalSubStatus = 'participant';
          await tx
            .update(challengeSubmissions)
            .set({ status: 'participant' })
            .where(eq(challengeSubmissions.id, sub.id));
        }

        const certType: 'winner' | 'runner_up' | 'finalist' | 'participant' =
          finalSubStatus === 'winner'
            ? 'winner'
            : finalSubStatus === 'runner_up'
              ? 'runner_up'
              : finalSubStatus === 'shortlisted' || finalSubStatus === 'honorable'
                ? 'finalist'
                : 'participant';

        const prefixLabel =
          certType === 'winner'
            ? sub.rank
              ? `Juara ${sub.rank}`
              : 'Juara Utama'
            : certType === 'runner_up'
              ? 'Runner-Up'
              : certType === 'finalist'
                ? 'Finalis Terpilih'
                : 'Peserta';

        const certTitle = `${prefixLabel} — ${challenge.title}`.slice(0, 200);
        const certCode = `VOC-CERT-${randomBytes(4).toString('hex').toUpperCase()}`;

        await tx.insert(certificates).values({
          code: certCode,
          userId: sub.userId,
          challengeId: challenge.id,
          submissionId: sub.id,
          type: certType,
          title: certTitle,
          issuerName
        });

        issuedCertificates.push({
          userId: sub.userId,
          code: certCode,
          type: certType,
          title: certTitle
        });
      }

      await tx
        .update(challenges)
        .set({ status: 'finished' })
        .where(eq(challenges.id, challenge.id));
    });

    for (const cert of issuedCertificates) {
      await StatsService.refreshStudentStats(cert.userId);
      await NotifyService.send({
        userId: cert.userId,
        type: 'certificate_issued',
        title: `Sertifikat Industri Terbit: ${CERTIFICATE_TYPE_LABELS[cert.type]}!`,
        body: `Hasil "${challenge.title}" telah diumumkan oleh ${issuerName}. Lihat sertifikat QR resmi Anda.`,
        actionUrl: `/sertifikat/${cert.code}`
      });
    }

    return {
      success: true,
      status: 'finished',
      issuedCertificatesCount: issuedCertificates.length,
      certificates: issuedCertificates
    };
  })

  .get('/certificates/:code', async ({ request, params, set }) => {
    const code = String(params.code || '').trim().toUpperCase();

    const rows = await db
      .select({
        cert: certificates,
        student: users,
        school: schools,
        challenge: challenges,
        submission: challengeSubmissions
      })
      .from(certificates)
      .innerJoin(users, eq(certificates.userId, users.id))
      .leftJoin(schools, eq(users.schoolId, schools.id))
      .leftJoin(challenges, eq(certificates.challengeId, challenges.id))
      .leftJoin(challengeSubmissions, eq(certificates.submissionId, challengeSubmissions.id))
      .where(eq(certificates.code, code))
      .limit(1);

    if (!rows[0]) {
      set.status = 404;
      return { error: 'Sertifikat dengan kode tersebut tidak terdaftar di VOC-Market.' };
    }

    const { cert, student, school, challenge, submission } = rows[0];
    const parsedUrl = new URL(request.url);
    const baseUrl = process.env.APP_URL || `${parsedUrl.protocol}//${parsedUrl.host}`;
    const verifyUrl = `${baseUrl}/sertifikat/${cert.code}`;
    const qrSvg = await generateQrSvg(verifyUrl);
    const isRevoked = cert.revokedAt !== null;

    return {
      certificate: {
        id: cert.id,
        code: cert.code,
        type: cert.type,
        typeLabel: CERTIFICATE_TYPE_LABELS[cert.type],
        title: cert.title,
        issuerName: cert.issuerName,
        issuedAt: cert.issuedAt.toISOString(),
        isValid: !isRevoked,
        isRevoked,
        revokedAt: cert.revokedAt ? cert.revokedAt.toISOString() : null,
        verifyUrl,
        qrSvg,
        student: {
          ...sanitizePublicUser(student),
          schoolSlug: school?.slug ?? null
        },
        challenge: challenge
          ? {
              id: challenge.id,
              slug: challenge.slug,
              title: challenge.title
            }
          : null,
        submission: submission
          ? {
              id: submission.id,
              title: submission.title,
              rank: submission.rank,
              totalScore: submission.totalScore ? Number(submission.totalScore) : null,
              feedback: submission.feedback
            }
          : null
      }
    };
  });

