export function formatRupiah(amount: number | null | undefined): string {
  const num = Number(amount || 0);
  return 'Rp ' + Math.round(num).toLocaleString('id-ID');
}

export function formatDateId(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return 'Baru saja';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} hari lalu`;
  return formatDateId(iso);
}

export interface SavedGuestOrder {
  orderCode: string;
  trackPath: string;
  postName: string;
  sellerName: string;
  formattedPrice: string;
  createdAt: string;
}

const GUEST_ORDERS_KEY = 'voc_recent_orders_v1';

export function getSavedGuestOrders(): SavedGuestOrder[] {
  try {
    const raw = localStorage.getItem(GUEST_ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGuestOrderBookmark(entry: SavedGuestOrder): void {
  try {
    const current = getSavedGuestOrders().filter((o) => o.orderCode !== entry.orderCode);
    current.unshift(entry);
    localStorage.setItem(GUEST_ORDERS_KEY, JSON.stringify(current.slice(0, 15)));
  } catch {
    // Ignore storage quota errors
  }
}

