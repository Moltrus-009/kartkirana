const OrderRepository = require('../repositories/OrderRepository');
const ShopRepository = require('../repositories/ShopRepository');
const ProductRepository = require('../repositories/ProductRepository');
const paymentConfig = require('../config/paymentConfig');
const CouponService = require('./couponService');

class OrderService {
  async calculatePriceBreakdown(items, shopId, couponCode, walletCreditsUsed = 0, referralCode = '', userId = null) {
    let subtotal = 0;
    const validatedItems = [];
    
    for (const item of items) {
      const productId = item.productId || item.id;
      const prod = await ProductRepository.getById(productId);
      if (!prod) throw new Error(`Product ${productId} not found.`);
      if (prod.shopId !== shopId) throw new Error(`Product ${prod.name} does not belong to shop ${shopId}.`);
      
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

    let discount = 0;
    let isFreeDelivery = false;
    let validatedCoupon = null;

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
      validatedItems
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
      walletApplied: priceBreakdown.walletApplied,
      total: priceBreakdown.grandTotal
    };

    return OrderRepository.create(orderId, orderData, userId);
  }
}

module.exports = new OrderService();
