import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { products } from '../db/schema';

export type MarginStatus = 'loss' | 'thin' | 'healthy' | 'premium' | 'neutral';

export interface MarginAnalysis {
  profit: number;
  marginPercent: number;
  status: MarginStatus;
  statusLabel: string;
  advice: string;
}

export interface PricingBenchmark {
  sampleCount: number;
  minPrice: number;
  p25Price: number;
  medianPrice: number;
  p75Price: number;
  maxPrice: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return Math.round(sorted[lower] * (1 - weight) + sorted[upper] * weight);
}

export class PricingService {
  /**
   * Evaluates profit margin health between cost price (HPP) and selling price.
   */
  static analyzeMargin(costPrice: number, sellingPrice: number): MarginAnalysis {
    const cost = Math.max(0, Number(costPrice) || 0);
    const selling = Math.max(0, Number(sellingPrice) || 0);

    if (cost <= 0 || selling <= 0) {
      return {
        profit: 0,
        marginPercent: 0,
        status: 'neutral',
        statusLabel: 'Belum Dihitung',
        advice: 'Masukkan harga modal (HPP) dan harga jual untuk melihat evaluasi keuntungan.'
      };
    }

    const profit = selling - cost;
    const marginPercent = Math.round((profit / selling) * 1000) / 10;

    if (selling <= cost) {
      return {
        profit,
        marginPercent,
        status: 'loss',
        statusLabel: 'Berpotensi Rugi',
        advice: 'Harga jual lebih rendah atau sama dengan modal pokok (HPP). Naikkan harga agar tidak merugi.'
      };
    }

    if (marginPercent < 15) {
      return {
        profit,
        marginPercent,
        status: 'thin',
        statusLabel: 'Margin Tipis (< 15%)',
        advice: 'Margin keuntungan sangat tipis. Rawan rugi jika terjadi kenaikan harga bahan baku atau kendala tak terduga.'
      };
    }

    if (marginPercent <= 55) {
      return {
        profit,
        marginPercent,
        status: 'healthy',
        statusLabel: 'Margin Sehat & Kompetitif (15%–55%)',
        advice: 'Margin ideal untuk standar produk kejuruan SMK & UMKM. Keuntungan memadai dan harga tetap bersaing di pasar.'
      };
    }

    return {
      profit,
      marginPercent,
      status: 'premium',
      statusLabel: 'Margin Premium (> 55%)',
      advice: 'Margin tinggi / bernilai tambah tinggi. Pastikan karya disertai portofolio meyakinkan, garansi, atau nilai tambah istimewa.'
    };
  }

  /**
   * Retrieves category price benchmark (min, p25, median, p75, max) across published works.
   */
  static async getBenchmark(
    categoryId: number,
    type: 'product' | 'service' | 'portfolio' = 'product'
  ): Promise<PricingBenchmark> {
    const rows = await db
      .select({ price: products.price })
      .from(products)
      .where(
        and(
          eq(products.categoryId, categoryId),
          eq(products.type, type),
          eq(products.status, 'published')
        )
      );

    const prices = rows
      .map((r) => Number(r.price))
      .filter((p) => p > 0)
      .sort((a, b) => a - b);

    if (prices.length === 0) {
      return {
        sampleCount: 0,
        minPrice: 0,
        p25Price: 0,
        medianPrice: 0,
        p75Price: 0,
        maxPrice: 0
      };
    }

    return {
      sampleCount: prices.length,
      minPrice: prices[0],
      p25Price: percentile(prices, 0.25),
      medianPrice: percentile(prices, 0.5),
      p75Price: percentile(prices, 0.75),
      maxPrice: prices[prices.length - 1]
    };
  }
}

