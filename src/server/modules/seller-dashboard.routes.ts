import { Elysia } from 'elysia';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db';
import { orders, products, users } from '../db/schema';
import { resolveUserFromRequest } from '../middleware/auth';
import { SellerAnalyticsService } from '../services/seller-analytics.service';

export const sellerDashboardRoutes = new Elysia({ prefix: '/api' })
  .get('/seller/dashboard', async ({ request, query, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    if (!currentUser) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }

    if (currentUser.userType !== 'smk' && !currentUser.isAdmin && currentUser.userType !== 'admin') {
      set.status = 403;
      return { error: 'Dashboard Penjual hanya dapat diakses oleh Siswa SMK.' };
    }

    const periodRaw = String(query.period || '7d').toLowerCase();
    const period = ['7d', '30d', 'all'].includes(periodRaw)
      ? (periodRaw as '7d' | '30d' | 'all')
      : '7d';

    const dashboard = await SellerAnalyticsService.getDashboard(currentUser.id, period);
    return { dashboard };
  })

  .get('/seller/report/csv', async ({ request, query, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    if (!currentUser) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }

    const targetSellerId = Number(query.sellerId) || currentUser.id;

    if (currentUser.id !== targetSellerId) {
      const isAdmin = Boolean(currentUser.isAdmin || currentUser.userType === 'admin');
      if (!isAdmin) {
        if (currentUser.userType === 'teacher' && currentUser.schoolId) {
          const [targetStudent] = await db
            .select({ id: users.id, schoolId: users.schoolId })
            .from(users)
            .where(eq(users.id, targetSellerId))
            .limit(1);

          if (!targetStudent || targetStudent.schoolId !== currentUser.schoolId) {
            set.status = 403;
            return {
              error: 'Akses ditolak. Anda hanya berhak mengunduh laporan PKK siswa dari sekolah Anda sendiri.'
            };
          }
        } else {
          set.status = 403;
          return { error: 'Anda tidak memiliki hak akses untuk mengunduh laporan keuangan siswa lain.' };
        }
      }
    }

    const periodRaw = String(query.period || 'all').toLowerCase();
    const period = ['7d', '30d', 'all'].includes(periodRaw)
      ? (periodRaw as '7d' | '30d' | 'all')
      : 'all';

    const csvContent = await SellerAnalyticsService.generateCsvReport(targetSellerId, period);

    const nowStr = new Date().toISOString().slice(0, 10);
    set.headers['Content-Type'] = 'text/csv; charset=utf-8';
    set.headers['Content-Disposition'] = `attachment; filename="laporan-pkk-siswa-${targetSellerId}-${nowStr}.csv"`;

    return csvContent;
  })

  .get('/teacher/pkk-summary', async ({ request, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    if (!currentUser) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }

    const isTeacher = currentUser.userType === 'teacher';
    const isAdmin = Boolean(currentUser.isAdmin || currentUser.userType === 'admin');

    if (!isTeacher && !isAdmin) {
      set.status = 403;
      return { error: 'Halaman ini khusus untuk Guru Pembimbing SMK.' };
    }

    if (!currentUser.schoolId && !isAdmin) {
      set.status = 400;
      return { error: 'Profil Anda belum terhubung dengan Sekolah SMK manapun.' };
    }

    const schoolCondition = currentUser.schoolId
      ? eq(users.schoolId, currentUser.schoolId)
      : undefined;

    const students = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        major: users.major,
        creatorLevel: users.creatorLevel,
        isVerified: users.isVerified
      })
      .from(users)
      .where(and(eq(users.userType, 'smk'), schoolCondition));

    const studentIds = students.map((s) => s.id);
    if (studentIds.length === 0) {
      return { items: [] };
    }

    // Get orders summary per student
    const studentOrders = await db
      .select({
        sellerId: orders.sellerId,
        agreedPrice: orders.agreedPrice,
        unitCostSnapshot: orders.unitCostSnapshot,
        quantity: orders.quantity,
        status: orders.status
      })
      .from(orders)
      .where(and(inArray(orders.sellerId, studentIds), eq(orders.status, 'completed')));

    const revenueByStudent = new Map<number, { revenue: number; hpp: number; ordersCount: number }>();
    for (const ord of studentOrders) {
      const curr = revenueByStudent.get(ord.sellerId) || { revenue: 0, hpp: 0, ordersCount: 0 };
      const qty = Math.max(1, Number(ord.quantity || 1));
      curr.revenue += Number(ord.agreedPrice || 0);
      curr.hpp += Number(ord.unitCostSnapshot || 0) * qty;
      curr.ordersCount += 1;
      revenueByStudent.set(ord.sellerId, curr);
    }

    // Get works count & TeFa count per student
    const studentWorks = await db
      .select({
        userId: products.userId,
        isTefa: products.isTefa,
        isVerifiedByTeacher: products.isVerifiedByTeacher
      })
      .from(products)
      .where(inArray(products.userId, studentIds));

    const worksByStudent = new Map<number, { totalWorks: number; tefaWorks: number }>();
    for (const w of studentWorks) {
      const curr = worksByStudent.get(w.userId) || { totalWorks: 0, tefaWorks: 0 };
      curr.totalWorks += 1;
      if (w.isTefa || w.isVerifiedByTeacher) {
        curr.tefaWorks += 1;
      }
      worksByStudent.set(w.userId, curr);
    }

    const items = students.map((s) => {
      const fin = revenueByStudent.get(s.id) || { revenue: 0, hpp: 0, ordersCount: 0 };
      const wrk = worksByStudent.get(s.id) || { totalWorks: 0, tefaWorks: 0 };
      const profit = fin.revenue - fin.hpp;

      return {
        id: s.id,
        name: s.name,
        username: s.username,
        major: s.major,
        creatorLevel: s.creatorLevel || 1,
        isVerified: Boolean(s.isVerified),
        completedOrdersCount: fin.ordersCount,
        grossRevenue: fin.revenue,
        totalHppCost: fin.hpp,
        netProfit: profit,
        totalWorks: wrk.totalWorks,
        tefaWorks: wrk.tefaWorks
      };
    });

    return { items };
  });

