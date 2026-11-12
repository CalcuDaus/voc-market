import { Elysia } from 'elysia';
import { randomBytes } from 'node:crypto';
import { and, desc, eq, inArray, like, ne, or, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  categories,
  orders,
  postLikes,
  productDailyStats,
  products,
  reviews,
  schools,
  subdistricts,
  users,
  type CostBreakdown
} from '../db/schema';
import {
  hashToken,
  resolveUserFromRequest,
  sanitizePublicUser,
  type UserRow
} from '../middleware/auth';
import { checkRateLimit, getClientIp } from '../middleware/rate-limit';
import { ImageValidationError, saveUploadedWebp } from '../services/image.service';
import { formatIdrPlain } from '../services/whatsapp.service';
import { POST_TYPE_LABELS } from '../../shared/constants';
import { validateContentPolicy } from '../../shared/content-policy';
import { GeoService } from '../services/geo.service';
import { OgCardService } from '../services/og-card.service';
import { PricingService } from '../services/pricing.service';
import { BadgeService } from '../services/badge.service';

const viewDedupeMap = new Map<string, number>();

export function resetViewTracker(): void {
  viewDedupeMap.clear();
}

export function escapeLikePattern(raw: string): string {
  return raw.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

export function isSameSchool(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function formatPostPrice(post: typeof products.$inferSelect): string {
  if (post.type === 'portfolio') {
    return 'Portofolio Karya';
  }
  if (post.type === 'service') {
    const min = post.priceMin ?? post.price;
    if (post.priceMax && post.priceMax > min) {
      return `${formatIdrPlain(min)} – ${formatIdrPlain(post.priceMax)}`;
    }
    return `Mulai ${formatIdrPlain(min)}`;
  }
  return post.price > 0 ? formatIdrPlain(post.price) : 'Gratis';
}

export function getActorKey(request: Request, user: UserRow | null): string {
  if (user) {
    return `user:${user.id}`;
  }
  const ip = getClientIp(request);
  const ua = request.headers.get('user-agent') || 'unknown';
  return `ip:${hashToken(`${ip}|${ua}`).slice(0, 32)}`;
}

export const postsRoutes = new Elysia({ prefix: '/api' })
  .get('/categories', async () => {
    const allCats = await db.select().from(categories).orderBy(categories.id);
    const counts = await db
      .select({
        categoryId: products.categoryId,
        count: sql<number>`COUNT(*)`
      })
      .from(products)
      .where(eq(products.status, 'published'))
      .groupBy(products.categoryId);

    const countMap = new Map(counts.map((c) => [c.categoryId, Number(c.count)]));
    return {
      items: allCats.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        icon: c.icon,
        postsCount: countMap.get(c.id) ?? 0
      }))
    };
  })

  .get('/posts', async ({ request, query }) => {
    const currentUser = await resolveUserFromRequest(request);
    const actorKey = getActorKey(request, currentUser);

    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(query.limit || 12)));
    const offset = (page - 1) * limit;

    const conditions = [eq(products.status, 'published')];

    const typeFilter = String(query.type || '').trim();
    if (['product', 'service', 'portfolio'].includes(typeFilter)) {
      conditions.push(eq(products.type, typeFilter as 'product' | 'service' | 'portfolio'));
    }

    const categoryId = Number(query.categoryId || 0);
    if (categoryId > 0) {
      conditions.push(eq(products.categoryId, categoryId));
    }

    const subdistrictIdFilter = Number(query.subdistrictId || 0);
    const regionIdFilter = Number(query.regionId || 0);
    const sort = String(query.sort || 'newest');

    let originCoords: { lat: number; lng: number } | null = null;
    if (subdistrictIdFilter > 0) {
      const [sd] = await db
        .select({ lat: subdistricts.latitude, lng: subdistricts.longitude })
        .from(subdistricts)
        .where(eq(subdistricts.id, subdistrictIdFilter))
        .limit(1);
      if (sd) {
        originCoords = { lat: Number(sd.lat), lng: Number(sd.lng) };
      }
    }

    if (regionIdFilter > 0) {
      conditions.push(
        or(
          eq(users.regionId, regionIdFilter),
          eq(schools.regionId, regionIdFilter),
          eq(subdistricts.regionId, regionIdFilter)
        )!
      );
    }

    if (query.verifiedOnly === '1' || query.verifiedOnly === 'true') {
      conditions.push(eq(products.isVerifiedByTeacher, true));
    }

    const schoolFilter = String(query.school || '').trim();
    if (schoolFilter) {
      conditions.push(like(users.schoolName, `%${escapeLikePattern(schoolFilter)}%`));
    }

    const q = String(query.q || '').trim().slice(0, 100);
    if (q.length >= 2) {
      const esc = escapeLikePattern(q);
      conditions.push(
        or(
          like(products.name, `%${esc}%`),
          like(products.description, `%${esc}%`),
          like(users.name, `%${esc}%`),
          like(users.schoolName, `%${esc}%`)
        )!
      );
    }

    const whereClause = and(...conditions);

    const [{ total }] = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(products)
      .innerJoin(users, eq(products.userId, users.id))
      .leftJoin(schools, eq(products.schoolId, schools.id))
      .leftJoin(subdistricts, eq(products.subdistrictId, subdistricts.id))
      .where(whereClause);

    const rows = await db
      .select({
        post: products,
        author: users,
        category: categories,
        subdistrict: subdistricts,
        school: schools
      })
      .from(products)
      .innerJoin(users, eq(products.userId, users.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(schools, eq(products.schoolId, schools.id))
      .leftJoin(subdistricts, eq(products.subdistrictId, subdistricts.id))
      .where(whereClause)
      .orderBy(desc(products.createdAt), desc(products.id))
      .limit(limit)
      .offset(offset);

    const postIds = rows.map((r) => r.post.id);

    const likedSet = new Set<number>();
    const ratingMap = new Map<number, { avg: number; count: number }>();

    if (postIds.length > 0) {
      const likedRows = await db
        .select({ productId: postLikes.productId })
        .from(postLikes)
        .where(and(inArray(postLikes.productId, postIds), eq(postLikes.actorKey, actorKey)));
      for (const lr of likedRows) likedSet.add(lr.productId);

      const revAgg = await db
        .select({
          productId: reviews.productId,
          avg: sql<number>`AVG(${reviews.rating})`,
          count: sql<number>`COUNT(*)`
        })
        .from(reviews)
        .where(inArray(reviews.productId, postIds))
        .groupBy(reviews.productId);

      for (const ra of revAgg) {
        if (ra.productId) {
          ratingMap.set(ra.productId, {
            avg: Number(Number(ra.avg || 0).toFixed(1)),
            count: Number(ra.count || 0)
          });
        }
      }
    }

    const suggestedRows = await db
      .select()
      .from(users)
      .where(
        currentUser
          ? and(eq(users.userType, 'smk'), ne(users.id, currentUser.id))
          : eq(users.userType, 'smk')
      )
      .orderBy(desc(users.isVerified), desc(users.id))
      .limit(5);

    const items = rows.map(({ post, author, category, subdistrict, school }) => {
      const ratingInfo = ratingMap.get(post.id) ?? { avg: 0, count: 0 };

      let distanceKm: number | null = null;
      let distanceLabel = '';

      if (post.serviceAreaType === 'digital') {
        distanceKm = 0;
        distanceLabel = 'Layanan Online (Seluruh Indonesia)';
      } else if (originCoords) {
        const itemLat = subdistrict?.latitude;
        const itemLng = subdistrict?.longitude;
        if (itemLat !== undefined && itemLng !== undefined && itemLat !== null && itemLng !== null) {
          distanceKm =
            Math.round(
              GeoService.haversineDistance(
                originCoords.lat,
                originCoords.lng,
                Number(itemLat),
                Number(itemLng)
              ) * 10
            ) / 10;
          distanceLabel = GeoService.formatDistanceLabel(distanceKm, post.serviceAreaType);
        }
      }

      return {
        id: post.id,
        type: post.type,
        typeLabel: POST_TYPE_LABELS[post.type],
        name: post.name,
        code: post.code,
        categoryId: post.categoryId,
        categoryName: category?.name ?? null,
        description: post.description,
        imageUrl: post.image,
        ogImageUrl: post.ogImage ?? null,
        price: post.price,
        priceMin: post.priceMin,
        priceMax: post.priceMax,
        formattedPrice: formatPostPrice(post),
        stock: post.stock,
        projectLink: post.projectLink,
        serviceAreaType: post.serviceAreaType,
        maxDistanceKm: post.maxDistanceKm,
        subdistrictId: post.subdistrictId ?? null,
        subdistrictName: subdistrict?.name ?? null,
        distanceKm,
        distanceLabel,
        likesCount: post.likesCount,
        viewsCount: post.viewsCount,
        sharesCount: post.sharesCount,
        isLiked: likedSet.has(post.id),
        isVerifiedByTeacher: Boolean(post.isVerifiedByTeacher),
        teacherNote: post.teacherNote,
        schoolId: post.schoolId ?? null,
        isTefa: Boolean(post.isTefa),
        tefaUnit: post.tefaUnit ?? null,
        avgRating: ratingInfo.avg,
        reviewsCount: ratingInfo.count,
        createdAt: post.createdAt.toISOString(),
        author: sanitizePublicUser(author)
      };
    });

    if (sort === 'nearest' && originCoords) {
      items.sort((a, b) => {
        const distA = a.distanceKm !== null ? a.distanceKm : Infinity;
        const distB = b.distanceKm !== null ? b.distanceKm : Infinity;
        return distA - distB;
      });
    }

    return {
      items,
      total: Number(total),
      page,
      totalPages: Math.max(1, Math.ceil(Number(total) / limit)),
      suggestedCreators: suggestedRows.map(sanitizePublicUser)
    };
  })

  .get('/posts/:id', async ({ request, params, set }) => {
    const postId = Number(params.id);
    if (!Number.isFinite(postId) || postId <= 0) {
      set.status = 404;
      return { error: 'Karya tidak ditemukan.' };
    }

    const currentUser = await resolveUserFromRequest(request);
    const actorKey = getActorKey(request, currentUser);

    const rows = await db
      .select({
        post: products,
        author: users,
        category: categories,
        subdistrict: subdistricts
      })
      .from(products)
      .innerJoin(users, eq(products.userId, users.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(subdistricts, eq(products.subdistrictId, subdistricts.id))
      .where(eq(products.id, postId))
      .limit(1);

    const isPlatformAdmin = Boolean(currentUser?.isAdmin) || currentUser?.userType === 'admin';
    if (
      !rows[0] ||
      (rows[0].post.status === 'archived' &&
        currentUser?.id !== rows[0].post.userId &&
        !isPlatformAdmin)
    ) {
      set.status = 404;
      return { error: 'Karya tidak ditemukan.' };
    }

    let { post } = rows[0];
    const { author, category, subdistrict } = rows[0];

    // Deduplicated view counter (30 minutes TTL per actor)
    const viewKey = `${post.id}:${actorKey}`;
    const now = Date.now();
    const lastViewed = viewDedupeMap.get(viewKey) ?? 0;
    if (now - lastViewed > 30 * 60_000) {
      viewDedupeMap.set(viewKey, now);
      await db
        .update(products)
        .set({ viewsCount: sql`${products.viewsCount} + 1` })
        .where(eq(products.id, post.id));
      post = { ...post, viewsCount: post.viewsCount + 1 };

      const todayStr = new Date().toISOString().slice(0, 10);
      try {
        await db
          .insert(productDailyStats)
          .values({
            productId: post.id,
            statDate: todayStr,
            views: 1,
            shares: 0,
            ordersCreated: 0
          })
          .onDuplicateKeyUpdate({
            set: { views: sql`${productDailyStats.views} + 1` }
          });
      } catch {
        // Non-blocking
      }
    }

    const [likedRow] = await db
      .select({ id: postLikes.id })
      .from(postLikes)
      .where(and(eq(postLikes.productId, post.id), eq(postLikes.actorKey, actorKey)))
      .limit(1);

    let verifierName: string | null = null;
    if (post.verifiedBy) {
      const [vUser] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, post.verifiedBy))
        .limit(1);
      verifierName = vUser?.name ?? null;
    }

    const postReviews = await db
      .select()
      .from(reviews)
      .where(eq(reviews.productId, post.id))
      .orderBy(desc(reviews.createdAt));

    const [{ completedCount }] = await db
      .select({ completedCount: sql<number>`COUNT(*)` })
      .from(orders)
      .where(and(eq(orders.sellerId, author.id), eq(orders.status, 'completed')));

    const [{ sellerAvg, sellerRevCount }] = await db
      .select({
        sellerAvg: sql<number>`AVG(${reviews.rating})`,
        sellerRevCount: sql<number>`COUNT(*)`
      })
      .from(reviews)
      .where(eq(reviews.sellerId, author.id));

    const moreWorks = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.userId, author.id),
          eq(products.status, 'published'),
          ne(products.id, post.id)
        )
      )
      .orderBy(desc(products.createdAt))
      .limit(3);

    const canSeePrivateCost =
      Boolean(currentUser) &&
      (currentUser!.id === post.userId ||
        currentUser!.isAdmin ||
        currentUser!.userType === 'admin' ||
        (currentUser!.userType === 'teacher' &&
          ((Boolean(currentUser!.schoolId) && currentUser!.schoolId === author.schoolId) ||
            isSameSchool(currentUser!.schoolName, author.schoolName))));

    const payload: Record<string, unknown> = {
      id: post.id,
      type: post.type,
      typeLabel: POST_TYPE_LABELS[post.type],
      name: post.name,
      code: post.code,
      categoryId: post.categoryId,
      categoryName: category?.name ?? null,
      description: post.description,
      imageUrl: post.image,
      ogImageUrl: post.ogImage ?? null,
      price: post.price,
      priceMin: post.priceMin,
      priceMax: post.priceMax,
      formattedPrice: formatPostPrice(post),
      stock: post.stock,
      projectLink: post.projectLink,
      serviceAreaType: post.serviceAreaType,
      maxDistanceKm: post.maxDistanceKm,
      subdistrictId: post.subdistrictId ?? null,
      subdistrictName: subdistrict?.name ?? null,
      likesCount: post.likesCount,
      viewsCount: post.viewsCount,
      sharesCount: post.sharesCount,
      isLiked: Boolean(likedRow),
      isVerifiedByTeacher: Boolean(post.isVerifiedByTeacher),
      teacherNote: post.teacherNote,
      schoolId: post.schoolId ?? null,
      isTefa: Boolean(post.isTefa),
      tefaUnit: post.tefaUnit ?? null,
      verifierName,
      status: post.status,
      createdAt: post.createdAt.toISOString(),
      author: {
        ...sanitizePublicUser(author),
        completedOrdersCount: Number(completedCount || 0),
        avgRating: Number(Number(sellerAvg || 0).toFixed(1)),
        reviewsCount: Number(sellerRevCount || 0)
      },
      reviews: postReviews.map((r) => ({
        id: r.id,
        reviewerName: r.reviewerName,
        rating: r.rating,
        comment: r.comment,
        endorsementTags: r.endorsementTags
          ? r.endorsementTags.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
        createdAt: r.createdAt.toISOString()
      })),
      moreFromAuthor: moreWorks.map((w) => ({
        id: w.id,
        type: w.type,
        typeLabel: POST_TYPE_LABELS[w.type],
        name: w.name,
        imageUrl: w.image,
        formattedPrice: formatPostPrice(w),
        isVerifiedByTeacher: Boolean(w.isVerifiedByTeacher)
      }))
    };

    if (canSeePrivateCost) {
      payload.costPrice = post.costPrice;
      payload.costBreakdown = post.costBreakdown;
      payload.estimatedHours = post.estimatedHours ? Number(post.estimatedHours) : null;
      payload.marginAnalysis = PricingService.analyzeMargin(post.costPrice, post.price);
    }

    return { post: payload };
  })

  .post('/posts', async ({ request, body, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    if (!currentUser) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }
    if (currentUser.userType !== 'smk') {
      set.status = 403;
      return { error: 'Hanya akun Siswa SMK yang dapat mengunggah karya.' };
    }

    const rl = checkRateLimit('uploads', `u:${currentUser.id}`, 10, 60_000);
    if (!rl.allowed) {
      set.status = 429;
      set.headers['Retry-After'] = String(rl.retryAfterSec);
      return { error: `Anda mengunggah karya terlalu cepat. Tunggu ${rl.retryAfterSec} detik.` };
    }

    const data = (body ?? {}) as Record<string, unknown>;
    const typeRaw = String(data.type ?? 'product').trim();
    if (!['product', 'service', 'portfolio'].includes(typeRaw)) {
      set.status = 422;
      return { error: 'Tipe karya tidak valid.' };
    }
    const type = typeRaw as 'product' | 'service' | 'portfolio';
    const name = String(data.name ?? '').trim();
    const description = String(data.description ?? '').trim();
    const categoryId = Number(data.categoryId ?? data.category_id ?? 0) || null;

    if (!name || name.length > 200) {
      set.status = 422;
      return { error: 'Judul karya wajib diisi (maksimal 200 karakter).' };
    }
    if (!description || description.length < 10) {
      set.status = 422;
      return { error: 'Deskripsi karya minimal 10 karakter agar pembeli paham.' };
    }

    const policyCheck = validateContentPolicy({ name, description });
    if (!policyCheck.valid) {
      set.status = 422;
      return { error: policyCheck.error };
    }

    let costBreakdown: CostBreakdown | null = null;
    if (data.costBreakdown) {
      try {
        const raw =
          typeof data.costBreakdown === 'string'
            ? JSON.parse(data.costBreakdown)
            : data.costBreakdown;
        if (raw && typeof raw === 'object') {
          costBreakdown = {
            material: Math.max(0, Math.round(Number(raw.material || 0))),
            packaging: Math.max(0, Math.round(Number(raw.packaging || 0))),
            overhead: Math.max(0, Math.round(Number(raw.overhead || 0))),
            labor: Math.max(0, Math.round(Number(raw.labor || 0)))
          };
        }
      } catch {
        // tolerate parsing error
      }
    }

    let price = Math.max(0, Math.round(Number(data.price ?? 0) || 0));
    let costPrice = Math.max(0, Math.round(Number(data.costPrice ?? data.cost_price ?? 0) || 0));
    if (costBreakdown && costPrice <= 0) {
      costPrice =
        costBreakdown.material +
        costBreakdown.packaging +
        costBreakdown.overhead +
        costBreakdown.labor;
    }

    const estimatedHours =
      data.estimatedHours !== undefined && data.estimatedHours !== null && String(data.estimatedHours).trim() !== ''
        ? String(Number(data.estimatedHours) || 0)
        : null;

    const serviceAreaTypeRaw = String(
      data.serviceAreaType ?? data.service_area_type ?? 'delivery'
    ).trim();
    const serviceAreaType = ['onsite', 'workshop', 'delivery', 'digital'].includes(
      serviceAreaTypeRaw
    )
      ? (serviceAreaTypeRaw as 'onsite' | 'workshop' | 'delivery' | 'digital')
      : 'delivery';

    const maxDistanceKm =
      Number(data.maxDistanceKm ?? data.max_distance_km ?? 0) || null;

    const subdistrictId =
      Number(data.subdistrictId ?? data.subdistrict_id ?? 0) ||
      currentUser.subdistrictId ||
      null;

    let priceMin: number | null = null;
    let priceMax: number | null = null;
    let stock = Math.max(0, Math.round(Number(data.stock ?? 1) || 0));
    const projectLink = String(data.projectLink ?? data.project_link ?? '').trim() || null;

    if (type === 'product') {
      if (price <= 0) {
        set.status = 422;
        return { error: 'Harga jual barang wajib diisi.' };
      }
      if (stock <= 0) stock = 1;
    } else if (type === 'service') {
      priceMin = Math.max(0, Math.round(Number(data.priceMin ?? data.price_min ?? price) || 0));
      if (priceMin <= 0) {
        set.status = 422;
        return { error: 'Tarif minimal jasa wajib diisi.' };
      }
      const rawMax = Number(data.priceMax ?? data.price_max ?? 0);
      if (rawMax > 0) {
        if (rawMax < priceMin) {
          set.status = 422;
          return { error: 'Tarif maksimal harus lebih besar atau sama dengan tarif minimal.' };
        }
        priceMax = Math.round(rawMax);
      }
      price = priceMin;
      stock = 1;
    } else {
      price = 0;
      stock = 0;
      if (projectLink && !/^https?:\/\/.+/i.test(projectLink)) {
        set.status = 422;
        return { error: 'Tautan proyek harus diawali https:// atau http://.' };
      }
    }

    let imagePath: string;
    try {
      imagePath = await saveUploadedWebp(data.image, 'posts', {
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

    const prefix = type === 'product' ? 'PRD' : type === 'service' ? 'SRV' : 'PTF';
    const code = `VOC-${prefix}-${randomBytes(4).toString('hex').toUpperCase()}`;

    const [inserted] = await db.insert(products).values({
      userId: currentUser.id,
      schoolId: currentUser.schoolId ?? null,
      subdistrictId,
      type,
      name,
      code,
      categoryId,
      description,
      image: imagePath,
      costPrice,
      costBreakdown,
      estimatedHours,
      price,
      priceMin,
      priceMax,
      serviceAreaType,
      maxDistanceKm,
      stock,
      projectLink,
      status: 'published'
    });

    const newId = inserted.insertId;

    try {
      await OgCardService.generateForPost(
        {
          id: newId,
          name,
          type,
          price,
          image: imagePath,
          isVerifiedByTeacher: false,
          isTefa: false
        },
        currentUser
      );
    } catch (err) {
      console.error('Failed to generate OG card:', err);
    }

    try {
      await BadgeService.evaluateUser(currentUser.id);
    } catch (err) {
      console.error('Failed to evaluate user badges:', err);
    }

    set.status = 201;
    return {
      id: newId,
      code,
      imageUrl: imagePath
    };
  })

  .put('/posts/:id', async ({ request, params, body, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    if (!currentUser) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }

    const postId = Number(params.id);
    const [existing] = await db.select().from(products).where(eq(products.id, postId)).limit(1);
    if (!existing) {
      set.status = 404;
      return { error: 'Karya tidak ditemukan.' };
    }
    if (existing.userId !== currentUser.id) {
      set.status = 403;
      return { error: 'Anda tidak memiliki izin mengubah karya ini.' };
    }

    const data = (body ?? {}) as Record<string, unknown>;
    const name = String(data.name ?? existing.name).trim();
    const description = String(data.description ?? existing.description).trim();
    const categoryId =
      data.categoryId !== undefined
        ? Number(data.categoryId) || null
        : existing.categoryId;

    if (!name || name.length > 200) {
      set.status = 422;
      return { error: 'Judul karya wajib diisi.' };
    }
    if (!description || description.length < 10) {
      set.status = 422;
      return { error: 'Deskripsi karya minimal 10 karakter.' };
    }

    const policyCheck = validateContentPolicy({ name, description });
    if (!policyCheck.valid) {
      set.status = 422;
      return { error: policyCheck.error };
    }

    let costBreakdown: CostBreakdown | null = existing.costBreakdown;
    if (data.costBreakdown !== undefined) {
      if (data.costBreakdown === null) {
        costBreakdown = null;
      } else {
        try {
          const raw =
            typeof data.costBreakdown === 'string'
              ? JSON.parse(data.costBreakdown)
              : data.costBreakdown;
          if (raw && typeof raw === 'object') {
            costBreakdown = {
              material: Math.max(0, Math.round(Number(raw.material || 0))),
              packaging: Math.max(0, Math.round(Number(raw.packaging || 0))),
              overhead: Math.max(0, Math.round(Number(raw.overhead || 0))),
              labor: Math.max(0, Math.round(Number(raw.labor || 0)))
            };
          }
        } catch {
          // ignore
        }
      }
    }

    let price =
      data.price !== undefined ? Math.max(0, Math.round(Number(data.price) || 0)) : existing.price;
    let costPrice =
      data.costPrice !== undefined
        ? Math.max(0, Math.round(Number(data.costPrice) || 0))
        : existing.costPrice;

    if (costBreakdown && costPrice <= 0) {
      costPrice =
        costBreakdown.material +
        costBreakdown.packaging +
        costBreakdown.overhead +
        costBreakdown.labor;
    }

    const estimatedHours =
      data.estimatedHours !== undefined
        ? data.estimatedHours !== null && String(data.estimatedHours).trim() !== ''
          ? String(Number(data.estimatedHours) || 0)
          : null
        : existing.estimatedHours;

    let serviceAreaType = existing.serviceAreaType;
    if (data.serviceAreaType !== undefined || data.service_area_type !== undefined) {
      const satRaw = String(data.serviceAreaType ?? data.service_area_type ?? '').trim();
      if (['onsite', 'workshop', 'delivery', 'digital'].includes(satRaw)) {
        serviceAreaType = satRaw as 'onsite' | 'workshop' | 'delivery' | 'digital';
      }
    }

    const maxDistanceKm =
      data.maxDistanceKm !== undefined || data.max_distance_km !== undefined
        ? Number(data.maxDistanceKm ?? data.max_distance_km ?? 0) || null
        : existing.maxDistanceKm;

    const subdistrictId =
      data.subdistrictId !== undefined || data.subdistrict_id !== undefined
        ? Number(data.subdistrictId ?? data.subdistrict_id ?? 0) || null
        : existing.subdistrictId;

    let priceMin = existing.priceMin;
    let priceMax = existing.priceMax;
    let stock =
      data.stock !== undefined ? Math.max(0, Math.round(Number(data.stock) || 0)) : existing.stock;
    const projectLink =
      data.projectLink !== undefined
        ? String(data.projectLink || '').trim() || null
        : existing.projectLink;

    if (existing.type === 'service') {
      if (data.priceMin !== undefined) {
        priceMin = Math.max(0, Math.round(Number(data.priceMin) || 0));
        price = priceMin;
      }
      if (data.priceMax !== undefined) {
        const rawMax = Number(data.priceMax || 0);
        priceMax = rawMax > 0 ? Math.round(rawMax) : null;
      }
      if (priceMax && priceMin && priceMax < priceMin) {
        set.status = 422;
        return { error: 'Tarif maksimal tidak boleh lebih kecil dari tarif minimal.' };
      }
    }

    let imagePath = existing.image;
    if (data.image instanceof Blob && data.image.size > 0) {
      try {
        imagePath = await saveUploadedWebp(data.image, 'posts', {
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

    await db
      .update(products)
      .set({
        name,
        description,
        categoryId,
        price,
        costPrice,
        costBreakdown,
        estimatedHours,
        serviceAreaType,
        maxDistanceKm,
        subdistrictId,
        priceMin,
        priceMax,
        stock,
        projectLink,
        image: imagePath
      })
      .where(eq(products.id, existing.id));

    try {
      await OgCardService.generateForPost(
        {
          id: existing.id,
          name,
          type: existing.type,
          price,
          image: imagePath,
          isVerifiedByTeacher: existing.isVerifiedByTeacher,
          isTefa: existing.isTefa
        },
        currentUser
      );
    } catch (err) {
      console.error('Failed to update OG card:', err);
    }

    try {
      await BadgeService.evaluateUser(currentUser.id);
    } catch (err) {
      console.error('Failed to evaluate user badges:', err);
    }

    return { success: true, id: existing.id, imageUrl: imagePath };
  })

  .post('/posts/:id/share', async ({ params, set }) => {
    const postId = Number(params.id);
    if (!Number.isFinite(postId) || postId <= 0) {
      set.status = 404;
      return { error: 'Karya tidak ditemukan.' };
    }

    const [post] = await db
      .select({ id: products.id, sharesCount: products.sharesCount })
      .from(products)
      .where(eq(products.id, postId))
      .limit(1);

    if (!post) {
      set.status = 404;
      return { error: 'Karya tidak ditemukan.' };
    }

    await db
      .update(products)
      .set({ sharesCount: sql`${products.sharesCount} + 1` })
      .where(eq(products.id, post.id));

    const todayStr = new Date().toISOString().slice(0, 10);
    try {
      await db
        .insert(productDailyStats)
        .values({
          productId: post.id,
          statDate: todayStr,
          views: 0,
          shares: 1,
          ordersCreated: 0
        })
        .onDuplicateKeyUpdate({
          set: { shares: sql`${productDailyStats.shares} + 1` }
        });
    } catch {
      // Non-blocking
    }

    return { success: true, sharesCount: post.sharesCount + 1 };
  })

  .delete('/posts/:id', async ({ request, params, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    if (!currentUser) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }

    const postId = Number(params.id);
    const [existing] = await db.select().from(products).where(eq(products.id, postId)).limit(1);
    if (!existing) {
      set.status = 404;
      return { error: 'Karya tidak ditemukan.' };
    }
    if (existing.userId !== currentUser.id) {
      set.status = 403;
      return { error: 'Anda tidak memiliki izin menghapus karya ini.' };
    }

    const linkedOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.productId, existing.id))
      .limit(1);

    if (linkedOrders.length > 0) {
      await db
        .update(products)
        .set({ status: 'archived' })
        .where(eq(products.id, existing.id));
      return { success: true, archived: true };
    }

    await db.delete(products).where(eq(products.id, existing.id));
    return { success: true, archived: false };
  })

  .post('/posts/:id/like', async ({ request, params, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    const actorKey = getActorKey(request, currentUser);

    const rl = checkRateLimit('likes', actorKey, 30, 60_000);
    if (!rl.allowed) {
      set.status = 429;
      return { error: 'Terlalu banyak aksi suka. Coba sesaat lagi.' };
    }

    const postId = Number(params.id);
    const [post] = await db.select().from(products).where(eq(products.id, postId)).limit(1);
    if (!post) {
      set.status = 404;
      return { error: 'Karya tidak ditemukan.' };
    }

    const result = await db.transaction(async (tx) => {
      const [existingLike] = await tx
        .select()
        .from(postLikes)
        .where(and(eq(postLikes.productId, postId), eq(postLikes.actorKey, actorKey)))
        .limit(1);

      if (existingLike) {
        await tx.delete(postLikes).where(eq(postLikes.id, existingLike.id));
        const nextCount = Math.max(0, post.likesCount - 1);
        await tx
          .update(products)
          .set({ likesCount: nextCount })
          .where(eq(products.id, postId));
        return { isLiked: false, likesCount: nextCount };
      } else {
        await tx.insert(postLikes).values({
          productId: postId,
          actorKey
        });
        const nextCount = post.likesCount + 1;
        await tx
          .update(products)
          .set({ likesCount: nextCount })
          .where(eq(products.id, postId));
        return { isLiked: true, likesCount: nextCount };
      }
    });

    return {
      success: true,
      ...result
    };
  })

  .post('/posts/:id/share', async ({ params, set }) => {
    const postId = Number(params.id);
    const [post] = await db.select().from(products).where(eq(products.id, postId)).limit(1);
    if (!post) {
      set.status = 404;
      return { error: 'Karya tidak ditemukan.' };
    }
    const nextShares = post.sharesCount + 1;
    await db
      .update(products)
      .set({ sharesCount: nextShares })
      .where(eq(products.id, postId));

    return { success: true, sharesCount: nextShares };
  })

  .get('/search', async ({ request, query, set }) => {
    const ip = getClientIp(request);
    const rl = checkRateLimit('search', ip, 60, 60_000);
    if (!rl.allowed) {
      set.status = 429;
      return { error: 'Terlalu banyak permintaan pencarian.' };
    }

    const keyword = String(query.q ?? '').trim().slice(0, 100);
    if (keyword.length < 2) {
      return { posts: [], users: [] };
    }

    const esc = escapeLikePattern(keyword);

    const foundPosts = await db
      .select({ post: products, author: users })
      .from(products)
      .innerJoin(users, eq(products.userId, users.id))
      .where(
        and(
          eq(products.status, 'published'),
          or(like(products.name, `%${esc}%`), like(products.description, `%${esc}%`))
        )
      )
      .orderBy(desc(products.createdAt))
      .limit(6);

    const foundUsers = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.userType, 'smk'),
          or(
            like(users.username, `%${esc}%`),
            like(users.name, `%${esc}%`),
            like(users.schoolName, `%${esc}%`),
            like(users.skills, `%${esc}%`)
          )
        )
      )
      .limit(5);

    return {
      posts: foundPosts.map(({ post, author }) => ({
        id: post.id,
        name: post.name,
        type: post.type,
        typeLabel: POST_TYPE_LABELS[post.type],
        formattedPrice: formatPostPrice(post),
        imageUrl: post.image,
        authorName: author.name,
        schoolName: author.schoolName
      })),
      users: foundUsers.map((u) => {
        const pub = sanitizePublicUser(u);
        return {
          id: pub.id,
          name: pub.name,
          username: pub.username,
          schoolName: pub.schoolName || 'Siswa SMK',
          major: pub.major,
          avatarUrl: pub.avatarUrl,
          isVerified: pub.isVerified
        };
      })
    };
  });

