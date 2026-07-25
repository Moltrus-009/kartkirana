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
export const PER_DELIVERY_FEE = 45;

/** Extra bonus paid per batch for accepting a multi-order route, in ₹. */
export const BATCH_BONUS = 15;

/** Maximum number of orders that can be combined into one Smart Batch. */
export const MAX_BATCH_SIZE = 2;
