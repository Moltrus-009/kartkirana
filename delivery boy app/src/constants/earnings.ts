// Single source of truth for rider payout and batching constants.
//
// M-1 fix (partial): previously the ₹45-per-delivery figure was a magic
// number hardcoded independently in at least 3 places (todayEarnings
// calculation, batch totalEarnings calculation, and the demo mock-order
// generator), which is how they can silently drift out of sync. This
// doesn't fully resolve M-1 — a real backend/pricing-engine value should
// ultimately be the source of truth for what a rider is paid, since payout
// figures materially affect trust and shouldn't live in a client bundle a
// rider can inspect — but centralizing to one constant removes the
// duplication risk today and gives you exactly one place to point at a real
// API response once the backend exposes one.
//
// M-3 fix: the brief (Section 5) calls for a defined maximum batch size;
// this is that named constant, used everywhere batches are created or
// validated instead of a bare `2`.

/** Base payout per single delivery, in ₹. */
export const PER_DELIVERY_FEE = 10;

/** Payout for each additional delivered order after the first in a batch. */
export const BATCH_BONUS = 6;

export const batchPayout = (count: number) => count > 0 ? PER_DELIVERY_FEE + (count - 1) * BATCH_BONUS : 0;

type PayoutOrder = { id: string; batchId?: string | null; status?: string; createdAt: string; timeline?: { status: string; timestamp: string }[] };
// Credit ₹10 to the first completed delivery; later deliveries in the same batch earn ₹6.
// Use all history before filtering by day/week so a batch crossing midnight is not paid twice.
export function riderPayout(order: PayoutOrder, history: PayoutOrder[] = []) {
  if (['CANCELLED', 'SHOP_REJECTED'].includes(String(order.status).toUpperCase())) return 0;
  if (!order.batchId) return PER_DELIVERY_FEE;
  const completed = history.filter(item => item.batchId === order.batchId &&
    ['DELIVERED', 'COMPLETED'].includes(String(item.status).toUpperCase()));
  if (!completed.some(item => item.id === order.id)) completed.push(order);
  completed.sort((a, b) => (completionTime(a) - completionTime(b)) || a.id.localeCompare(b.id));
  return completed[0].id === order.id ? PER_DELIVERY_FEE : BATCH_BONUS;
}

export function completionTime(order: { createdAt: string; timeline?: { status: string; timestamp: string }[] }) {
  const event = [...(order.timeline || [])].reverse().find(entry =>
    ['DELIVERED', 'COMPLETED'].includes(entry.status.toUpperCase()));
  return new Date(event?.timestamp || order.createdAt).getTime();
}

/** Maximum number of orders that can be combined into one Smart Batch. */
export const MIN_BATCH_SIZE = 2;
export const MAX_BATCH_SIZE = 3;

/** Maximum straight-line spread between any two delivery points in a batch. */
export const MAX_BATCH_SPREAD_METERS = 1500;
