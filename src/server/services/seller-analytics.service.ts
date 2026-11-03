import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  orders,
  productDailyStats,
  products,
  reviews,
  users
} from '../db/schema';
import { PricingService } from './pricing.service';
import { BadgeService, type UserLevelEvaluation } from './badge.service';
import { formatDateId, formatRupiah } from '../../shared/format';

export interface SellerSmartTip {
  type: 'action' | 'warning' | 'success' | 'info';
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface WorkPerformanceItem {
  id: number;
  name: string;
  type: 'product' | 'service' | 'portfolio';
  price: number;
  costPrice: number;
  unitProfit: number;
  marginStatus: string;
  views: number;
  shares: number;
  completedOrders: number;
  conversionRate: number;
}

export interface SellerDashboardData {
  summary: {
    grossRevenue: number;
    totalHppCost: number;
    netProfit: number;
    avgMarginPercent: number;
    completedOrdersCount: number;
    activeOrdersCount: number;
    totalViews: number;
    totalShares: number;
    conversionRatePercent: number;
  };
  dailySeries: {
    date: string;
    views: number;
    shares: number;
    orders: number;
  }[];
  smartTips: SellerSmartTip[];
  worksPerformance: WorkPerformanceItem[];
  levelProgress: UserLevelEvaluation;
}

export class SellerAnalyticsService {
  /**
   * Builds full dashboard analytics for a seller.
   */
  static async getDashboard(
    userId: number,
    period: '7d' | '30d' | 'all' = '7d'
  ): Promise<SellerDashboardData> {
    const daysLimit = period === '7d' ? 7 : period === '30d' ? 30 : 365;
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - daysLimit);
    const sinceDateStr = sinceDate.toISOString().slice(0, 10);

    // 1. Fetch user's orders
    const allUserOrders = await db
      .select({
        id: orders.id,
        orderCode: orders.orderCode,
        productId: orders.productId,
        quantity: orders.quantity,
        agreedPrice: orders.agreedPrice,
        unitCostSnapshot: orders.unitCostSnapshot,
        status: orders.status,
        completedAt: orders.completedAt,
        createdAt: orders.createdAt
      })
      .from(orders)
      .where(eq(orders.sellerId, userId));

    const completedOrders = allUserOrders.filter(
      (o) =>
        o.status === 'completed' &&
        (period === 'all' || (o.completedAt && o.completedAt >= sinceDate))
    );

    const activeOrders = allUserOrders.filter((o) =>
      ['requested', 'accepted', 'in_progress'].includes(o.status)
    );

    let grossRevenue = 0;
    let totalHppCost = 0;

    for (const ord of completedOrders) {
      grossRevenue += Number(ord.agreedPrice || 0);
      const qty = Math.max(1, Number(ord.quantity || 1));
      totalHppCost += Number(ord.unitCostSnapshot || 0) * qty;
    }

    const netProfit = grossRevenue - totalHppCost;
    const avgMarginPercent =
      grossRevenue > 0 ? Math.round((netProfit / grossRevenue) * 1000) / 10 : 0;

    // 2. Fetch user's products
    const userProducts = await db
      .select()
      .from(products)
      .where(eq(products.userId, userId))
      .orderBy(desc(products.viewsCount));

    const productIds = userProducts.map((p) => p.id);

    let totalViews = 0;
    let totalShares = 0;
    for (const p of userProducts) {
      totalViews += Number(p.viewsCount || 0);
      totalShares += Number(p.sharesCount || 0);
    }

    const completedOrdersCount = completedOrders.length;
    const conversionRatePercent =
      totalViews > 0
        ? Math.round((completedOrdersCount / totalViews) * 1000) / 10
        : 0;

    // 3. Fetch product daily stats for the period
    const dailyMap = new Map<string, { views: number; shares: number; orders: number }>();

    // Pre-populate days
    for (let i = daysLimit - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      dailyMap.set(dateStr, { views: 0, shares: 0, orders: 0 });
    }

    if (productIds.length > 0) {
      const statsRows = await db
        .select({
          statDate: productDailyStats.statDate,
          views: sql<number>`SUM(${productDailyStats.views})`,
          shares: sql<number>`SUM(${productDailyStats.shares})`,
          orders: sql<number>`SUM(${productDailyStats.ordersCreated})`
        })
        .from(productDailyStats)
        .where(
          and(
            inArray(productDailyStats.productId, productIds),
            gte(productDailyStats.statDate, sinceDateStr)
          )
        )
        .groupBy(productDailyStats.statDate);

      for (const row of statsRows) {
        if (dailyMap.has(row.statDate)) {
          dailyMap.set(row.statDate, {
            views: Number(row.views || 0),
            shares: Number(row.shares || 0),
            orders: Number(row.orders || 0)
          });
        }
      }
    }

    const dailySeries = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      ...data
    }));

    // 4. Works performance breakdown
    const orderCountByProduct = new Map<number, number>();
    for (const ord of completedOrders) {
      if (ord.productId) {
        orderCountByProduct.set(
          ord.productId,
          (orderCountByProduct.get(ord.productId) || 0) + 1
        );
      }
    }

    const worksPerformance: WorkPerformanceItem[] = userProducts.map((p) => {
      const unitProfit = Math.max(0, Number(p.price) - Number(p.costPrice));
      const marginAnalysis = PricingService.analyzeMargin(p.costPrice, p.price);
      const ordersCount = orderCountByProduct.get(p.id) || 0;
      const convRate =
        p.viewsCount > 0
          ? Math.round((ordersCount / p.viewsCount) * 1000) / 10
          : 0;

      return {
        id: p.id,
        name: p.name,
        type: p.type,
        price: p.price,
        costPrice: p.costPrice,
        unitProfit,
        marginStatus: marginAnalysis.status,
        views: p.viewsCount,
        shares: p.sharesCount,
        completedOrders: ordersCount,
        conversionRate: convRate
      };
    });

    // 5. Smart Tips generation
    const smartTips: SellerSmartTip[] = [];

    if (activeOrders.length > 0) {
      smartTips.push({
        type: 'action',
        title: 'Pesanan Aktif Menunggu Respons',
        message: `Ada ${activeOrders.length} pesanan yang sedang berjalan. Perbarui progres atau unggah bukti untuk menjaga kepuasan pembeli.`,
        actionUrl: '/pesanan-masuk',
        actionLabel: 'Buka Meja Pesanan'
      });
    }

    const hasUnsetHpp = userProducts.some(
      (p) => p.type !== 'portfolio' && (!p.costBreakdown || p.costPrice === 0)
    );
    if (hasUnsetHpp && smartTips.length < 2) {
      smartTips.push({
        type: 'warning',
        title: 'Lengkapi Kalkulasi Modal (HPP)',
        message:
          'Beberapa karya belum memiliki rincian HPP. Lengkapi modal bahan baku & tenaga kerja agar laba bersih tercatat rapi di buku kas PKK.',
        actionUrl: '/jual',
        actionLabel: 'Atur HPP Karya'
      });
    }

    if (totalViews < 15 && smartTips.length < 2) {
      smartTips.push({
        type: 'info',
        title: 'Tingkatkan Pengunjung via WhatsApp',
        message:
          'Gunakan Kit Promosi di halaman karya untuk membagikan tautan berpratinjau visual resmi ke grup alumni atau keluarga.',
        actionUrl: '/',
        actionLabel: 'Pilih Karya untuk Promosi'
      });
    }

    if (avgMarginPercent >= 20 && completedOrdersCount >= 3 && smartTips.length < 2) {
      smartTips.push({
        type: 'success',
        title: 'Pengelolaan Usaha Sangat Sehat!',
        message: `Margin keuntungan Anda berada di angka ${avgMarginPercent}%. Pertahankan kualitas karya dan ketepatan waktu pengiriman.`,
        actionUrl: '/dashboard-penjual/cetak',
        actionLabel: 'Cetak Laporan PKK'
      });
    }

    // 6. Level progress & Badges
    const levelProgress = await BadgeService.evaluateUser(userId);

    return {
      summary: {
        grossRevenue,
        totalHppCost,
        netProfit,
        avgMarginPercent,
        completedOrdersCount,
        activeOrdersCount: activeOrders.length,
        totalViews,
        totalShares,
        conversionRatePercent
      },
      dailySeries,
      smartTips: smartTips.slice(0, 2),
      worksPerformance,
      levelProgress
    };
  }

  /**
   * Generates Microsoft Excel compatible CSV with UTF-8 BOM.
   */
  static async generateCsvReport(
    sellerId: number,
    period: '7d' | '30d' | 'all' = 'all'
  ): Promise<string> {
    const daysLimit = period === '7d' ? 7 : period === '30d' ? 30 : 3650;
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - daysLimit);

    const rows = await db
      .select({
        orderCode: orders.orderCode,
        completedAt: orders.completedAt,
        buyerName: orders.buyerName,
        quantity: orders.quantity,
        agreedPrice: orders.agreedPrice,
        unitCostSnapshot: orders.unitCostSnapshot,
        productName: products.name
      })
      .from(orders)
      .leftJoin(products, eq(orders.productId, products.id))
      .where(
        and(
          eq(orders.sellerId, sellerId),
          eq(orders.status, 'completed'),
          gte(orders.createdAt, sinceDate)
        )
      )
      .orderBy(desc(orders.completedAt));

    const escapeCsv = (val: unknown) => {
      const str = String(val ?? '').replace(/"/g, '""');
      return `"${str}"`;
    };

    const lines: string[] = [];

    // Header
    lines.push(
      [
        'No',
        'Kode Pesanan',
        'Tanggal Selesai',
        'Nama Pelanggan',
        'Nama Karya / Jasa',
        'Jumlah',
        'Harga Sepakat (Rp)',
        'Modal Pokok HPP (Rp)',
        'Laba Bersih (Rp)',
        'Status'
      ].join(',')
    );

    let totalRevenue = 0;
    let totalHpp = 0;

    rows.forEach((row, idx) => {
      const qty = Math.max(1, Number(row.quantity || 1));
      const price = Number(row.agreedPrice || 0);
      const hpp = Number(row.unitCostSnapshot || 0) * qty;
      const profit = price - hpp;

      totalRevenue += price;
      totalHpp += hpp;

      lines.push(
        [
          idx + 1,
          escapeCsv(row.orderCode),
          escapeCsv(formatDateId(row.completedAt ? row.completedAt.toISOString() : null)),
          escapeCsv(row.buyerName),
          escapeCsv(row.productName || 'Pesanan Permintaan Jasa'),
          qty,
          price,
          hpp,
          profit,
          escapeCsv('Selesai')
        ].join(',')
      );
    });

    const totalProfit = totalRevenue - totalHpp;

    // Summary row
    lines.push('');
    lines.push(
      [
        escapeCsv('TOTAL'),
        '',
        '',
        '',
        '',
        '',
        totalRevenue,
        totalHpp,
        totalProfit,
        ''
      ].join(',')
    );

    // Return with UTF-8 BOM so Excel opens cleanly on Windows
    return '\uFEFF' + lines.join('\r\n');
  }
}

