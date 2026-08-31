process.env.USE_MOCK_DB = 'true';

const assert = require('assert');
const {
  calculatePromotionCandidate,
  chooseBestPromotion,
  isCurrentlyActive,
} = require('../services/promotionService');

const today = new Date().toISOString().slice(0, 10);
const baseOffer = {
  id: 'sale-20',
  title: '20% shop sale',
  description: 'Twenty percent off',
  offerType: 'sale',
  discountType: 'percentage',
  value: 20,
  minOrder: 0,
  maxDiscount: 0,
  scope: 'order',
  productIds: [],
  audience: 'all',
  startDate: today,
  endDate: today,
  isActive: true,
  automatic: true,
  promotionVersion: 1,
};

const items = [
  { productId: 'rice', name: 'Rice', price: 100, quantity: 4 },
  { productId: 'milk', name: 'Milk', price: 50, quantity: 2 },
];

assert.equal(isCurrentlyActive(baseOffer), true, 'today\'s offer should be active');

const percent = calculatePromotionCandidate(baseOffer, items, 500, 30);
assert.equal(percent.discount, 100, '20% sale should discount ₹100');
assert.equal(percent.saving, 100, 'percentage saving should equal its discount');

const capped = calculatePromotionCandidate({ ...baseOffer, maxDiscount: 60 }, items, 500, 30);
assert.equal(capped.discount, 60, 'percentage maximum should be respected');

const productOnly = calculatePromotionCandidate({
  ...baseOffer,
  id: 'milk-only',
  scope: 'products',
  productIds: ['milk'],
  value: 50,
}, items, 500, 30);
assert.equal(productOnly.discount, 50, 'product-scoped sale should ignore other products');

const bogo = calculatePromotionCandidate({
  ...baseOffer,
  id: 'rice-bogo',
  offerType: 'addon',
  discountType: 'bogo',
  scope: 'products',
  productIds: ['rice'],
  buyQuantity: 1,
  getQuantity: 1,
}, items, 500, 30);
assert.equal(bogo.discount, 200, 'buy-one-get-one should make two of four units free');
assert.deepEqual(bogo.freeItems, [{ productId: 'rice', name: 'Rice', quantity: 2 }]);

const freeDelivery = calculatePromotionCandidate({
  ...baseOffer,
  id: 'free-delivery',
  discountType: 'free_delivery',
  value: 0,
}, items, 500, 30);
assert.equal(freeDelivery.discount, 0);
assert.equal(freeDelivery.saving, 30, 'free delivery should use the actual delivery fee');

const expired = calculatePromotionCandidate({ ...baseOffer, endDate: '2000-01-01' }, items, 500, 30);
assert.equal(expired, null, 'expired offers must not apply');

const best = chooseBestPromotion([
  { ...baseOffer, id: 'ten-percent', value: 10 },
  { ...baseOffer, id: 'flat-80', discountType: 'flat', value: 80 },
  { ...baseOffer, id: 'free-delivery', discountType: 'free_delivery', value: 0 },
], items, 500, 30);
assert.equal(best.promotionId, 'flat-80', 'only the single highest-value shop special should win');
assert.equal(best.saving, 80);

console.log('[PASS] Shop promotion calculation, scoping, BOGO, expiry, and best-offer tests passed.');
