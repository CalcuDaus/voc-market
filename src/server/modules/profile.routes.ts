import { Elysia } from 'elysia';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../db';
import {
  badges,
  certificates,
  challenges,
  jobRequests,
  orders,
  products,
  reviews,
  schools,
  userBadges,
  users
} from '../db/schema';
import { resolveUserFromRequest, sanitizePublicUser } from '../middleware/auth';
import { formatPostPrice } from './posts.routes';
import { generateQrSvg } from '../services/qr.service';
import { formatIdrPlain } from '../services/whatsapp.service';
import { BadgeService } from '../services/badge.service';
import {
  CERTIFICATE_TYPE_LABELS,
  getExperienceLevelLabel,
  ORDER_STATUS_LABELS,
  POST_TYPE_LABELS
} from '../../shared/constants';

function maskPoliteCustomerName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] || 'Pelanggan';
  const lastInitial = parts[parts.length - 1][0]?.toUpperCase() || '';
  return `${parts.slice(0, -1).join(' ')} ${lastInitial}.`;
}

function aggregateEndorsementTags(reviewRows: (typeof reviews.$inferSelect)[]) {
  const counts = new Map<string, number>();
  for (const r of reviewRows) {
    if (!r.endorsementTags) continue;
    for (const raw of r.endorsementTags.split(',')) {
      const tag = raw.trim();
      if (tag) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

export const profileRoutes = new Elysia({ prefix: '/api' })
  .get('/profile/:username', async ({ request, params, set }) => {
    const uname = String(params.username || '').trim().toLowerCase();
    const currentUser = await resolveUserFromRequest(request);

    const [user] = await db.select().from(users).where(eq(users.username, uname)).limit(1);
    if (!user) {
      set.status = 404;
      return { error: 'Profil pengguna tidak ditemukan.' };
    }

    let verifierName: string | null = null;
    if (user.verifiedBy) {
      const [v] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, user.verifiedBy))
        .limit(1);
      verifierName = v?.name ?? null;
    }

    let schoolInfo: { id: number; name: string; slug: string; isVerified: boolean } | null = null;
    if (user.schoolId) {
      const [sc] = await db
        .select()
        .from(schools)
        .where(eq(schools.id, user.schoolId))
        .limit(1);
      if (sc) {
        schoolInfo = {
          id: sc.id,
          name: sc.name,
          slug: sc.slug,
          isVerified: Boolean(sc.isVerified)
        };
      }
    }

    const userPosts = await db
      .select()
      .from(products)
      .where(and(eq(products.userId, user.id), eq(products.status, 'published')))
      .orderBy(desc(products.createdAt));

    const completedOrders = await db
      .select()
      .from(orders)
      .where(and(eq(orders.sellerId, user.id), eq(orders.status, 'completed')));

    const userReviews = await db
      .select()
      .from(reviews)
      .where(eq(reviews.sellerId, user.id))
      .orderBy(desc(reviews.createdAt));

    const activeCerts = await db
      .select({
        cert: certificates,
        challengeSlug: challenges.slug,
        challengeTitle: challenges.title
      })
      .from(certificates)
      .leftJoin(challenges, eq(certificates.challengeId, challenges.id))
      .where(and(eq(certificates.userId, user.id), isNull(certificates.revokedAt)))
      .orderBy(desc(certificates.issuedAt));

    const avgRating =
      userReviews.length > 0
        ? Number(
            (userReviews.reduce((acc, r) => acc + r.rating, 0) / userReviews.length).toFixed(1)
          )
        : 0;

    let myBuyerOrders: unknown[] = [];
    if (currentUser && currentUser.id === user.id) {
      const myOrders = await db
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
        .where(eq(orders.buyerId, user.id))
        .orderBy(desc(orders.createdAt));

      myBuyerOrders = myOrders.map(({ order, post, jobRequest, seller }) => ({
        orderCode: order.orderCode,
        source: order.source,
        status: order.status,
        statusLabel: ORDER_STATUS_LABELS[order.status],
        formattedAgreedPrice: formatIdrPlain(order.agreedPrice),
        postName: post?.name || jobRequest?.title || 'Pekerjaan Siswa',
        sellerName: seller.name,
        trackPath: `/pesanan/${order.orderCode}?token=${order.reviewToken}`,
        createdAt: order.createdAt.toISOString()
      }));
    }

    const userBadgesList = await db
      .select({
        id: badges.id,
        slug: badges.slug,
        name: badges.name,
        description: badges.description,
        icon: badges.icon,
        color: badges.color,
        category: badges.category,
        contextNote: userBadges.contextNote,
        awardedAt: userBadges.awardedAt
      })
      .from(userBadges)
      .innerJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(eq(userBadges.userId, user.id))
      .orderBy(desc(userBadges.awardedAt));

    return {
      profile: {
        ...sanitizePublicUser(user),
        verifierName,
        school: schoolInfo,
        creatorLevel: user.creatorLevel || 1,
        creatorLevelTitle: BadgeService.getLevelTitle(user.creatorLevel || 1),
        badges: userBadgesList.map((b) => ({
          ...b,
          awardedAt: b.awardedAt.toISOString()
        })),
        experienceLevel: getExperienceLevelLabel(completedOrders.length),
        metrics: {
          completedOrdersCount: completedOrders.length,
          avgRating,
          reviewsCount: userReviews.length,
          worksCount: userPosts.length,
          certificatesCount: activeCerts.length
        },
        endorsedSkills: aggregateEndorsementTags(userReviews),
        certificates: activeCerts.map(({ cert, challengeSlug, challengeTitle }) => ({
          code: cert.code,
          type: cert.type,
          typeLabel: CERTIFICATE_TYPE_LABELS[cert.type],
          title: cert.title,
          issuerName: cert.issuerName,
          challengeSlug: challengeSlug ?? null,
          challengeTitle: challengeTitle ?? null,
          issuedAt: cert.issuedAt.toISOString()
        })),
        posts: userPosts.map((p) => ({
          id: p.id,
          type: p.type,
          typeLabel: POST_TYPE_LABELS[p.type],
          name: p.name,
          description: p.description,
          imageUrl: p.image,
          formattedPrice: formatPostPrice(p),
          likesCount: p.likesCount,
          viewsCount: p.viewsCount,
          isVerifiedByTeacher: Boolean(p.isVerifiedByTeacher),
          teacherNote: p.teacherNote,
          isTefa: Boolean(p.isTefa),
          tefaUnit: p.tefaUnit,
          createdAt: p.createdAt.toISOString()
        })),
        latestReviews: userReviews.slice(0, 6).map((r) => ({
          id: r.id,
          reviewerName: maskPoliteCustomerName(r.reviewerName),
          rating: r.rating,
          comment: r.comment,
          endorsementTags: r.endorsementTags
            ? r.endorsementTags.split(',').map((t) => t.trim()).filter(Boolean)
            : [],
          createdAt: r.createdAt.toISOString()
        })),
        myBuyerOrders
      }
    };
  })

  .get('/passport/:username', async ({ request, params, set }) => {
    const uname = String(params.username || '').trim().toLowerCase();
    const [student] = await db.select().from(users).where(eq(users.username, uname)).limit(1);

    if (!student || student.userType !== 'smk') {
      set.status = 404;
      return { error: 'Paspor Kerja siswa tidak ditemukan.' };
    }

    let verifierName: string | null = null;
    if (student.verifiedBy) {
      const [v] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, student.verifiedBy))
        .limit(1);
      verifierName = v?.name ?? null;
    }

    let schoolInfo: { id: number; name: string; slug: string; isVerified: boolean } | null = null;
    if (student.schoolId) {
      const [sc] = await db
        .select()
        .from(schools)
        .where(eq(schools.id, student.schoolId))
        .limit(1);
      if (sc) {
        schoolInfo = {
          id: sc.id,
          name: sc.name,
          slug: sc.slug,
          isVerified: Boolean(sc.isVerified)
        };
      }
    }

    const completedRows = await db
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
      .where(and(eq(orders.sellerId, student.id), eq(orders.status, 'completed')))
      .orderBy(desc(orders.completedAt), desc(orders.id));

    const allReviews = await db
      .select()
      .from(reviews)
      .where(eq(reviews.sellerId, student.id))
      .orderBy(desc(reviews.createdAt));

    const studentWorks = await db
      .select()
      .from(products)
      .where(and(eq(products.userId, student.id), eq(products.status, 'published')))
      .orderBy(desc(products.isVerifiedByTeacher), desc(products.likesCount));

    const activeCerts = await db
      .select({
        cert: certificates,
        challengeSlug: challenges.slug,
        challengeTitle: challenges.title
      })
      .from(certificates)
      .leftJoin(challenges, eq(certificates.challengeId, challenges.id))
      .where(and(eq(certificates.userId, student.id), isNull(certificates.revokedAt)))
      .orderBy(desc(certificates.issuedAt));

    const userBadgesList = await db
      .select({
        id: badges.id,
        slug: badges.slug,
        name: badges.name,
        description: badges.description,
        icon: badges.icon,
        color: badges.color,
        category: badges.category,
        contextNote: userBadges.contextNote,
        awardedAt: userBadges.awardedAt
      })
      .from(userBadges)
      .innerJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(eq(userBadges.userId, student.id))
      .orderBy(desc(userBadges.awardedAt));

    const uniqueCustomerPhones = new Set(
      completedRows.map((r) => r.order.buyerPhone.replace(/[^\d]/g, ''))
    );
    const totalProjectValue = completedRows.reduce((sum, r) => sum + r.order.agreedPrice, 0);
    const avgRating =
      allReviews.length > 0
        ? Number(
            (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(1)
          )
        : 0;

    const parsedUrl = new URL(request.url);
    const baseUrl = process.env.APP_URL || `${parsedUrl.protocol}//${parsedUrl.host}`;
    const passportPublicUrl = `${baseUrl}/paspor-kerja/${student.username}`;
    const qrSvg = await generateQrSvg(passportPublicUrl);
    const passportCode = `VOC-PASS-${String(student.id).padStart(5, '0')}`;

    return {
      passport: {
        passportCode,
        passportUrl: passportPublicUrl,
        generatedAt: new Date().toISOString(),
        qrSvg,
        student: {
          ...sanitizePublicUser(student),
          verifierName,
          school: schoolInfo,
          creatorLevel: student.creatorLevel || 1,
          creatorLevelTitle: BadgeService.getLevelTitle(student.creatorLevel || 1)
        },
        creatorLevel: student.creatorLevel || 1,
        creatorLevelTitle: BadgeService.getLevelTitle(student.creatorLevel || 1),
        badges: userBadgesList.map((b) => ({
          ...b,
          awardedAt: b.awardedAt.toISOString()
        })),
        experienceLevel: getExperienceLevelLabel(completedRows.length),
        metrics: {
          completedOrdersCount: completedRows.length,
          uniqueCustomersCount: uniqueCustomerPhones.size,
          avgRating,
          reviewsCount: allReviews.length,
          totalProjectValue,
          formattedTotalProjectValue: formatIdrPlain(totalProjectValue),
          tefaApprovedWorksCount: studentWorks.filter((w) => w.isVerifiedByTeacher).length,
          certificatesCount: activeCerts.length
        },
        endorsedSkills: aggregateEndorsementTags(allReviews),
        certificates: activeCerts.map(({ cert, challengeSlug, challengeTitle }) => ({
          code: cert.code,
          type: cert.type,
          typeLabel: CERTIFICATE_TYPE_LABELS[cert.type],
          title: cert.title,
          issuerName: cert.issuerName,
          challengeSlug: challengeSlug ?? null,
          challengeTitle: challengeTitle ?? null,
          issuedAt: cert.issuedAt.toISOString()
        })),
        workHistory: completedRows.map(({ order, post, jobRequest, review }) => ({
          orderCode: order.orderCode,
          source: order.source,
          title: post?.name || jobRequest?.title || 'Proyek Pelanggan',
          type: post?.type || 'service',
          typeLabel: post ? POST_TYPE_LABELS[post.type] : 'Papan Butuh Bantuan',
          clientName: maskPoliteCustomerName(order.buyerName),
          quantity: order.quantity,
          formattedValue: formatIdrPlain(order.agreedPrice),
          progressNote: order.progressNote,
          proofImageUrl: order.proofImage,
          completedAt: (order.completedAt ?? order.updatedAt).toISOString(),
          review: review
            ? {
                rating: review.rating,
                comment: review.comment,
                endorsementTags: review.endorsementTags
                  ? review.endorsementTags.split(',').map((t) => t.trim()).filter(Boolean)
                  : []
              }
            : null
        })),
        featuredWorks: studentWorks.slice(0, 6).map((w) => ({
          id: w.id,
          type: w.type,
          typeLabel: POST_TYPE_LABELS[w.type],
          name: w.name,
          description: w.description,
          imageUrl: w.image,
          formattedPrice: formatPostPrice(w),
          projectLink: w.projectLink,
          isVerifiedByTeacher: Boolean(w.isVerifiedByTeacher),
          teacherNote: w.teacherNote,
          isTefa: Boolean(w.isTefa),
          tefaUnit: w.tefaUnit
        }))
      }
    };
  });
