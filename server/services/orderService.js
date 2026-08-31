const OrderRepository = require('../repositories/OrderRepository');
const ShopRepository = require('../repositories/ShopRepository');
const ProductRepository = require('../repositories/ProductRepository');
const paymentConfig = require('../config/paymentConfig');
const CouponService = require('./couponService');
const PromotionService = require('./promotionService');
const { AppError } = require('../utils/errors');

class OrderService {
  async calculatePriceBreakdown(items, shopId, couponCode, walletCreditsUsed = 0, referralCode = '', userId = null) {
    let subtotal = 0;
    const validatedItems = [];
    
    for (const item of items) {
      const productId = item.productId || item.id;
      const prod = await ProductRepository.getById(productId);
      if (!prod) throw new Error(`Product ${productId} not found.`);
      if (prod.shopId !== shopId) throw new Error(`Product ${prod.name} does not belong to shop ${shopId}.`);
      const productStatus = String(prod.status || '').toLowerCase();
      if (productStatus && productStatus !== 'active') {
        throw new AppError(`"${prod.name}" is currently unavailable. Your cart has not been charged.`, 409);
      }
      const availableStock = Number(prod.stock);
      if (Number.isFinite(availableStock) && availableStock < item.quantity) {
        throw new AppError(
          `Only ${Math.max(0, availableStock)} unit(s) of "${prod.name}" are available. Update your cart and try again.`,
          409
        );
      }
      
      subtotal += prod.price * item.quantity;
      validatedItems.push({
        productId,
        name: prod.name,
        price: prod.price,
        quantity: item.quantity,
        product: prod
      });
    }

    const platformFee = paymentConfig.fees.platformFee;
    const packagingFee = paymentConfig.fees.packagingFee;
    
    let deliveryCharge = paymentConfig.delivery.baseFee;
    if (subtotal >= paymentConfig.delivery.freeThreshold) {
      deliveryCharge = 0;
    }
    const deliveryChargeBeforeOffers = deliveryCharge;

    let discount = 0;
    let isFreeDelivery = false;
    let validatedCoupon = null;
    let appliedPromotion = null;

    if (couponCode) {
      const couponResult = await CouponService.validateAndApplyCoupon(couponCode, userId, shopId, subtotal);
      if (couponResult.valid) {
        discount = couponResult.discount;
        validatedCoupon = couponResult;
        if (couponResult.isFreeDelivery) {
          isFreeDelivery = true;
          deliveryCharge = 0;
        }
      } else {
        throw new Error(couponResult.reason || `Invalid coupon code '${couponCode}'.`);
      }
    }

    // Shop promotions are automatic. To prevent accidental or abusive stacking,
    // checkout applies whichever single benefit saves the customer the most:
    // their coupon or their eligible shop special.
    const shopPromotion = await PromotionService.findBestPromotion(
      userId,
      shopId,
      validatedItems,
      subtotal,
      deliveryChargeBeforeOffers
    );
    const couponSaving = discount + (isFreeDelivery ? deliveryChargeBeforeOffers : 0);
    if (shopPromotion && shopPromotion.saving > couponSaving) {
      discount = shopPromotion.discount;
      isFreeDelivery = shopPromotion.isFreeDelivery;
      deliveryCharge = isFreeDelivery ? 0 : deliveryChargeBeforeOffers;
      validatedCoupon = null;
      appliedPromotion = shopPromotion;
    }

    let referralDiscount = 0;
    if (referralCode) {
      referralDiscount = 50.00;
    }

    const taxableAmount = Math.max(0, subtotal - discount - referralDiscount);
    const taxes = Math.round(taxableAmount * paymentConfig.fees.gstRate * 100) / 100;

    let grandTotal = subtotal + platformFee + packagingFee + deliveryCharge + taxes - discount - referralDiscount;
    grandTotal = Math.max(0, grandTotal);

    let walletApplied = 0;
    if (walletCreditsUsed > 0) {
      walletApplied = Math.min(walletCreditsUsed, grandTotal);
      grandTotal -= walletApplied;
    }

    return {
      subtotal,
      platformFee,
      packagingFee,
      deliveryCharge,
      discount,
      referralDiscount,
      taxes,
      walletApplied,
      grandTotal: Math.round(grandTotal * 100) / 100,
      validatedItems,
      coupon: validatedCoupon,
      appliedPromotion
    };
  }

  async createDraftOrder(orderId, userId, shopId, items, deliveryAddress, priceBreakdown, preorderSchedule, orderNotes) {
    const timelineEntry = {
      status: 'DRAFT',
      timestamp: new Date().toISOString(),
      title: 'Checkout Started',
      description: 'The checkout session was initialized.'
    };

    const shop = await ShopRepository.getById(shopId);
    const shopName = shop ? shop.name : 'Unknown Shop';

    const orderData = {
      orderId,
      userId,
      shopId,
      shopName,
      status: 'DRAFT',
      timeline: [timelineEntry],
      items: items.map(i => ({
        productId: i.productId || i.id,
        name: i.name,
        price: i.price,
        quantity: i.quantity
      })),
      priceBreakdown,
      deliveryAddress,
      orderNotes: orderNotes || '',
      estimatedDelivery: preorderSchedule ? `${preorderSchedule.date} | ${preorderSchedule.slot}` : '15-20 Mins',
      preorderDate: preorderSchedule ? preorderSchedule.date : null,
      preorderSlot: preorderSchedule ? preorderSchedule.slot : null,
      subtotal: priceBreakdown.subtotal,
      deliveryFee: priceBreakdown.deliveryCharge,
      platformFee: priceBreakdown.platformFee,
      tax: priceBreakdown.taxes,
      discount: priceBreakdown.discount + priceBreakdown.referralDiscount,
      appliedPromotion: priceBreakdown.appliedPromotion || null,
      walletApplied: priceBreakdown.walletApplied,
      total: priceBreakdown.grandTotal
    };

    return OrderRepository.create(orderId, orderData, userId);
  }
}

module.exports = new OrderService();
