const { db } = require('../config/firebase');

const money = (value) => Math.round((Number(value) || 0) * 100) / 100;
const asDateKey = (value) => String(value || '').slice(0, 10);

const isCurrentlyActive = (offer, now = new Date()) => {
  if (!offer || offer.isActive !== true) return false;
  const today = asDateKey(now.toISOString());
  const starts = asDateKey(offer.startDate);
  const ends = asDateKey(offer.endDate);
  return (!starts || starts <= today) && (!ends || ends >= today);
};

const eligibleItems = (offer, items) => {
  const ids = Array.isArray(offer.productIds) ? offer.productIds.filter(Boolean) : [];
  if ((offer.scope || 'order') !== 'products' || ids.length === 0) return items;
  return items.filter(item => ids.includes(item.productId));
};

const calculatePromotionCandidate = (offer, items, subtotal, deliveryCharge = 0) => {
  if (!isCurrentlyActive(offer) || Number(subtotal) < Number(offer.minOrder || 0)) return null;
  const matchedItems = eligibleItems(offer, items);
  if (!matchedItems.length && (offer.scope || 'order') === 'products') return null;

  const eligibleSubtotal = money(matchedItems.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0));
  const type = offer.discountType;
  let discount = 0;
  let isFreeDelivery = false;
  const freeItems = [];

  if (type === 'percentage') {
    const percent = Math.min(90, Math.max(0, Number(offer.value || 0)));
    discount = eligibleSubtotal * percent / 100;
    if (Number(offer.maxDiscount || 0) > 0) discount = Math.min(discount, Number(offer.maxDiscount));
  } else if (type === 'flat') {
    discount = Math.min(eligibleSubtotal, Math.max(0, Number(offer.value || 0)));
  } else if (type === 'free_delivery') {
    isFreeDelivery = true;
  } else if (type === 'bogo') {
    const buyQuantity = Math.max(1, Math.floor(Number(offer.buyQuantity || 1)));
    const getQuantity = Math.max(1, Math.min(5, Math.floor(Number(offer.getQuantity || 1))));
    const groupSize = buyQuantity + getQuantity;
    for (const item of matchedItems) {
      const freeQuantity = Math.floor(Number(item.quantity) / groupSize) * getQuantity;
      if (freeQuantity > 0) {
        discount += freeQuantity * Number(item.price);
        freeItems.push({ productId: item.productId, name: item.name, quantity: freeQuantity });
      }
    }
  }

  discount = money(Math.min(Number(subtotal), Math.max(0, discount)));
  const saving = money(discount + (isFreeDelivery ? Number(deliveryCharge || 0) : 0));
  if (saving <= 0) return null;

  return {
    promotionId: offer.id,
    offerType: offer.offerType || 'sale',
    title: offer.title || offer.description || 'Shop special',
    description: offer.description || '',
    discountType: type,
    discount,
    isFreeDelivery,
    freeItems,
    saving,
  };
};

const chooseBestPromotion = (offers, items, subtotal, deliveryCharge = 0) => offers
  .map(offer => calculatePromotionCandidate(offer, items, subtotal, deliveryCharge))
  .filter(Boolean)
  .sort((a, b) => b.saving - a.saving || a.promotionId.localeCompare(b.promotionId))[0] || null;

class PromotionService {
  async getEligibleOffers(userId, shopId) {
    if (!db || !shopId) return [];
    const snapshot = await db.collection('offers').where('shopId', '==', shopId).get();
    const offers = snapshot.docs
      .map(entry => ({ id: entry.id, ...entry.data() }))
      .filter(offer => (
        offer.automatic === true &&
        offer.promotionVersion === 1 &&
        offer.offerType !== 'subscription' &&
        isCurrentlyActive(offer)
      ));

    const eligibility = await Promise.all(offers.map(async offer => {
      if ((offer.audience || 'all') === 'all') return offer;
      if (!userId) return null;

      if (offer.audience === 'selected_customers') {
        const target = await db.collection('offerTargets').doc(`${offer.id}_${userId}`).get();
        return target.exists && target.data().shopId === shopId ? offer : null;
      }

      if (offer.audience === 'subscribers') {
        const membership = await db.collection('shopSubscriptions').doc(`${shopId}_${userId}`).get();
        const data = membership.exists ? membership.data() : null;
        return data && data.status === 'active' && (!data.planId || data.planId === offer.subscriptionPlanId) ? offer : null;
      }

      return null;
    }));
    return eligibility.filter(Boolean);
  }

  async findBestPromotion(userId, shopId, items, subtotal, deliveryCharge) {
    const offers = await this.getEligibleOffers(userId, shopId);
    return chooseBestPromotion(offers, items, subtotal, deliveryCharge);
  }
}

module.exports = new PromotionService();
module.exports.calculatePromotionCandidate = calculatePromotionCandidate;
module.exports.chooseBestPromotion = chooseBestPromotion;
module.exports.isCurrentlyActive = isCurrentlyActive;
