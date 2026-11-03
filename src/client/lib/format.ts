export { formatRupiah, formatDateId, formatRelativeTime } from '../../shared/format';

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
