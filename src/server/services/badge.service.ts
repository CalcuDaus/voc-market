import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  badges,
  certificates,
  orders,
  products,
  reviews,
  userBadges,
  users
} from '../db/schema';
import { PricingService } from './pricing.service';
import { normalizeWaNumber } from './whatsapp.service';
import { NotifyService } from './notify.service';

export interface LevelRequirement {
  label: string;
  achieved: boolean;
  current: number | string | boolean;
  target: number | string | boolean;
}

export interface UserLevelEvaluation {
  creatorLevel: number;
  levelTitle: string;
  badgesCount: number;
  unlockedBadges: {
    id: number;
    slug: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    category: string;
    contextNote: string | null;
    awardedAt: string;
  }[];
  newlyAwardedBadgeSlugs: string[];
  nextLevel: {
    level: number;
    title: string;
    requirements: LevelRequirement[];
  } | null;
}

export class BadgeService {
  static getLevelTitle(level: number): string {
    switch (level) {
      case 4:
        return 'Profesional Vokasi';
      case 3:
        return 'Mitra Terpercaya';
      case 2:
        return 'Kreator Aktif';
      case 1:
      default:
        return 'Kreator Pemula';
    }
  }

  /**
   * Evaluates and updates a user's creatorLevel (1-4) and awards eligible badges.
   */
  static async evaluateUser(userId: number): Promise<UserLevelEvaluation> {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      throw new Error(`User with ID ${userId} not found.`);
    }

    // 1. Gather all required metrics
    const userOrders = await db
      .select({
        id: orders.id,
        status: orders.status,
        buyerId: orders.buyerId,
        buyerPhone: orders.buyerPhone
      })
      .from(orders)
      .where(eq(orders.sellerId, userId));

    const completedOrders = userOrders.filter((o) => o.status === 'completed');
    const completedOrdersCount = completedOrders.length;

    const userReviews = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        endorsementTags: reviews.endorsementTags,
        createdAt: reviews.createdAt
      })
      .from(reviews)
      .where(eq(reviews.sellerId, userId))
      .orderBy(desc(reviews.createdAt));

    const reviewsCount = userReviews.length;
    const avgRating =
      reviewsCount > 0
        ? userReviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount
        : 0;

    const userProducts = await db
      .select({
        id: products.id,
        status: products.status,
        costPrice: products.costPrice,
        price: products.price,
        costBreakdown: products.costBreakdown,
        isVerifiedByTeacher: products.isVerifiedByTeacher,
        isTefa: products.isTefa
      })
      .from(products)
      .where(eq(products.userId, userId));

    const publishedProducts = userProducts.filter((p) => p.status === 'published');
    const publishedCount = publishedProducts.length;

    const userCerts = await db
      .select({ id: certificates.id })
      .from(certificates)
      .where(and(eq(certificates.userId, userId), sql`${certificates.revokedAt} IS NULL`));

    const certificatesCount = userCerts.length;
    const isTeacherVerified = Boolean(user.isVerified);

    // 2. Determine Creator Level (1..4)
    let nextCreatorLevel = 1;

    // Level 4: completedOrders >= 15 && avgRating >= 4.6 && (reviewsCount >= 10 || certificatesCount >= 1)
    if (
      completedOrdersCount >= 15 &&
      avgRating >= 4.6 &&
      (reviewsCount >= 10 || certificatesCount >= 1)
    ) {
      nextCreatorLevel = 4;
    }
    // Level 3: completedOrders >= 5 && avgRating >= 4.2 && isVerified === true
    else if (completedOrdersCount >= 5 && avgRating >= 4.2 && isTeacherVerified) {
      nextCreatorLevel = 3;
    }
    // Level 2: publishedWorksCount >= 1 && completedOrders >= 1
    else if (publishedCount >= 1 && completedOrdersCount >= 1) {
      nextCreatorLevel = 2;
    }

    const previousLevel = user.creatorLevel || 1;
    if (nextCreatorLevel !== previousLevel) {
      await db
        .update(users)
        .set({ creatorLevel: nextCreatorLevel })
        .where(eq(users.id, userId));

      if (nextCreatorLevel > previousLevel) {
        await NotifyService.send({
          userId,
          type: 'level_up',
          title: `Selamat! Anda Naik ke Level ${nextCreatorLevel}: ${BadgeService.getLevelTitle(nextCreatorLevel)}`,
          body: 'Jam terbang dan dedikasi vokasi Anda diakui di VOC-Market. Terus berkarya!',
          actionUrl: '/dashboard-penjual'
        });
      }
    }

    // 3. Evaluate 7 Official Badges
    const allBadgesList = await db.select().from(badges);
    const badgeBySlug = Object.fromEntries(allBadgesList.map((b) => [b.slug, b]));

    const existingUserBadges = await db
      .select({ badgeId: userBadges.badgeId })
      .from(userBadges)
      .where(eq(userBadges.userId, userId));
    const existingBadgeIds = new Set(existingUserBadges.map((b) => b.badgeId));

    const newlyAwardedBadgeSlugs: string[] = [];

    async function awardBadgeIfEligible(slug: string, isEligible: boolean, contextNote?: string) {
      const badge = badgeBySlug[slug];
      if (!badge || !isEligible) return;

      if (!existingBadgeIds.has(badge.id)) {
        await db.insert(userBadges).values({
          userId,
          badgeId: badge.id,
          contextNote: contextNote || null
        });
        existingBadgeIds.add(badge.id);
        newlyAwardedBadgeSlugs.push(slug);

        await NotifyService.send({
          userId,
          type: 'badge_unlocked',
          title: `Lencana Baru Diraih: ${badge.name}!`,
          body: badge.description,
          actionUrl: `/profil/${user.username}`
        });
      }
    }

    // Badge 1: first_project (completedOrders >= 1)
    await awardBadgeIfEligible(
      'first_project',
      completedOrdersCount >= 1,
      'Menyelesaikan pesanan riil perdana'
    );

    // Badge 2: on_time_hero (received tag 'Tepat Waktu' on >= 3 reviews)
    const onTimeCount = userReviews.filter((r) =>
      String(r.endorsementTags || '').includes('Tepat Waktu')
    ).length;
    await awardBadgeIfEligible(
      'on_time_hero',
      onTimeCount >= 3,
      `Menerima ${onTimeCount} tag Tepat Waktu`
    );

    // Badge 3: quality_craft (received tag 'Rapi & Berkualitas' on >= 3 reviews)
    const qualityCount = userReviews.filter((r) =>
      String(r.endorsementTags || '').includes('Rapi & Berkualitas')
    ).length;
    await awardBadgeIfEligible(
      'quality_craft',
      qualityCount >= 3,
      `Menerima ${qualityCount} tag Rapi & Berkualitas`
    );

    // Badge 4: five_star_streak (5 most recent reviews all rating === 5)
    const recentFiveReviews = userReviews.slice(0, 5);
    const hasFiveStarStreak =
      recentFiveReviews.length >= 5 && recentFiveReviews.every((r) => r.rating === 5);
    await awardBadgeIfEligible(
      'five_star_streak',
      hasFiveStarStreak,
      '5 ulasan berturut-turut bintang 5 sempurna'
    );

    // Badge 5: repeat_trusted (>= 2 completed orders from same normalized buyerPhone or buyerId)
    const buyerFrequency = new Map<string, number>();
    for (const ord of completedOrders) {
      const key = ord.buyerId
        ? `uid:${ord.buyerId}`
        : `ph:${normalizeWaNumber(ord.buyerPhone) || ord.buyerPhone}`;
      buyerFrequency.set(key, (buyerFrequency.get(key) || 0) + 1);
    }
    const hasRepeatBuyer = Array.from(buyerFrequency.values()).some((freq) => freq >= 2);
    await awardBadgeIfEligible(
      'repeat_trusted',
      hasRepeatBuyer,
      'Mendapat pesanan berulang dari pelanggan yang sama'
    );

    // Badge 6: smart_hpp (>= 3 published posts with costBreakdown !== null and healthy margin)
    const healthyHppCount = publishedProducts.filter((p) => {
      if (!p.costBreakdown) return false;
      const analysis = PricingService.analyzeMargin(p.costPrice, p.price);
      return analysis.status === 'healthy';
    }).length;
    await awardBadgeIfEligible(
      'smart_hpp',
      healthyHppCount >= 3,
      `Memiliki ${healthyHppCount} karya ber-HPP sehat`
    );

    // Badge 7: tefa_verified (>= 1 post with isVerifiedByTeacher or isTefa)
    const hasTefaOrTeacherPost = userProducts.some(
      (p) => p.isVerifiedByTeacher || p.isTefa
    );
    await awardBadgeIfEligible(
      'tefa_verified',
      hasTefaOrTeacherPost,
      'Karya telah disahkan TeFa/Guru Pembimbing'
    );

    // 4. Retrieve complete badges list for user
    const finalUserBadges = await db
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
      .where(eq(userBadges.userId, userId))
      .orderBy(desc(userBadges.awardedAt));

    // 5. Build next level requirements checklist
    let nextLevel: UserLevelEvaluation['nextLevel'] = null;

    if (nextCreatorLevel === 1) {
      nextLevel = {
        level: 2,
        title: BadgeService.getLevelTitle(2),
        requirements: [
          {
            label: 'Publikasikan minimal 1 karya/jasa',
            achieved: publishedCount >= 1,
            current: publishedCount,
            target: 1
          },
          {
            label: 'Selesaikan minimal 1 pesanan nyata',
            achieved: completedOrdersCount >= 1,
            current: completedOrdersCount,
            target: 1
          }
        ]
      };
    } else if (nextCreatorLevel === 2) {
      nextLevel = {
        level: 3,
        title: BadgeService.getLevelTitle(3),
        requirements: [
          {
            label: 'Selesaikan minimal 5 pesanan nyata',
            achieved: completedOrdersCount >= 5,
            current: completedOrdersCount,
            target: 5
          },
          {
            label: 'Pertahankan rata-rata rating ≥ 4.2',
            achieved: avgRating >= 4.2,
            current: Number(avgRating.toFixed(2)),
            target: 4.2
          },
          {
            label: 'Dapatkan verifikasi dari Guru Pembimbing SMK',
            achieved: isTeacherVerified,
            current: isTeacherVerified ? 'Terverifikasi' : 'Belum',
            target: 'Terverifikasi'
          }
        ]
      };
    } else if (nextCreatorLevel === 3) {
      nextLevel = {
        level: 4,
        title: BadgeService.getLevelTitle(4),
        requirements: [
          {
            label: 'Selesaikan minimal 15 pesanan nyata',
            achieved: completedOrdersCount >= 15,
            current: completedOrdersCount,
            target: 15
          },
          {
            label: 'Pertahankan rata-rata rating ≥ 4.6',
            achieved: avgRating >= 4.6,
            current: Number(avgRating.toFixed(2)),
            target: 4.6
          },
          {
            label: 'Memiliki minimal 10 ulasan ATAU 1 sertifikat tantangan industri',
            achieved: reviewsCount >= 10 || certificatesCount >= 1,
            current: `${reviewsCount} ulasan / ${certificatesCount} sertifikat`,
            target: '10 ulasan / 1 sertifikat'
          }
        ]
      };
    }

    return {
      creatorLevel: nextCreatorLevel,
      levelTitle: BadgeService.getLevelTitle(nextCreatorLevel),
      badgesCount: finalUserBadges.length,
      unlockedBadges: finalUserBadges.map((b) => ({
        ...b,
        awardedAt: b.awardedAt.toISOString()
      })),
      newlyAwardedBadgeSlugs,
      nextLevel
    };
  }
}
