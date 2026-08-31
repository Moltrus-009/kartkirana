import { AppliedPromotion, CartItem, ShopPromotion } from '../types';

const money = (value: number) => Math.round(value * 100) / 100;

export const describePromotion = (promotion: ShopPromotion): string => {
  if (promotion.offerType === 'subscription') {
    return `₹${promotion.subscriptionPrice || 0}/${promotion.billingPeriod === 'quarterly' ? 'quarter' : 'month'} · ${promotion.value}% member saving`;
  }
  if (promotion.discountType === 'percentage') return `${promotion.value}% off${promotion.maxDiscount ? ` up to ₹${promotion.maxDiscount}` : ''}`;
  if (promotion.discountType === 'flat') return `₹${promotion.value} off`;
  if (promotion.discountType === 'free_delivery') return 'Free delivery';
  return `Buy ${promotion.buyQuantity || 1}, get ${promotion.getQuantity || 1} free`;
};

const candidateFor = (promotion: ShopPromotion, items: CartItem[], subtotal: number, deliveryCharge: number): AppliedPromotion | null => {
  if (!promotion.eligible || !promotion.isActive || promotion.offerType === 'subscription' || subtotal < Number(promotion.minOrder || 0)) return null;
  const matched = promotion.scope === 'products' && promotion.productIds.length
    ? items.filter(item => promotion.productIds.includes(item.product.id))
    : items;
  if (!matched.length && promotion.scope === 'products') return null;
  const eligibleSubtotal = matched.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  let discount = 0;
  let isFreeDelivery = false;
  const freeItems: AppliedPromotion['freeItems'] = [];

  if (promotion.discountType === 'percentage') {
    discount = eligibleSubtotal * Math.min(90, Math.max(0, promotion.value)) / 100;
    if (promotion.maxDiscount) discount = Math.min(discount, promotion.maxDiscount);
  } else if (promotion.discountType === 'flat') {
    discount = Math.min(eligibleSubtotal, Math.max(0, promotion.value));
  } else if (promotion.discountType === 'free_delivery') {
    isFreeDelivery = true;
  } else if (promotion.discountType === 'bogo') {
    const buy = Math.max(1, Math.floor(promotion.buyQuantity || 1));
    const get = Math.max(1, Math.min(5, Math.floor(promotion.getQuantity || 1)));
    matched.forEach(item => {
      const freeQuantity = Math.floor(item.quantity / (buy + get)) * get;
      if (freeQuantity > 0) {
        discount += freeQuantity * item.product.price;
        freeItems.push({ productId: item.product.id, name: item.product.name, quantity: freeQuantity });
      }
    });
  }

  discount = money(Math.min(subtotal, Math.max(0, discount)));
  const saving = money(discount + (isFreeDelivery ? deliveryCharge : 0));
  if (saving <= 0) return null;
  return {
    promotionId: promotion.id,
    offerType: promotion.offerType,
    title: promotion.title,
    description: promotion.description,
    discountType: promotion.discountType,
    discount,
    isFreeDelivery,
    saving,
    freeItems,
  };
};

export const calculateBestPromotion = (promotions: ShopPromotion[], items: CartItem[], subtotal: number, deliveryCharge: number): AppliedPromotion | null => promotions
  .map(promotion => candidateFor(promotion, items, subtotal, deliveryCharge))
  .filter((candidate): candidate is AppliedPromotion => Boolean(candidate))
  .sort((first, second) => second.saving - first.saving || first.promotionId.localeCompare(second.promotionId))[0] || null;
