import { eq, sql, type SQL } from 'drizzle-orm';
import { db } from '../db';
import { regions, subdistricts } from '../db/schema';

export interface NearestSubdistrictResult {
  subdistrictId: number;
  subdistrictName: string;
  regionId: number;
  regionName: string;
  distanceKm: number;
}

export class GeoService {
  /**
   * Earth radius in kilometers
   */
  static readonly EARTH_RADIUS_KM = 6371;

  /**
   * Calculates Haversine distance in kilometers between two coordinates.
   */
  static haversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return GeoService.EARTH_RADIUS_KM * c;
  }

  /**
   * Builds SQL Haversine formula expression relative to a origin (lat0, lng0).
   */
  static sqlHaversine(
    lat0: number,
    lng0: number,
    latCol: string | SQL = 'subdistricts.latitude',
    lngCol: string | SQL = 'subdistricts.longitude'
  ): SQL<number> {
    return sql<number>`(6371 * acos(least(1.0, greatest(-1.0, cos(radians(${lat0})) * cos(radians(${latCol})) * cos(radians(${lngCol}) - radians(${lng0})) + sin(radians(${lat0})) * sin(radians(${latCol}))))))`;
  }

  /**
   * Detects the nearest subdistrict based on visitor's browser GPS coordinates.
   * Coordinate is processed only in-memory and NEVER stored in the database.
   */
  static async findNearestSubdistrict(
    lat: number,
    lng: number
  ): Promise<NearestSubdistrictResult | null> {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    const items = await db
      .select({
        subdistrictId: subdistricts.id,
        subdistrictName: subdistricts.name,
        latitude: subdistricts.latitude,
        longitude: subdistricts.longitude,
        regionId: regions.id,
        regionName: regions.name
      })
      .from(subdistricts)
      .innerJoin(regions, eq(subdistricts.regionId, regions.id));

    if (items.length === 0) return null;

    let closest: (typeof items)[0] | null = null;
    let minDistance = Infinity;

    for (const item of items) {
      const d = GeoService.haversineDistance(
        lat,
        lng,
        Number(item.latitude),
        Number(item.longitude)
      );
      if (d < minDistance) {
        minDistance = d;
        closest = item;
      }
    }

    if (!closest) return null;

    return {
      subdistrictId: closest.subdistrictId,
      subdistrictName: closest.subdistrictName,
      regionId: closest.regionId,
      regionName: closest.regionName,
      distanceKm: Math.round(minDistance * 10) / 10
    };
  }

  /**
   * Formats distance label according to distance and service area type.
   */
  static formatDistanceLabel(
    distanceKm: number | null | undefined,
    serviceAreaType?: 'onsite' | 'workshop' | 'delivery' | 'digital' | null
  ): string {
    if (serviceAreaType === 'digital') {
      return 'Layanan Online (Seluruh Indonesia)';
    }

    if (distanceKm === null || distanceKm === undefined || !Number.isFinite(distanceKm)) {
      return '';
    }

    if (distanceKm < 1) {
      return 'Satu kecamatan dengan Anda';
    }

    return `± ${distanceKm.toFixed(1).replace('.', ',')} km`;
  }
}

