import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../db';
import { certificates, orders, reviews, users } from '../db/schema';

export interface RefreshedStudentStats {
  completedOrders: number;
  avgRating: number;
  reviewsCount: number;
  activeCertificatesCount: number;
  talentScore: number;
}

export class StatsService {
  static computeTalentScore(params: {
    avgRating: number;
    completedOrders: number;
    isVerified: boolean;
    activeCertificatesCount: number;
    isActiveWithin30Days: boolean;
  }): number {
    const ratingPart = 35 * (params.avgRating / 5);
    const ordersPart = 25 * Math.min(1, Math.log2(1 + params.completedOrders) / 5);
    const verifiedPart = params.isVerified ? 15 : 0;
    const certPart = 15 * Math.min(1, params.activeCertificatesCount / 3);
    const activePart = params.isActiveWithin30Days ? 10 : 0;
    return Number((ratingPart + ordersPart + verifiedPart + certPart + activePart).toFixed(2));
  }

  static async refreshStudentStats(userId: number): Promise<RefreshedStudentStats | null> {
    const [student] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!student || student.userType !== 'smk') {
      return null;
    }

    const [{ completedCnt }] = await db
      .select({ completedCnt: sql<number>`COUNT(*)` })
      .from(orders)
      .where(and(eq(orders.sellerId, userId), eq(orders.status, 'completed')));

    const [{ avgRat, revCnt }] = await db
      .select({
        avgRat: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
        revCnt: sql<number>`COUNT(*)`
      })
      .from(reviews)
      .where(eq(reviews.sellerId, userId));

    const [{ certCnt }] = await db
      .select({ certCnt: sql<number>`COUNT(*)` })
      .from(certificates)
      .where(and(eq(certificates.userId, userId), isNull(certificates.revokedAt)));

    const completedOrders = Number(completedCnt || 0);
    const avgRating = Number(Number(avgRat || 0).toFixed(2));
    const reviewsCount = Number(revCnt || 0);
    const activeCertificatesCount = Number(certCnt || 0);

    const lastTouch = student.lastActiveAt ?? student.updatedAt ?? student.createdAt;
    const isActiveWithin30Days = Date.now() - lastTouch.getTime() <= 30 * 86_400_000;

    const talentScore = StatsService.computeTalentScore({
      avgRating,
      completedOrders,
      isVerified: Boolean(student.isVerified),
      activeCertificatesCount,
      isActiveWithin30Days
    });

    await db
      .update(users)
      .set({
        statCompletedOrders: completedOrders,
        statAvgRating: avgRating.toFixed(2),
        statReviewsCount: reviewsCount,
        statCertificatesCount: activeCertificatesCount,
        talentScore: talentScore.toFixed(2)
      })
      .where(eq(users.id, userId));

    return {
      completedOrders,
      avgRating,
      reviewsCount,
      activeCertificatesCount,
      talentScore
    };
  }

  static async refreshAllStudents(): Promise<number> {
    const students = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.userType, 'smk'));

    for (const st of students) {
      await StatsService.refreshStudentStats(st.id);
    }
    return students.length;
  }
}

