import { Elysia } from 'elysia';
import { resolveUserFromRequest } from '../middleware/auth';
import { PricingService } from '../services/pricing.service';

export const pricingRoutes = new Elysia({ prefix: '/api/pricing' })
  .get('/benchmark', async ({ request, query, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    if (!currentUser) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu untuk melihat analisis benchmark harga.' };
    }

    const categoryId = Number(query.categoryId);
    if (!Number.isFinite(categoryId) || categoryId <= 0) {
      set.status = 422;
      return { error: 'Parameter categoryId wajib diisi.' };
    }

    const typeRaw = String(query.type || 'product').toLowerCase();
    const type = ['product', 'service', 'portfolio'].includes(typeRaw)
      ? (typeRaw as 'product' | 'service' | 'portfolio')
      : 'product';

    const benchmark = await PricingService.getBenchmark(categoryId, type);
    return {
      benchmark: {
        count: benchmark.sampleCount,
        sampleCount: benchmark.sampleCount,
        minPrice: benchmark.minPrice,
        p25Price: benchmark.p25Price,
        medianPrice: benchmark.medianPrice,
        p75Price: benchmark.p75Price,
        maxPrice: benchmark.maxPrice
      },
      ...benchmark
    };
  });
