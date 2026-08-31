// H-3 fix: single shared OrderStatus definition.
//
// Previously the codebase wrote/compared order status using two different
// casing conventions for what were conceptually the same states
// (e.g. 'accepted' vs 'RIDER_ASSIGNED', 'ready_for_pickup' vs
// 'ARRIVED_AT_SHOP'), sometimes within the same function, with `as any`
// casts papering over the resulting type mismatches. That is a real
// correctness gap, not a style issue: if the Customer/Shopkeeper/Admin apps
// (not in this archive) key off one convention, writes made in the other
// convention silently fail to trigger the right UI/timeline/notification on
// those apps.
//
// Going forward, the rider app WRITES only the canonical UPPER_SNAKE_CASE
// values below (see updateOrderStatus call sites in AppContext.tsx). This
// file's `normalizeOrderStatus` helper exists only to defensively READ
// legacy/lowercase values that may already exist in Firestore from before
// this fix, or that another app not covered by this codebase might still
// write — it is not a license to write non-canonical values.

export type OrderStatus =
  | 'PLACED'
  | 'SHOP_ACCEPTED'
  | 'SEARCHING_RIDER'
  | 'RIDER_ASSIGNED'
  | 'ARRIVED_AT_SHOP'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'SHOP_REJECTED'
  | 'CANCELLED';

/** Legacy/alternate spellings this codebase has been seen to read or write, mapped to the canonical value. */
const LEGACY_STATUS_MAP: Record<string, OrderStatus> = {
  placed: 'PLACED',
  order_placed: 'PLACED',
  confirmed: 'SHOP_ACCEPTED',
  shop_accepted: 'SHOP_ACCEPTED',
  preparing: 'SEARCHING_RIDER',
  searching_rider: 'SEARCHING_RIDER',
  accepted: 'RIDER_ASSIGNED',
  assigned: 'RIDER_ASSIGNED',
  rider_assigned: 'RIDER_ASSIGNED',
  ready_for_pickup: 'SEARCHING_RIDER',
  ready: 'SEARCHING_RIDER',
  arrived_at_shop: 'ARRIVED_AT_SHOP',
  rider_picked_up: 'PICKED_UP',
  picked_up: 'PICKED_UP',
  out_for_delivery: 'OUT_FOR_DELIVERY',
  delivered: 'DELIVERED',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
  canceled: 'CANCELLED',
  returned: 'CANCELLED',
  shop_rejected: 'SHOP_REJECTED'
};

/** Normalizes any historical/legacy-cased status string to the canonical OrderStatus. Safe to call on already-canonical values (no-op). */
export function normalizeOrderStatus(raw: string | undefined | null): OrderStatus | null {
  if (!raw) return null;
  const upper = raw.toUpperCase();
  const canonicalSet: OrderStatus[] = [
    'PLACED', 'SHOP_ACCEPTED', 'SEARCHING_RIDER', 'RIDER_ASSIGNED', 'ARRIVED_AT_SHOP',
    'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'SHOP_REJECTED', 'CANCELLED'
  ];
  if ((canonicalSet as string[]).includes(upper)) return upper as OrderStatus;
  return LEGACY_STATUS_MAP[raw.toLowerCase()] ?? null;
}

/** True if `raw` normalizes to any of the given canonical statuses. */
export function isOrderStatus(raw: string | undefined | null, ...targets: OrderStatus[]): boolean {
  const normalized = normalizeOrderStatus(raw);
  return normalized !== null && targets.includes(normalized);
}
