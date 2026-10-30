import { Elysia } from 'elysia';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { regions, subdistricts } from '../db/schema';
import { GeoService } from '../services/geo.service';
import { checkRateLimit, getClientIp } from '../middleware/rate-limit';

export const locationRoutes = new Elysia({ prefix: '/api' })
  .get('/subdistricts', async ({ query }) => {
    const regionId = Number(query.regionId);

    const baseQuery = db
      .select({
        id: subdistricts.id,
        name: subdistricts.name,
        latitude: subdistricts.latitude,
        longitude: subdistricts.longitude,
        regionId: subdistricts.regionId,
        regionName: regions.name
      })
      .from(subdistricts)
      .innerJoin(regions, eq(subdistricts.regionId, regions.id));

    const items = Number.isFinite(regionId) && regionId > 0
      ? await baseQuery.where(eq(subdistricts.regionId, regionId))
      : await baseQuery;

    return {
      items: items.map((s) => ({
        id: s.id,
        name: s.name,
        latitude: Number(s.latitude),
        longitude: Number(s.longitude),
        regionId: s.regionId,
        regionName: s.regionName
      }))
    };
  })

  .get('/location/detect', async ({ request, query, set }) => {
    const ip = getClientIp(request);
    const rl = checkRateLimit('location_detect', ip, 60, 60_000);
    if (!rl.allowed) {
      set.status = 429;
      return { error: 'Terlalu banyak permintaan deteksi lokasi. Coba beberapa saat lagi.' };
    }

    const lat = Number(query.lat);
    const lng = Number(query.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      set.status = 422;
      return { error: 'Koordinat lintang (lat) dan bujur (lng) tidak valid.' };
    }

    const nearest = await GeoService.findNearestSubdistrict(lat, lng);
    if (!nearest) {
      set.status = 404;
      return { error: 'Tidak dapat menemukan kecamatan terdekat dari koordinat tersebut.' };
    }

    return {
      subdistrict: {
        id: nearest.subdistrictId,
        name: nearest.subdistrictName,
        regionId: nearest.regionId,
        regionName: nearest.regionName,
        distanceKm: nearest.distanceKm
      },
      subdistrictId: nearest.subdistrictId,
      subdistrictName: nearest.subdistrictName,
      regionId: nearest.regionId,
      regionName: nearest.regionName,
      distanceKm: nearest.distanceKm
    };
  })

  .post('/location/detect', async ({ request, body, set }) => {
    const ip = getClientIp(request);
    const rl = checkRateLimit('location_detect', ip, 60, 60_000);
    if (!rl.allowed) {
      set.status = 429;
      return { error: 'Terlalu banyak permintaan deteksi lokasi. Coba beberapa saat lagi.' };
    }

    const data = (body ?? {}) as Record<string, unknown>;
    const lat = Number(data.lat);
    const lng = Number(data.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      set.status = 422;
      return { error: 'Koordinat lintang (lat) dan bujur (lng) tidak valid.' };
    }

    const nearest = await GeoService.findNearestSubdistrict(lat, lng);
    if (!nearest) {
      set.status = 404;
      return { error: 'Tidak dapat menemukan kecamatan terdekat dari koordinat tersebut.' };
    }

    return {
      subdistrict: {
        id: nearest.subdistrictId,
        name: nearest.subdistrictName,
        regionId: nearest.regionId,
        regionName: nearest.regionName,
        distanceKm: nearest.distanceKm
      },
      subdistrictId: nearest.subdistrictId,
      subdistrictName: nearest.subdistrictName,
      regionId: nearest.regionId,
      regionName: nearest.regionName,
      distanceKm: nearest.distanceKm
    };
  });
