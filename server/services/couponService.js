const { db } = require('../config/firebase');

const invalid = (code, reason) => ({ valid: false, code, discount: 0, isFreeDelivery: false, reason });

const couponEndDate = (value) => {
  if (!value) return null;
  // Older date-only values remain valid through their stated expiry day.
  const normalized = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T23:59:59.999`
    : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const couponType = (coupon = {}) => {
  const raw = coupon.type || coupon.discountType || 'fixed';
  return raw === 'flat' ? 'fixed' : raw;
};
const couponValue = (coupon = {}) => Number(coupon.value ?? coupon.discountValue ?? coupon.discount ?? 0) || 0;
const minOrderValue = (coupon = {}) => Number(coupon.minOrderValue ?? coupon.minPurchase ?? coupon.minOrder ?? 0) || 0;
const maxDiscount = (coupon = {}) => Number(coupon.maxDiscountCap ?? coupon.maxDiscount ?? coupon.maxCap ?? 0) || 0;
const userUsageLimit = (coupon = {}) => {
  const raw = coupon.userUsageLimit ?? coupon.maxPerUser;
  // Coupons created by the current admin UI are single-use by default.
  return raw === undefined || raw === null || raw === '' ? 1 : Number(raw);
};

class CouponService {
  async findCouponByCode(cleanCode) {
    if (!db) return null;

    // New coupons use their normalized code as the document id. Keep a legacy
    // query so existing random-id coupon documents keep working.
    const directRef = db.collection('coupons').doc(cleanCode);
    const directSnap = await directRef.get();
    if (directSnap.exists) return { id: directSnap.id, data: directSnap.data() };

    const legacySnap = await db.collection('coupons').where('code', '==', cleanCode).limit(1).get();
    if (legacySnap.empty) return null;
    return { id: legacySnap.docs[0].id, data: legacySnap.docs[0].data() };
  }

  evaluateCoupon(coupon, code, shopId, subtotal) {
    if (!coupon || (coupon.status && coupon.status !== 'active') || coupon.active === false) {
      return invalid(code, `Coupon code '${code}' is currently inactive.`);
    }

    const now = new Date();
    const validFrom = coupon.validFrom ? new Date(coupon.validFrom) : null;
    const validUntil = couponEndDate(coupon.validUntil ?? coupon.expiryDate);
    if (validFrom && !Number.isNaN(validFrom.getTime()) && validFrom > now) {
      return invalid(code, `Coupon code '${code}' is not active yet.`);
    }
    if (validUntil && validUntil < now) return invalid(code, `Coupon code '${code}' has expired.`);
    if (coupon.shopId && shopId && coupon.shopId !== shopId) {
      return invalid(code, `Coupon code '${code}' is not applicable for this store.`);
    }

    const minimum = minOrderValue(coupon);
    if (subtotal < minimum) return invalid(code, `Minimum order subtotal of ₹${minimum} required for coupon '${code}'.`);

    const usageLimit = Number(coupon.usageLimit);
    if (Number.isFinite(usageLimit) && usageLimit > 0 && Number(coupon.usedCount || 0) >= usageLimit) {
      return invalid(code, `Coupon code '${code}' total usage limit has been reached.`);
    }

    const type = couponType(coupon);
    const value = couponValue(coupon);
    let discount = 0;
    let isFreeDelivery = false;
    if (type === 'percentage') {
      discount = Math.round((subtotal * value) / 100);
      const cap = maxDiscount(coupon);
      if (cap > 0) discount = Math.min(discount, cap);
    } else if (type === 'free_delivery') {
      isFreeDelivery = true;
    } else {
      discount = Math.min(subtotal, value);
    }
    return { valid: true, code, type, discount, isFreeDelivery };
  }

  async validateAndApplyCoupon(code, userId, shopId, subtotal) {
    if (!code || typeof code !== 'string') return invalid('', 'Invalid coupon code format.');
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return invalid('', 'Invalid coupon code format.');

    const found = await this.findCouponByCode(cleanCode);
    if (!found) return invalid(cleanCode, `Coupon code '${cleanCode}' is invalid or does not exist.`);
    const result = this.evaluateCoupon(found.data, cleanCode, shopId, Number(subtotal) || 0);
    if (!result.valid) return result;

    // A deterministic redemption document prevents repeat use, unlike a
    // best-effort scan of past orders.
    if (userId && db) {
      const redemptionRef = db.collection('couponRedemptions').doc(`${found.id}_${userId}`);
      const redemptionSnap = await redemptionRef.get();
      const limit = userUsageLimit(found.data);
      if (Number.isFinite(limit) && limit > 0 && Number(redemptionSnap.data()?.redemptionCount || 0) >= limit) {
        return invalid(cleanCode, `You have already used coupon '${cleanCode}' the maximum allowed number of times.`);
      }
    }
    return { ...result, couponId: found.id, coupon: found.data };
  }

  // Reads redemption state before checkout writes. The reservation is committed
  // only after inventory has finished all of its transaction reads.
  async prepareRedemption(transaction, couponResult, userId, shopId, subtotal) {
    if (!couponResult?.valid) return null;
    const couponRef = db.collection('coupons').doc(couponResult.couponId);
    const redemptionRef = db.collection('couponRedemptions').doc(`${couponResult.couponId}_${userId}`);
    const [couponSnap, redemptionSnap] = await Promise.all([
      transaction.get(couponRef),
      transaction.get(redemptionRef)
    ]);
    if (!couponSnap.exists) throw new Error('This coupon is no longer available. Please remove it and try again.');

    const freshCoupon = couponSnap.data();
    const freshResult = this.evaluateCoupon(freshCoupon, couponResult.code, shopId, subtotal);
    if (!freshResult.valid) throw new Error(freshResult.reason);

    const redemptionCount = Number(redemptionSnap.data()?.redemptionCount || 0);
    const limit = userUsageLimit(freshCoupon);
    if (Number.isFinite(limit) && limit > 0 && redemptionCount >= limit) {
      throw new Error(`You have already used coupon '${couponResult.code}' the maximum allowed number of times.`);
    }
    return { couponRef, redemptionRef, freshCoupon, freshResult, redemptionCount };
  }

  commitRedemption(transaction, reservation, userId, orderId, status = 'REDEEMED', expiresAt = null) {
    if (!reservation) return;
    const now = new Date().toISOString();
    transaction.update(reservation.couponRef, {
      usedCount: Number(reservation.freshCoupon.usedCount || 0) + 1,
      updatedAt: now
    });
    transaction.set(reservation.redemptionRef, {
      couponId: reservation.couponRef.id,
      code: reservation.freshResult.code,
      userId,
      redemptionCount: reservation.redemptionCount + 1,
      lastOrderId: orderId,
      lastRedeemedAt: now,
      status,
      reservationExpiresAt: expiresAt,
      updatedAt: now
    }, { merge: true });
  }

  async prepareOrderRedemption(transaction, order) {
    if (!order?.couponId || !order?.userId) return null;
    const couponRef = db.collection('coupons').doc(order.couponId);
    const redemptionRef = db.collection('couponRedemptions').doc(`${order.couponId}_${order.userId}`);
    const [couponSnap, redemptionSnap] = await Promise.all([
      transaction.get(couponRef), transaction.get(redemptionRef)
    ]);
    if (!couponSnap.exists || !redemptionSnap.exists) return null;
    const redemption = redemptionSnap.data();
    if (redemption.lastOrderId !== order.orderId && redemption.lastOrderId !== order.id) return null;
    return { couponRef, redemptionRef, coupon: couponSnap.data(), redemption };
  }

  confirmReservedRedemption(transaction, prepared) {
    if (!prepared || prepared.redemption.status !== 'RESERVED') return;
    const now = new Date().toISOString();
    transaction.set(prepared.redemptionRef, {
      status: 'REDEEMED', lastRedeemedAt: now, reservationExpiresAt: null, updatedAt: now
    }, { merge: true });
  }

  releaseReservedRedemption(transaction, prepared, reason = 'PAYMENT_NOT_COMPLETED') {
    if (!prepared || prepared.redemption.status !== 'RESERVED') return;
    const now = new Date().toISOString();
    transaction.update(prepared.couponRef, {
      usedCount: Math.max(0, Number(prepared.coupon.usedCount || 0) - 1), updatedAt: now
    });
    transaction.set(prepared.redemptionRef, {
      redemptionCount: Math.max(0, Number(prepared.redemption.redemptionCount || 0) - 1),
      status: 'RELEASED', releasedReason: reason, releasedAt: now,
      reservationExpiresAt: null, updatedAt: now
    }, { merge: true });
  }
}

module.exports = new CouponService();
