const { db } = require('../config/firebase');

class CouponService {
  /**
   * Validate and calculate discount for a coupon code
   * @param {string} code - Coupon code string
   * @param {string} userId - User UID
   * @param {string} shopId - Shop ID
   * @param {number} subtotal - Subtotal amount in INR
   * @returns {Promise<{ valid: boolean, code: string, type?: string, discount: number, isFreeDelivery: boolean, reason?: string, coupon?: any }>}
   */
  async validateAndApplyCoupon(code, userId, shopId, subtotal) {
    if (!code || typeof code !== 'string') {
      return { valid: false, code: '', discount: 0, isFreeDelivery: false, reason: 'Invalid coupon code format.' };
    }

    const cleanCode = code.trim().toUpperCase();

    // 1. Fetch coupon document by code or query
    let couponData = null;
    let couponId = null;

    if (db) {
      try {
        const snap = await db.collection('coupons').where('code', '==', cleanCode).limit(1).get();
        if (!snap.empty) {
          const doc = snap.docs[0];
          couponId = doc.id;
          couponData = doc.data();
        }
      } catch (err) {
        console.warn(`[COUPON SERVICE] Firestore query warning for code ${cleanCode}:`, err.message);
      }
    }

    // Fallback/Built-in promotion rules if document is not created in Firestore yet
    if (!couponData) {
      const BUILTIN_COUPONS = {
        'FLAT50': { code: 'FLAT50', type: 'fixed', value: 50, minOrderValue: 150, maxDiscountCap: 50, status: 'active' },
        'SAVE20': { code: 'SAVE20', type: 'percentage', value: 20, minOrderValue: 200, maxDiscountCap: 100, status: 'active' },
        'FREEDEL': { code: 'FREEDEL', type: 'free_delivery', value: 0, minOrderValue: 100, status: 'active' },
        'WELCOME100': { code: 'WELCOME100', type: 'fixed', value: 100, minOrderValue: 300, maxDiscountCap: 100, status: 'active' }
      };

      if (BUILTIN_COUPONS[cleanCode]) {
        couponData = BUILTIN_COUPONS[cleanCode];
        couponId = cleanCode;
      } else {
        return { valid: false, code: cleanCode, discount: 0, isFreeDelivery: false, reason: `Coupon code '${cleanCode}' is invalid or does not exist.` };
      }
    }

    // 2. Status Check
    if (couponData.status !== 'active' && couponData.active !== true && couponData.status !== undefined) {
      return { valid: false, code: cleanCode, discount: 0, isFreeDelivery: false, reason: `Coupon code '${cleanCode}' is currently inactive.` };
    }

    // 3. Validity Period Check
    const now = new Date();
    if (couponData.validFrom && new Date(couponData.validFrom) > now) {
      return { valid: false, code: cleanCode, discount: 0, isFreeDelivery: false, reason: `Coupon code '${cleanCode}' is not active yet.` };
    }
    if (couponData.validUntil && new Date(couponData.validUntil) < now) {
      return { valid: false, code: cleanCode, discount: 0, isFreeDelivery: false, reason: `Coupon code '${cleanCode}' has expired.` };
    }

    // 4. Shop-Specific Restriction Check
    if (couponData.shopId && shopId && couponData.shopId !== shopId) {
      return { valid: false, code: cleanCode, discount: 0, isFreeDelivery: false, reason: `Coupon code '${cleanCode}' is not applicable for this store.` };
    }

    // 5. Minimum Order Value Check
    const minOrder = Number(couponData.minOrderValue || couponData.minOrder) || 0;
    if (subtotal < minOrder) {
      return { valid: false, code: cleanCode, discount: 0, isFreeDelivery: false, reason: `Minimum order subtotal of ₹${minOrder} required for coupon '${cleanCode}'.` };
    }

    // 6. Global Usage Limit Check
    const usageLimit = Number(couponData.usageLimit);
    const usedCount = Number(couponData.usedCount || 0);
    if (Number.isFinite(usageLimit) && usageLimit > 0 && usedCount >= usageLimit) {
      return { valid: false, code: cleanCode, discount: 0, isFreeDelivery: false, reason: `Coupon code '${cleanCode}' total usage limit has been reached.` };
    }

    // 7. Per-User Usage Limit Check
    const userLimit = Number(couponData.userUsageLimit || couponData.maxPerUser);
    if (Number.isFinite(userLimit) && userLimit > 0 && userId && db) {
      try {
        const userOrdersSnap = await db.collection('orders')
          .where('userId', '==', userId)
          .where('couponCode', '==', cleanCode)
          .get();
        const completedUserOrders = userOrdersSnap.docs.filter(d => {
          const s = (d.data().status || '').toUpperCase();
          return s !== 'CANCELLED' && s !== 'FAILED';
        });
        if (completedUserOrders.length >= userLimit) {
          return { valid: false, code: cleanCode, discount: 0, isFreeDelivery: false, reason: `You have already used coupon '${cleanCode}' the maximum allowed number of times.` };
        }
      } catch (err) {
        console.warn(`[COUPON SERVICE] Per-user limit check warning:`, err.message);
      }
    }

    // 8. Discount Calculation
    let discount = 0;
    let isFreeDelivery = false;
    const type = couponData.type || 'fixed';
    const val = Number(couponData.value || couponData.discount) || 0;

    if (type === 'percentage') {
      const rawDiscount = Math.round((subtotal * val) / 100);
      const cap = Number(couponData.maxDiscountCap || couponData.maxCap);
      if (Number.isFinite(cap) && cap > 0) {
        discount = Math.min(cap, rawDiscount);
      } else {
        discount = rawDiscount;
      }
    } else if (type === 'free_delivery') {
      isFreeDelivery = true;
      discount = 0;
    } else {
      // 'fixed'
      discount = Math.min(subtotal, val);
    }

    return {
      valid: true,
      code: cleanCode,
      couponId,
      type,
      discount,
      isFreeDelivery,
      coupon: couponData
    };
  }

  /**
   * Record coupon redemption usage count increment in Firestore
   */
  async recordCouponUsage(code) {
    if (!code || !db) return;
    const cleanCode = code.trim().toUpperCase();
    try {
      const snap = await db.collection('coupons').where('code', '==', cleanCode).limit(1).get();
      if (!snap.empty) {
        const docRef = snap.docs[0].ref;
        const currentUsed = Number(snap.docs[0].data().usedCount || 0);
        await docRef.update({
          usedCount: currentUsed + 1,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn(`[COUPON SERVICE] Error recording usage count for ${cleanCode}:`, err.message);
    }
  }
}

module.exports = new CouponService();
