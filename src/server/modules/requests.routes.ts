import { Elysia } from 'elysia';
import { randomBytes } from 'node:crypto';
import { and, desc, eq, inArray, like, ne, or, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  categories,
  jobProposals,
  jobRequests,
  orders,
  products,
  regions,
  users
} from '../db/schema';
import { resolveUserFromRequest, sanitizePublicUser, type UserRow } from '../middleware/auth';
import { checkRateLimit } from '../middleware/rate-limit';
import { generateOrderCode } from './orders.routes';
import { escapeLikePattern, formatPostPrice } from './posts.routes';
import { ImageValidationError, saveUploadedWebp } from '../services/image.service';
import { NotifyService } from '../services/notify.service';
import { buildWaLinkToSeller, formatIdrPlain } from '../services/whatsapp.service';
import {
  BUDGET_TYPE_LABELS,
  POST_TYPE_LABELS,
  REQUEST_STATUS_LABELS,
  WORK_MODE_LABELS
} from '../../shared/constants';
import { validateContentPolicy } from '../../shared/content-policy';

function generateRequestCode(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rnd = randomBytes(2).toString('hex').toUpperCase();
  return `VOC-REQ-${yy}${mm}${dd}-${rnd}`;
}

export function formatRequestBudget(req: typeof jobRequests.$inferSelect): string {
  if (req.budgetType === 'fixed' && req.budgetMin) {
    return formatIdrPlain(req.budgetMin);
  }
  if (req.budgetType === 'range') {
    if (req.budgetMin && req.budgetMax && req.budgetMax > req.budgetMin) {
      return `${formatIdrPlain(req.budgetMin)} – ${formatIdrPlain(req.budgetMax)}`;
    }
    if (req.budgetMax) return `Maks. ${formatIdrPlain(req.budgetMax)}`;
    if (req.budgetMin) return `Mulai ${formatIdrPlain(req.budgetMin)}`;
  }
  return 'Bisa Nego';
}

function serializePublicRequestItem(
  req: typeof jobRequests.$inferSelect,
  poster: UserRow,
  category: typeof categories.$inferSelect | null,
  region: typeof regions.$inferSelect | null
) {
  return {
    id: req.id,
    code: req.code,
    title: req.title,
    description: req.description,
    imageUrl: req.image,
    categoryId: req.categoryId,
    categoryName: category?.name ?? null,
    budgetType: req.budgetType,
    budgetTypeLabel: BUDGET_TYPE_LABELS[req.budgetType],
    budgetMin: req.budgetMin,
    budgetMax: req.budgetMax,
    formattedBudget: formatRequestBudget(req),
    workMode: req.workMode,
    workModeLabel: WORK_MODE_LABELS[req.workMode],
    regionId: req.regionId,
    regionName: region?.name ?? null,
    province: region?.province ?? null,
    locationDetail: req.locationDetail,
    neededBy: req.neededBy ? req.neededBy.toISOString() : null,
    maxProposals: req.maxProposals,
    proposalsCount: req.proposalsCount,
    status: req.status,
    statusLabel: REQUEST_STATUS_LABELS[req.status] || req.status,
    viewsCount: req.viewsCount,
    expiresAt: req.expiresAt.toISOString(),
    createdAt: req.createdAt.toISOString(),
    poster: sanitizePublicUser(poster)
  };
}

export const requestsRoutes = new Elysia({ prefix: '/api' })
  .get('/requests', async ({ request, query }) => {
    const currentUser = await resolveUserFromRequest(request);
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(query.limit || 12)));
    const offset = (page - 1) * limit;

    const conditions = [];
    const statusParam = String(query.status ?? 'open').trim();

    if (statusParam === 'mine') {
      if (!currentUser) {
        return { items: [], total: 0, page, totalPages: 1 };
      }
      conditions.push(eq(jobRequests.userId, currentUser.id));
    } else if (statusParam === 'all') {
      conditions.push(ne(jobRequests.status, 'hidden'));
    } else if (['open', 'assigned', 'completed', 'closed', 'expired'].includes(statusParam)) {
      conditions.push(
        eq(
          jobRequests.status,
          statusParam as 'open' | 'assigned' | 'completed' | 'closed' | 'expired'
        )
      );
    } else {
      conditions.push(eq(jobRequests.status, 'open'));
    }

    const categoryId = Number(query.categoryId || 0);
    if (categoryId > 0) {
      conditions.push(eq(jobRequests.categoryId, categoryId));
    }

    const regionId = Number(query.regionId || 0);
    if (regionId > 0) {
      conditions.push(eq(jobRequests.regionId, regionId));
    }

    const workMode = String(query.workMode ?? '').trim();
    if (['onsite', 'remote', 'dropoff'].includes(workMode)) {
      conditions.push(eq(jobRequests.workMode, workMode as 'onsite' | 'remote' | 'dropoff'));
    }

    const q = String(query.q ?? '').trim().slice(0, 100);
    if (q.length >= 2) {
      const esc = escapeLikePattern(q);
      conditions.push(
        or(like(jobRequests.title, `%${esc}%`), like(jobRequests.description, `%${esc}%`))!
      );
    }

    const whereClause = and(...conditions);

    const [{ total }] = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(jobRequests)
      .where(whereClause);

    const recommendedMode =
      (query.recommended === '1' || query.recommended === 'true') &&
      currentUser?.userType === 'smk';

    const orderClauses = [];
    if (recommendedMode && currentUser) {
      if (currentUser.regionId) {
        orderClauses.push(
          sql`CASE WHEN ${jobRequests.regionId} = ${currentUser.regionId} OR ${jobRequests.workMode} = 'remote' THEN 0 ELSE 1 END`
        );
      }
    }
    orderClauses.push(desc(jobRequests.createdAt), desc(jobRequests.id));

    const rows = await db
      .select({
        req: jobRequests,
        poster: users,
        category: categories,
        region: regions
      })
      .from(jobRequests)
      .innerJoin(users, eq(jobRequests.userId, users.id))
      .leftJoin(categories, eq(jobRequests.categoryId, categories.id))
      .leftJoin(regions, eq(jobRequests.regionId, regions.id))
      .where(whereClause)
      .orderBy(...orderClauses)
      .limit(limit)
      .offset(offset);

    return {
      items: rows.map(({ req, poster, category, region }) =>
        serializePublicRequestItem(req, poster, category, region)
      ),
      total: Number(total || 0),
      page,
      totalPages: Math.max(1, Math.ceil(Number(total || 0) / limit))
    };
  })

  .post('/requests', async ({ request, body, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    if (!currentUser) {
      set.status = 401;
      return {
        error: 'Demi keamanan siswa SMK, Anda wajib masuk akun sebelum memposting permintaan bantuan.'
      };
    }

    const rl = checkRateLimit('create-request', `u:${currentUser.id}`, 8, 60_000);
    if (!rl.allowed) {
      set.status = 429;
      return { error: 'Anda membuat permintaan terlalu cepat. Tunggu sebentar.' };
    }

    const data = (body ?? {}) as Record<string, unknown>;
    const title = String(data.title ?? '').trim();
    const description = String(data.description ?? '').trim();
    const categoryId = Number(data.categoryId ?? data.category_id ?? 0) || null;
    const budgetTypeRaw = String(data.budgetType ?? data.budget_type ?? 'negotiable').trim();
    const workModeRaw = String(data.workMode ?? data.work_mode ?? 'remote').trim();
    const regionId = Number(data.regionId ?? data.region_id ?? currentUser.regionId ?? 0) || null;
    const locationDetail = String(data.locationDetail ?? data.location_detail ?? '').trim() || null;
    const fullAddress = String(data.fullAddress ?? data.full_address ?? '').trim() || null;

    if (title.length < 5 || title.length > 140) {
      set.status = 422;
      return { error: 'Judul kebutuhan wajib diisi (5–140 karakter).' };
    }
    if (description.length < 15) {
      set.status = 422;
      return { error: 'Jelaskan kebutuhan Anda minimal 15 karakter agar siswa paham.' };
    }

    const policyCheck = validateContentPolicy({ title, description });
    if (!policyCheck.valid) {
      set.status = 422;
      return { error: policyCheck.error };
    }
    if (!['fixed', 'range', 'negotiable'].includes(budgetTypeRaw)) {
      set.status = 422;
      return { error: 'Tipe anggaran tidak valid.' };
    }
    if (!['onsite', 'remote', 'dropoff'].includes(workModeRaw)) {
      set.status = 422;
      return { error: 'Mode pengerjaan tidak valid.' };
    }

    const budgetType = budgetTypeRaw as 'fixed' | 'range' | 'negotiable';
    const workMode = workModeRaw as 'onsite' | 'remote' | 'dropoff';

    if ((workMode === 'onsite' || workMode === 'dropoff') && !regionId && !locationDetail) {
      set.status = 422;
      return { error: 'Pilih wilayah Kota/Kabupaten atau patokan lokasi untuk pekerjaan tatap muka.' };
    }

    let budgetMin: number | null =
      data.budgetMin !== undefined && String(data.budgetMin) !== ''
        ? Math.max(0, Math.round(Number(data.budgetMin) || 0))
        : null;
    let budgetMax: number | null =
      data.budgetMax !== undefined && String(data.budgetMax) !== ''
        ? Math.max(0, Math.round(Number(data.budgetMax) || 0))
        : null;

    if (budgetType === 'fixed') {
      const fixedVal = budgetMin || budgetMax || 0;
      if (fixedVal <= 0) {
        set.status = 422;
        return { error: 'Nominal harga pasti wajib diisi.' };
      }
      budgetMin = fixedVal;
      budgetMax = fixedVal;
    } else if (budgetType === 'range') {
      if (!budgetMin && !budgetMax) {
        set.status = 422;
        return { error: 'Isi kisaran anggaran minimal atau maksimal.' };
      }
      if (budgetMin && budgetMax && budgetMax < budgetMin) {
        set.status = 422;
        return { error: 'Anggaran maksimal tidak boleh lebih kecil dari minimal.' };
      }
    }

    let neededBy: Date | null = null;
    if (data.neededBy && String(data.neededBy).trim()) {
      const parsedDate = new Date(String(data.neededBy));
      if (!Number.isNaN(parsedDate.getTime())) {
        neededBy = parsedDate;
      }
    }

    const rawMaxProp = Number(data.maxProposals ?? data.max_proposals ?? 10);
    const maxProposals = Math.min(30, Math.max(1, Math.round(rawMaxProp || 10)));

    const expiresDays = Math.min(30, Math.max(1, Number(data.expiresInDays ?? 14) || 14));
    const expiresAt = new Date(Date.now() + expiresDays * 86_400_000);

    let imagePath: string | null = null;
    if (data.image instanceof Blob && data.image.size > 0) {
      try {
        imagePath = await saveUploadedWebp(data.image, 'requests', {
          maxWidth: 1280,
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

    const code = generateRequestCode();

    const [inserted] = await db.insert(jobRequests).values({
      code,
      userId: currentUser.id,
      categoryId,
      title,
      description,
      image: imagePath,
      budgetType,
      budgetMin,
      budgetMax,
      workMode,
      regionId,
      locationDetail,
      fullAddress,
      neededBy,
      maxProposals,
      status: 'open',
      proposalsCount: 0,
      viewsCount: 0,
      expiresAt
    });

    set.status = 201;
    return {
      id: inserted.insertId,
      code
    };
  })

  .get('/requests/:code', async ({ request, params, set }) => {
    const code = String(params.code || '').trim().toUpperCase();
    const currentUser = await resolveUserFromRequest(request);

    const rows = await db
      .select({
        req: jobRequests,
        poster: users,
        category: categories,
        region: regions
      })
      .from(jobRequests)
      .innerJoin(users, eq(jobRequests.userId, users.id))
      .leftJoin(categories, eq(jobRequests.categoryId, categories.id))
      .leftJoin(regions, eq(jobRequests.regionId, regions.id))
      .where(eq(jobRequests.code, code))
      .limit(1);

    if (!rows[0]) {
      set.status = 404;
      return { error: 'Permintaan tidak ditemukan.' };
    }

    const { req, poster, category, region } = rows[0];
    const isAdmin = Boolean(currentUser && (currentUser.isAdmin || currentUser.userType === 'admin'));
    const isOwner = Boolean(currentUser && currentUser.id === req.userId);

    if (req.status === 'hidden' && !isOwner && !isAdmin) {
      set.status = 404;
      return { error: 'Permintaan tidak ditemukan.' };
    }

    await db
      .update(jobRequests)
      .set({ viewsCount: sql`${jobRequests.viewsCount} + 1` })
      .where(eq(jobRequests.id, req.id));

    const allProposals = await db
      .select({
        proposal: jobProposals,
        student: users,
        portfolio: products
      })
      .from(jobProposals)
      .innerJoin(users, eq(jobProposals.userId, users.id))
      .leftJoin(products, eq(jobProposals.portfolioProductId, products.id))
      .where(eq(jobProposals.jobRequestId, req.id))
      .orderBy(desc(jobProposals.createdAt));

    const assignedRow = req.assignedProposalId
      ? allProposals.find((p) => p.proposal.id === req.assignedProposalId)
      : allProposals.find((p) => p.proposal.status === 'accepted');

    const isAcceptedStudent = Boolean(
      currentUser && assignedRow && assignedRow.proposal.userId === currentUser.id
    );

    const canSeeFullAddress = isOwner || isAcceptedStudent || isAdmin;

    const formatProposalDto = (item: (typeof allProposals)[number]) => ({
      id: item.proposal.id,
      message: item.proposal.message,
      offeredPrice: item.proposal.offeredPrice,
      formattedOfferedPrice: formatIdrPlain(item.proposal.offeredPrice),
      estimatedDays: item.proposal.estimatedDays,
      status: item.proposal.status,
      createdAt: item.proposal.createdAt.toISOString(),
      student: sanitizePublicUser(item.student),
      portfolio: item.portfolio
        ? {
            id: item.portfolio.id,
            name: item.portfolio.name,
            type: item.portfolio.type,
            typeLabel: POST_TYPE_LABELS[item.portfolio.type],
            imageUrl: item.portfolio.image,
            formattedPrice: formatPostPrice(item.portfolio),
            isVerifiedByTeacher: Boolean(item.portfolio.isVerifiedByTeacher)
          }
        : null
    });

    const myProposalRow = currentUser
      ? allProposals.find((p) => p.proposal.userId === currentUser.id)
      : undefined;

    let linkedOrderDto: {
      orderCode: string;
      status: string;
      trackPath: string;
    } | null = null;

    if (isOwner || isAcceptedStudent || isAdmin) {
      const [ord] = await db
        .select()
        .from(orders)
        .where(eq(orders.jobRequestId, req.id))
        .orderBy(desc(orders.id))
        .limit(1);
      if (ord) {
        linkedOrderDto = {
          orderCode: ord.orderCode,
          status: ord.status,
          trackPath: `/pesanan/${ord.orderCode}?token=${ord.reviewToken}`
        };
      }
    }

    let myPublishedWorks: { id: number; name: string; typeLabel: string; imageUrl: string }[] = [];
    if (currentUser?.userType === 'smk') {
      const works = await db
        .select()
        .from(products)
        .where(and(eq(products.userId, currentUser.id), eq(products.status, 'published')))
        .orderBy(desc(products.isVerifiedByTeacher), desc(products.createdAt));
      myPublishedWorks = works.map((w) => ({
        id: w.id,
        name: w.name,
        typeLabel: POST_TYPE_LABELS[w.type],
        imageUrl: w.image
      }));
    }

    const baseDto = serializePublicRequestItem(
      { ...req, viewsCount: req.viewsCount + 1 },
      poster,
      category,
      region
    );

    return {
      request: {
        ...baseDto,
        fullAddress: canSeeFullAddress ? req.fullAddress : null,
        isOwner,
        isAcceptedStudent,
        linkedOrder: linkedOrderDto,
        myProposal: myProposalRow ? formatProposalDto(myProposalRow) : null,
        proposals:
          isOwner || isAdmin
            ? allProposals.filter((p) => p.proposal.status !== 'withdrawn').map(formatProposalDto)
            : [],
        myPublishedWorks
      }
    };
  })

  .patch('/requests/:code/close', async ({ request, params, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    if (!currentUser) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }

    const code = String(params.code || '').trim().toUpperCase();
    const [reqRow] = await db.select().from(jobRequests).where(eq(jobRequests.code, code)).limit(1);
    if (!reqRow) {
      set.status = 404;
      return { error: 'Permintaan tidak ditemukan.' };
    }

    const isAdmin = Boolean(currentUser.isAdmin || currentUser.userType === 'admin');
    if (reqRow.userId !== currentUser.id && !isAdmin) {
      set.status = 403;
      return { error: 'Anda tidak berhak menutup permintaan ini.' };
    }
    if (reqRow.status !== 'open') {
      set.status = 422;
      return { error: 'Hanya permintaan berstatus terbuka yang dapat ditutup.' };
    }

    await db.update(jobRequests).set({ status: 'closed' }).where(eq(jobRequests.id, reqRow.id));
    return { success: true, status: 'closed' };
  })

  .post('/requests/:code/proposals', async ({ request, params, body, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    if (!currentUser) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }
    if (currentUser.userType !== 'smk') {
      set.status = 403;
      return { error: 'Hanya akun Siswa SMK yang dapat mengajukan penawaran bantuan.' };
    }

    const code = String(params.code || '').trim().toUpperCase();
    const [reqRow] = await db.select().from(jobRequests).where(eq(jobRequests.code, code)).limit(1);
    if (!reqRow) {
      set.status = 404;
      return { error: 'Permintaan tidak ditemukan.' };
    }
    if (reqRow.userId === currentUser.id) {
      set.status = 422;
      return { error: 'Anda tidak dapat mengajukan penawaran pada permintaan sendiri.' };
    }
    if (reqRow.status !== 'open' || reqRow.expiresAt.getTime() <= Date.now()) {
      set.status = 422;
      return { error: 'Permintaan ini sudah tidak menerima penawaran baru.' };
    }

    const data = (body ?? {}) as Record<string, unknown>;
    const message = String(data.message ?? '').trim();
    const offeredPrice = Math.round(Number(data.offeredPrice ?? data.offered_price ?? 0));
    const estimatedDays = Math.round(Number(data.estimatedDays ?? data.estimated_days ?? 0));
    const portfolioProductId =
      Number(data.portfolioProductId ?? data.portfolio_product_id ?? 0) || null;

    if (message.length < 10) {
      set.status = 422;
      return { error: 'Tuliskan pesan penawaran & rencana pengerjaan minimal 10 karakter.' };
    }
    if (!Number.isFinite(offeredPrice) || offeredPrice <= 0) {
      set.status = 422;
      return { error: 'Nominal harga penawaran wajib diisi dengan angka yang valid.' };
    }
    if (!Number.isFinite(estimatedDays) || estimatedDays < 1 || estimatedDays > 180) {
      set.status = 422;
      return { error: 'Estimasi waktu pengerjaan wajib antara 1 hingga 180 hari.' };
    }

    if (portfolioProductId) {
      const [ownProd] = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.id, portfolioProductId), eq(products.userId, currentUser.id)))
        .limit(1);
      if (!ownProd) {
        set.status = 422;
        return { error: 'Karya contoh yang dilampirkan harus milik Anda sendiri.' };
      }
    }

    const [existingProp] = await db
      .select()
      .from(jobProposals)
      .where(and(eq(jobProposals.jobRequestId, reqRow.id), eq(jobProposals.userId, currentUser.id)))
      .limit(1);

    if (existingProp && existingProp.status !== 'withdrawn') {
      set.status = 409;
      return { error: 'Anda sudah pernah mengajukan penawaran pada permintaan ini.' };
    }

    const [{ activeCnt }] = await db
      .select({ activeCnt: sql<number>`COUNT(*)` })
      .from(jobProposals)
      .where(
        and(
          eq(jobProposals.jobRequestId, reqRow.id),
          inArray(jobProposals.status, ['pending', 'accepted'])
        )
      );

    if (Number(activeCnt || 0) >= reqRow.maxProposals) {
      set.status = 422;
      return {
        error: `Kuota maksimal ${reqRow.maxProposals} penawaran untuk permintaan ini sudah terpenuhi.`
      };
    }

    let proposalId: number;
    if (existingProp && existingProp.status === 'withdrawn') {
      await db
        .update(jobProposals)
        .set({
          message,
          offeredPrice,
          estimatedDays,
          portfolioProductId,
          status: 'pending'
        })
        .where(eq(jobProposals.id, existingProp.id));
      proposalId = existingProp.id;
    } else {
      const [ins] = await db.insert(jobProposals).values({
        jobRequestId: reqRow.id,
        userId: currentUser.id,
        message,
        offeredPrice,
        estimatedDays,
        portfolioProductId,
        status: 'pending'
      });
      proposalId = ins.insertId;
    }

    const nextCount = Number(activeCnt || 0) + 1;
    await db
      .update(jobRequests)
      .set({ proposalsCount: nextCount })
      .where(eq(jobRequests.id, reqRow.id));

    await NotifyService.send({
      userId: reqRow.userId,
      type: 'new_proposal',
      title: 'Penawaran Siswa Baru Masuk!',
      body: `${currentUser.name} mengajukan penawaran ${formatIdrPlain(offeredPrice)} untuk "${reqRow.title}".`,
      actionUrl: `/butuh-bantuan/${reqRow.code}`
    });

    set.status = 201;
    return {
      success: true,
      id: proposalId,
      proposalsCount: nextCount
    };
  })

  .post('/proposals/:id/withdraw', async ({ request, params, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    if (!currentUser) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }

    const proposalId = Number(params.id);
    const [prop] = await db
      .select()
      .from(jobProposals)
      .where(eq(jobProposals.id, proposalId))
      .limit(1);

    if (!prop) {
      set.status = 404;
      return { error: 'Penawaran tidak ditemukan.' };
    }
    if (prop.userId !== currentUser.id) {
      set.status = 403;
      return { error: 'Anda tidak berhak menarik penawaran ini.' };
    }
    if (prop.status !== 'pending') {
      set.status = 422;
      return { error: 'Hanya penawaran yang masih menunggu yang dapat ditarik kembali.' };
    }

    await db
      .update(jobProposals)
      .set({ status: 'withdrawn' })
      .where(eq(jobProposals.id, prop.id));

    await db
      .update(jobRequests)
      .set({
        proposalsCount: sql`CASE WHEN ${jobRequests.proposalsCount} > 0 THEN ${jobRequests.proposalsCount} - 1 ELSE 0 END`
      })
      .where(eq(jobRequests.id, prop.jobRequestId));

    return { success: true };
  })

  .post('/proposals/:id/accept', async ({ request, params, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    if (!currentUser) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }

    const proposalId = Number(params.id);
    const rows = await db
      .select({
        proposal: jobProposals,
        req: jobRequests,
        student: users
      })
      .from(jobProposals)
      .innerJoin(jobRequests, eq(jobProposals.jobRequestId, jobRequests.id))
      .innerJoin(users, eq(jobProposals.userId, users.id))
      .where(eq(jobProposals.id, proposalId))
      .limit(1);

    if (!rows[0]) {
      set.status = 404;
      return { error: 'Penawaran tidak ditemukan.' };
    }

    const { proposal, req, student } = rows[0];

    if (req.userId !== currentUser.id) {
      set.status = 403;
      return { error: 'Hanya pembuat permintaan yang dapat memilih penawaran siswa.' };
    }
    if (req.status !== 'open') {
      set.status = 422;
      return { error: 'Permintaan ini sudah memiliki siswa terpilih atau telah ditutup.' };
    }
    if (proposal.status !== 'pending') {
      set.status = 422;
      return { error: 'Penawaran siswa ini sudah tidak aktif.' };
    }

    const otherPendingRows = await db
      .select({ id: jobProposals.id, userId: jobProposals.userId })
      .from(jobProposals)
      .where(
        and(
          eq(jobProposals.jobRequestId, req.id),
          eq(jobProposals.status, 'pending'),
          ne(jobProposals.id, proposal.id)
        )
      );

    const orderCode = generateOrderCode();
    const reviewToken = randomBytes(24).toString('hex');
    const now = new Date();
    const buyerPhone = currentUser.phoneNumber || '081200000000';

    await db.transaction(async (tx) => {
      await tx
        .update(jobProposals)
        .set({ status: 'accepted' })
        .where(eq(jobProposals.id, proposal.id));

      await tx
        .update(jobProposals)
        .set({ status: 'rejected' })
        .where(
          and(
            eq(jobProposals.jobRequestId, req.id),
            eq(jobProposals.status, 'pending'),
            ne(jobProposals.id, proposal.id)
          )
        );

      await tx
        .update(jobRequests)
        .set({
          status: 'assigned',
          assignedProposalId: proposal.id
        })
        .where(eq(jobRequests.id, req.id));

      await tx.insert(orders).values({
        orderCode,
        source: 'job_request',
        productId: null,
        jobRequestId: req.id,
        sellerId: proposal.userId,
        buyerId: req.userId,
        buyerName: currentUser.name,
        buyerPhone,
        buyerAddress: req.fullAddress || req.locationDetail || null,
        buyerNotes: `Permintaan Bantuan (${req.code}): ${req.title}`,
        quantity: 1,
        agreedPrice: proposal.offeredPrice,
        unitCostSnapshot: 0,
        status: 'accepted',
        acceptedAt: now,
        reviewToken
      });
    });

    await NotifyService.send({
      userId: proposal.userId,
      type: 'ProposalAccepted',
      title: 'Selamat! Penawaranmu Terpilih!',
      body: `${currentUser.name} memilih penawaranmu pada "${req.title}". Pesanan ${orderCode} siap dikerjakan!`,
      actionUrl: '/pesanan-masuk'
    });

    for (const other of otherPendingRows) {
      await NotifyService.send({
        userId: other.userId,
        type: 'ProposalRejected',
        title: 'Permintaan Telah Menemukan Siswa Terpilih',
        body: `Terima kasih telah mengajukan diri pada "${req.title}". Pemosting telah memilih kandidat lain.`,
        actionUrl: '/butuh-bantuan'
      });
    }

    const whatsappUrl = buildWaLinkToSeller({
      sellerPhone: student.phoneNumber,
      sellerName: student.name,
      orderCode,
      postName: req.title,
      quantity: 1,
      agreedPrice: proposal.offeredPrice,
      buyerName: currentUser.name,
      buyerNotes: proposal.message
    });

    return {
      success: true,
      orderCode,
      reviewToken,
      trackUrl: `/pesanan/${orderCode}?token=${reviewToken}`,
      whatsappUrl
    };
  });

