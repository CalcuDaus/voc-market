import { apiFetch } from './api';

export interface LocationStateData {
  subdistrictId: number | null;
  subdistrictName: string | null;
  regionId: number | null;
  regionName: string | null;
  lat: number | null;
  lng: number | null;
}

const STORAGE_KEY = 'voc_visitor_location';

class LocationStore {
  subdistrictId = $state<number | null>(null);
  subdistrictName = $state<string | null>(null);
  regionId = $state<number | null>(null);
  regionName = $state<string | null>(null);
  lat = $state<number | null>(null);
  lng = $state<number | null>(null);
  detecting = $state<boolean>(false);
  error = $state<string | null>(null);

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as LocationStateData;
          this.subdistrictId = parsed.subdistrictId ?? null;
          this.subdistrictName = parsed.subdistrictName ?? null;
          this.regionId = parsed.regionId ?? null;
          this.regionName = parsed.regionName ?? null;
          this.lat = parsed.lat ?? null;
          this.lng = parsed.lng ?? null;
        }
      } catch {
        // ignore parse error
      }
    }
  }

  private persist() {
    if (typeof window === 'undefined') return;
    try {
      const data: LocationStateData = {
        subdistrictId: this.subdistrictId,
        subdistrictName: this.subdistrictName,
        regionId: this.regionId,
        regionName: this.regionName,
        lat: this.lat,
        lng: this.lng
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }

  get isActive(): boolean {
    return this.subdistrictId !== null;
  }

  get displayLabel(): string {
    if (this.subdistrictName && this.regionName) {
      return `Kec. ${this.subdistrictName}, ${this.regionName}`;
    }
    if (this.subdistrictName) {
      return `Kec. ${this.subdistrictName}`;
    }
    return 'Dekat Saya';
  }

  async detectGps(): Promise<boolean> {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      this.error = 'Browser Anda tidak mendukung deteksi lokasi GPS.';
      return false;
    }

    this.detecting = true;
    this.error = null;

    return new Promise<boolean>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          try {
            const res = await apiFetch<{
              subdistrict: {
                id: number;
                name: string;
                regionId: number;
                regionName: string;
                distanceKm: number;
              };
            }>(`/api/location/detect?lat=${lat}&lng=${lng}`);

            if (res.ok && res.data?.subdistrict) {
              const sub = res.data.subdistrict;
              this.subdistrictId = sub.id;
              this.subdistrictName = sub.name;
              this.regionId = sub.regionId;
              this.regionName = sub.regionName;
              this.lat = lat;
              this.lng = lng;
              this.persist();
              this.detecting = false;
              resolve(true);
            } else {
              this.error = 'Gagal mencocokkan kecamatan terdekat.';
              this.detecting = false;
              resolve(false);
            }
          } catch {
            this.error = 'Terjadi kesalahan jaringan saat mendeteksi lokasi.';
            this.detecting = false;
            resolve(false);
          }
        },
        (err) => {
          this.detecting = false;
          if (err.code === err.PERMISSION_DENIED) {
            this.error = 'Izin akses lokasi GPS ditolak oleh pengguna.';
          } else {
            this.error = 'Tidak dapat mendeteksi posisi GPS saat ini.';
          }
          resolve(false);
        },
        { timeout: 10000, enableHighAccuracy: false }
      );
    });
  }

  setSubdistrict(sub: {
    id: number;
    name: string;
    regionId?: number | null;
    regionName?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  }) {
    this.subdistrictId = sub.id;
    this.subdistrictName = sub.name;
    this.regionId = sub.regionId ?? null;
    this.regionName = sub.regionName ?? null;
    this.lat = sub.latitude ?? null;
    this.lng = sub.longitude ?? null;
    this.error = null;
    this.persist();
  }

  clear() {
    this.subdistrictId = null;
    this.subdistrictName = null;
    this.regionId = null;
    this.regionName = null;
    this.lat = null;
    this.lng = null;
    this.error = null;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }
}

export const locationStore = new LocationStore();

