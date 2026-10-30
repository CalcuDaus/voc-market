import { Elysia } from 'elysia';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { jobRequests, orders, productDailyStats, products, reviews, users } from '../db/schema';
import { resolveUserFromRequest, sanitizePublicUser } from '../middleware/auth';
import { checkRateLimit, getClientIp } from '../middleware/rate-limit';
import { isSameSchool } from './posts.routes';
import { ImageValidationError, saveUploadedWebp } from '../services/image.service';
import { NotifyService } from '../services/notify.service';
import { StatsService } from '../services/stats.service';
import { BadgeService } from '../services/badge.service';
import {
  buildWaLinkToBuyer,
  buildWaLinkToSeller,
  formatIdrPlain
} from '../services/whatsapp.service';
import {
  ENDORSEMENT_TAGS,
  ORDER_STATUS_LABELS,
  POST_TYPE_LABELS
} from '../../shared/constants';

export function safeTokenMatch(provided: string | null | undefined, expected: string): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided, 'utf-8');
  const b = Buffer.from(expected, 'utf-8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function generateOrderCode(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rnd = randomBytes(2).toString('hex').toUpperCase();
  return `VOC-ORD-${yy}${mm}${dd}-${rnd}`;
}

export const ordersRoutes = new Elysia({ prefix: '/api' })
  .post('/orders', async ({ request, body, set }) => {
    const ip = getClientIp(request);
    const rl = checkRateLimit('orders', ip, 15, 60_000);
    if (!rl.allowed) {
      set.status = 429;
      return { error: `Terlalu banyak permintaan pesanan. Tunggu ${rl.retryAfterSec} detik.` };
    }

    const currentUser = await resolveUserFromRequest(request);
    const data = (body ?? {}) as Record<string, unknown>;

    const productId = Number(data.productId ?? 0);
    const buyerName = String(data.buyerName ?? currentUser?.name ?? '').trim();
    const buyerPhone = String(data.buyerPhone ?? currentUser?.phoneNumber ?? '').trim();
    const buyerAddress = String(data.buyerAddress ?? '').trim() || null;
    const buyerNotes = String(data.buyerNotes ?? '').trim() || null;
    const quantity = Math.max(1, Math.round(Number(data.quantity ?? 1) || 1));

    if (!productId) {
      set.status = 422;
      return { error: 'Karya yang dipesan tidak valid.' };
    }
    if (buyerName.length < 2) {
      set.status = 422;
      return { error: 'Nama lengkap pemesan wajib diisi.' };
    }
    if (buyerPhone.replace(/[^\d]/g, '').length < 8) {
      set.status = 422;
      return { error: 'Nomor WhatsApp aktif wajib diisi agar siswa dapat menghubungi Anda.' };
    }

    const rows = await db
      .select({ post: products, seller: users })
      .from(products)
      .innerJoin(users, eq(products.userId, users.id))
      .where(eq(products.id, productId))
      .limit(1);

    if (!rows[0] || rows[0].post.status !== 'published') {
      set.status = 404;
      return { error: 'Karya tidak ditemukan atau sudah tidak tersedia.' };
    }

    const { post, seller } = rows[0];

    if (post.type === 'portfolio') {
      set.status = 422;
      return { error: 'Portofolio tidak dapat dipesan langsung.' };
    }
    if (currentUser && currentUser.id === seller.id) {
      set.status = 422;
      return { error: 'Anda tidak dapat memesan karya milik sendiri.' };
    }
    if (!seller.acceptingOrders) {
      set.status = 422;
      return { error: 'Siswa sedang tidak menerima pesanan baru saat ini.' };
    }
    if (post.type === 'product' && post.stock < quantity) {
      set.status = 422;
      return { error: `Stok barang tidak mencukupi (tersisa ${post.stock}).` };
    }

    const unitPrice = post.type === 'service' ? post.priceMin ?? post.price : post.price;
    const agreedPrice = unitPrice * quantity;
    const unitCostSnapshot = post.costPrice * quantity;
    const orderCode = generateOrderCode();
    const reviewToken = randomBytes(24).toString('hex');

    await db.insert(orders).values({
      orderCode,
      source: 'product',
      productId: post.id,
      sellerId: seller.id,
      buyerId: currentUser?.id ?? null,
      buyerName,
      buyerPhone,
      buyerAddress,
      buyerNotes,
      quantity,
      agreedPrice,
      unitCostSnapshot,
      status: 'requested',
      reviewToken
    });

    const todayStr = new Date().toISOString().slice(0, 10);
    try {
      await db
        .insert(productDailyStats)
        .values({
          productId: post.id,
          statDate: todayStr,
          views: 0,
          shares: 0,
          ordersCreated: 1
        })
        .onDuplicateKeyUpdate({
          set: { ordersCreated: sql`${productDailyStats.ordersCreated} + 1` }
        });
    } catch {
      // Non-blocking
    }

    await NotifyService.send({
      userId: seller.id,
      type: 'new_order',
      title: 'Pesanan Baru Masuk!',
      body: `${buyerName} memesan "${post.name}" (${orderCode}).`,
      actionUrl: '/pesanan-masuk'
    });

    const whatsappUrl = buildWaLinkToSeller({
      sellerPhone: seller.phoneNumber,
      sellerName: seller.name,
      orderCode,
      postName: post.name,
      quantity,
      agreedPrice,
      buyerName,
      buyerNotes
    });

    set.status = 201;
    return {
      orderCode,
      reviewToken,
      trackUrl: `/pesanan/${orderCode}?token=${reviewToken}`,
      whatsappUrl
    };
  })

  .get('/orders/track/:orderCode', async ({ request, params, query, set }) => {
    const orderCode = String(params.orderCode || '').trim();
    const token = String(query.token || '').trim();
    const currentUser = await resolveUserFromRequest(request);

    const rows = await db
      .select({
        order: orders,
        post: products,
        jobRequest: jobRequests,
        seller: users
      })
      .from(orders)
      .innerJoin(users, eq(orders.sellerId, users.id))
      .leftJoin(products, eq(orders.productId, products.id))
      .leftJoin(jobRequests, eq(orders.jobRequestId, jobRequests.id))
      .where(eq(orders.orderCode, orderCode))
      .limit(1);

    if (!rows[0]) {
      set.status = 404;
      return { error: 'Pesanan tidak ditemukan.' };
    }

    const { order, post, jobRequest, seller } = rows[0];

    const hasValidToken = safeTokenMatch(token, order.reviewToken);
    const isBuyerOrSeller =
      Boolean(currentUser) &&
      (currentUser!.id === order.sellerId ||
        (order.buyerId !== null && currentUser!.id === order.buyerId));
    const isSchoolTeacher =
      Boolean(currentUser) &&
      currentUser!.userType === 'teacher' &&
      ((Boolean(currentUser!.schoolId) && currentUser!.schoolId === seller.schoolId) ||
        isSameSchool(currentUser!.schoolName, seller.schoolName));

    if (!hasValidToken && !isBuyerOrSeller && !isSchoolTeacher) {
      set.status = 403;
      return { error: 'Akses ditolak. Gunakan tautan pelacakan resmi dari pesanan Anda.' };
    }

    const [existingReview] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.orderId, order.id))
      .limit(1);

    const postTitle = post?.name || jobRequest?.title || 'Pekerjaan Siswa SMK';

    return {
      order: {
        id: order.id,
        orderCode: order.orderCode,
        source: order.source,
        status: order.status,
        statusLabel: ORDER_STATUS_LABELS[order.status],
        quantity: order.quantity,
        agreedPrice: order.agreedPrice,
        formattedAgreedPrice: formatIdrPlain(order.agreedPrice),
        buyerName: order.buyerName,
        buyerAddress: order.buyerAddress,
        buyerNotes: order.buyerNotes,
        progressNote: order.progressNote,
        proofImageUrl: order.proofImage,
        acceptedAt: order.acceptedAt ? order.acceptedAt.toISOString() : null,
        completedAt: order.completedAt ? order.completedAt.toISOString() : null,
        createdAt: order.createdAt.toISOString(),
        canReview:
          order.status === 'completed' &&
          !existingReview &&
          (hasValidToken || (currentUser && order.buyerId === currentUser.id)),
        whatsappToSellerUrl: buildWaLinkToSeller({
          sellerPhone: seller.phoneNumber,
          sellerName: seller.name,
          orderCode: order.orderCode,
          postName: postTitle,
          quantity: order.quantity,
          agreedPrice: order.agreedPrice,
          buyerName: order.buyerName,
          buyerNotes: order.buyerNotes
        }),
        product: post
          ? {
              id: post.id,
              name: post.name,
              type: post.type,
              typeLabel: POST_TYPE_LABELS[post.type],
              imageUrl: post.image
            }
          : null,
        jobRequest: jobRequest
          ? {
              id: jobRequest.id,
              code: jobRequest.code,
              title: jobRequest.title
            }
          : null,
        seller: sanitizePublicUser(seller),
        review: existingReview
          ? {
              id: existingReview.id,
              reviewerName: existingReview.reviewerName,
              rating: existingReview.rating,
              comment: existingReview.comment,
              endorsementTags: existingReview.endorsementTags
                ? existingReview.endorsementTags
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean)
                : [],
              createdAt: existingReview.createdAt.toISOString()
            }
          : null
      }
    };
  })

  .get('/seller/orders', async ({ request, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    if (!currentUser) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }
    if (currentUser.userType !== 'smk') {
      set.status = 403;
      return { error: 'Halaman ini khusus untuk Siswa SMK.' };
    }

    const parsedUrl = new URL(request.url);
    const baseUrl = process.env.APP_URL || `${parsedUrl.protocol}//${parsedUrl.host}`;

    const rows = await db
      .select({
        order: orders,
        post: products,
        jobRequest: jobRequests,
        review: reviews
      })
      .from(orders)
      .leftJoin(products, eq(orders.productId, products.id))
      .leftJoin(jobRequests, eq(orders.jobRequestId, jobRequests.id))
      .leftJoin(reviews, eq(reviews.orderId, orders.id))
      .where(eq(orders.sellerId, currentUser.id))
      .orderBy(desc(orders.createdAt));

    let requestedCount = 0;
    let activeCount = 0;
    let completedCount = 0;
    let totalRevenue = 0;

    const items = rows.map(({ order, post, jobRequest, review }) => {
      if (order.status === 'requested') requestedCount += 1;
      if (order.status === 'accepted' || order.status === 'in_progress') activeCount += 1;
      if (order.status === 'completed') {
        completedCount += 1;
        totalRevenue += order.agreedPrice;
      }

      const trackUrl = `${baseUrl}/pesanan/${order.orderCode}?token=${order.reviewToken}`;
      const postName = post?.name || jobRequest?.title || 'Karya Siswa';

      return {
        id: order.id,
        orderCode: order.orderCode,
        source: order.source,
        status: order.status,
        statusLabel: ORDER_STATUS_LABELS[order.status],
        quantity: order.quantity,
        agreedPrice: order.agreedPrice,
        formattedAgreedPrice: formatIdrPlain(order.agreedPrice),
        buyerName: order.buyerName,
        buyerPhone: order.buyerPhone,
        buyerAddress: order.buyerAddress,
        buyerNotes: order.buyerNotes,
        progressNote: order.progressNote,
        proofImageUrl: order.proofImage,
        trackPath: `/pesanan/${order.orderCode}?token=${order.reviewToken}`,
        whatsappToBuyerUrl: buildWaLinkToBuyer({
          buyerPhone: order.buyerPhone,
          buyerName: order.buyerName,
          sellerName: currentUser.name,
          orderCode: order.orderCode,
          postName,
          status: order.status,
          trackUrl
        }),
        acceptedAt: order.acceptedAt ? order.acceptedAt.toISOString() : null,
        completedAt: order.completedAt ? order.completedAt.toISOString() : null,
        createdAt: order.createdAt.toISOString(),
        product: post
          ? {
              id: post.id,
              name: post.name,
              type: post.type,
              typeLabel: POST_TYPE_LABELS[post.type],
              imageUrl: post.image
            }
          : null,
        jobRequest: jobRequest
          ? {
              id: jobRequest.id,
              code: jobRequest.code,
              title: jobRequest.title
            }
          : null,
        review: review
          ? {
              rating: review.rating,
              comment: review.comment,
              endorsementTags: review.endorsementTags
                ? review.endorsementTags.split(',').filter(Boolean)
                : []
            }
          : null
      };
    });

    return {
      summary: {
        requestedCount,
        activeCount,
        completedCount,
        totalRevenue,
        formattedTotalRevenue: formatIdrPlain(totalRevenue)
      },
      items
    };
  })

  .patch('/seller/orders/:id/status', async ({ request, params, body, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    if (!currentUser) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }

    const orderId = Number(params.id);
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) {
      set.status = 404;
      return { error: 'Pesanan tidak ditemukan.' };
    }
    if (order.sellerId !== currentUser.id) {
      set.status = 403;
      return { error: 'Anda tidak berhak mengubah status pesanan ini.' };
    }

    const data = (body ?? {}) as Record<string, unknown>;
    const nextStatus = String(data.status ?? '').trim() as typeof order.status;

    const validTransitions: Record<string, string[]> = {
      requested: ['accepted', 'cancelled'],
      accepted: ['in_progress', 'completed', 'cancelled'],
      in_progress: ['completed', 'cancelled'],
      completed: [],
      cancelled: []
    };

    if (!validTransitions[order.status]?.includes(nextStatus)) {
      set.status = 422;
      return {
        error: `Perubahan status dari "${ORDER_STATUS_LABELS[order.status]}" ke "${nextStatus}" tidak diizinkan.`
      };
    }

    const nextAgreedPrice =
      data.agreedPrice !== undefined && String(data.agreedPrice) !== ''
        ? Math.max(0, Math.round(Number(data.agreedPrice) || 0))
        : order.agreedPrice;

    const nextProgressNote =
      data.progressNote !== undefined
        ? String(data.progressNote).trim() || order.progressNote
        : order.progressNote;

    let nextProofImage = order.proofImage;
    if (data.proofImage instanceof Blob && data.proofImage.size > 0) {
      try {
        nextProofImage = await saveUploadedWebp(data.proofImage, 'proofs', {
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

    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(orders)
        .set({
          status: nextStatus,
          agreedPrice: nextAgreedPrice,
          progressNote: nextProgressNote,
          proofImage: nextProofImage,
          acceptedAt: nextStatus === 'accepted' ? now : order.acceptedAt ?? now,
          completedAt: nextStatus === 'completed' ? now : order.completedAt
        })
        .where(eq(orders.id, order.id));

      if (nextStatus === 'completed' && order.productId) {
        const [prod] = await tx
          .select()
          .from(products)
          .where(eq(products.id, order.productId))
          .limit(1);

        if (prod && prod.type === 'product') {
          const updatedStock = Math.max(0, prod.stock - order.quantity);
          await tx
            .update(products)
            .set({ stock: updatedStock })
            .where(eq(products.id, prod.id));
        }
      }

      if (nextStatus === 'completed' && order.jobRequestId) {
        await tx
          .update(jobRequests)
          .set({ status: 'completed' })
          .where(eq(jobRequests.id, order.jobRequestId));
      }
    });

    if (nextStatus === 'completed') {
      await StatsService.refreshStudentStats(order.sellerId);
    try {
      await BadgeService.evaluateUser(order.sellerId);
    } catch (err) {
      console.error('Failed to evaluate user badges:', err);
    }
      try {
        await BadgeService.evaluateUser(order.sellerId);
      } catch (err) {
        console.error('Failed to evaluate user badges:', err);
      }
    }

    const parsedUrl = new URL(request.url);
    const baseUrl = process.env.APP_URL || `${parsedUrl.protocol}//${parsedUrl.host}`;
    const trackUrl = `${baseUrl}/pesanan/${order.orderCode}?token=${order.reviewToken}`;

    let postName = 'Karya Siswa';
    if (order.productId) {
      const [p] = await db
        .select({ name: products.name })
        .from(products)
        .where(eq(products.id, order.productId))
        .limit(1);
      if (p) postName = p.name;
    } else if (order.jobRequestId) {
      const [jr] = await db
        .select({ title: jobRequests.title })
        .from(jobRequests)
        .where(eq(jobRequests.id, order.jobRequestId))
        .limit(1);
      if (jr) postName = jr.title;
    }

    if (order.buyerId) {
      await NotifyService.send({
        userId: order.buyerId,
        type: 'order_status',
        title: `Status Pesanan: ${ORDER_STATUS_LABELS[nextStatus]}`,
        body: `Pesanan "${postName}" (${order.orderCode}) kini berstatus ${ORDER_STATUS_LABELS[nextStatus]}.`,
        actionUrl: `/pesanan/${order.orderCode}?token=${order.reviewToken}`
      });
    }

    return {
      success: true,
      status: nextStatus,
      statusLabel: ORDER_STATUS_LABELS[nextStatus],
      proofImageUrl: nextProofImage,
      agreedPrice: nextAgreedPrice,
      whatsappToBuyerUrl: buildWaLinkToBuyer({
        buyerPhone: order.buyerPhone,
        buyerName: order.buyerName,
        sellerName: currentUser.name,
        orderCode: order.orderCode,
        postName,
        status: nextStatus,
        trackUrl
      })
    };
  })

  .post('/orders/:orderCode/review', async ({ request, params, body, set }) => {
    const orderCode = String(params.orderCode || '').trim();
    const currentUser = await resolveUserFromRequest(request);
    const data = (body ?? {}) as Record<string, unknown>;

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderCode, orderCode))
      .limit(1);

    if (!order) {
      set.status = 404;
      return { error: 'Pesanan tidak ditemukan.' };
    }

    const token = String(data.token ?? '').trim();
    const authorized =
      safeTokenMatch(token, order.reviewToken) ||
      (Boolean(currentUser) && order.buyerId !== null && currentUser!.id === order.buyerId);

    if (!authorized) {
      set.status = 403;
      return { error: 'Token ulasan tidak valid.' };
    }

    if (order.status !== 'completed') {
      set.status = 422;
      return { error: 'Ulasan hanya dapat diberikan setelah pesanan selesai.' };
    }

    const [existing] = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(eq(reviews.orderId, order.id))
      .limit(1);

    if (existing) {
      set.status = 409;
      return { error: 'Ulasan untuk pesanan ini sudah pernah dikirim.' };
    }

    const rating = Math.round(Number(data.rating ?? 0));
    const comment = String(data.comment ?? '').trim();

    if (rating < 1 || rating > 5) {
      set.status = 422;
      return { error: 'Pilih nilai bintang antara 1 sampai 5.' };
    }
    if (comment.length < 5) {
      set.status = 422;
      return { error: 'Tulis pengalaman singkat Anda minimal 5 karakter.' };
    }

    let rawTags: string[] = [];
    if (Array.isArray(data.endorsementTags)) {
      rawTags = data.endorsementTags.map((t) => String(t).trim());
    } else if (typeof data.endorsementTags === 'string') {
      rawTags = data.endorsementTags.split(',').map((t) => t.trim());
    }

    const allowedSet = new Set<string>(ENDORSEMENT_TAGS);
    const validTags = Array.from(new Set(rawTags.filter((t) => allowedSet.has(t))));

    const [inserted] = await db.insert(reviews).values({
      orderId: order.id,
      productId: order.productId,
      sellerId: order.sellerId,
      reviewerName: order.buyerName,
      rating,
      comment,
      endorsementTags: validTags.length > 0 ? validTags.join(',') : null
    });

    await StatsService.refreshStudentStats(order.sellerId);
    try {
      await BadgeService.evaluateUser(order.sellerId);
    } catch (err) {
      console.error('Failed to evaluate user badges:', err);
    }

    await NotifyService.send({
      userId: order.sellerId,
      type: 'new_review',
      title: `Ulasan Bintang ${rating} dari ${order.buyerName}!`,
      body: comment.slice(0, 140),
      actionUrl: '/pesanan-masuk'
    });

    set.status = 201;
    return {
      success: true,
      review: {
        id: inserted.insertId,
        reviewerName: order.buyerName,
        rating,
        comment,
        endorsementTags: validTags
      }
    };
  });
