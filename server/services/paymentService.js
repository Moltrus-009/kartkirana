const { db } = require('../config/firebase');
const RazorpayProvider = require('../providers/razorpay/RazorpayProvider');
const OrderRepository = require('../repositories/OrderRepository');
const PaymentRepository = require('../repositories/PaymentRepository');
const PaymentAttemptRepository = require('../repositories/PaymentAttemptRepository');
const ReservationRepository = require('../repositories/ReservationRepository');
const RefundRepository = require('../repositories/RefundRepository');
const ShopRepository = require('../repositories/ShopRepository');
const InventoryService = require('./inventoryService');
const OrderService = require('./orderService');
const CouponService = require('./couponService');
const paymentEmitter = require('../events/paymentEvents');
const timeouts = require('../config/timeouts');
const limits = require('../config/limits');
const { AppError } = require('../utils/errors');
const crypto = require('crypto');

// All three clients consume the same order document.  Keep the address shape
// stable here, at the server boundary, instead of making each client guess.
const normalizeDeliveryAddress = (value = {}) => {
  const source = value && typeof value === 'object' ? value : {};
  const lat = Number(source.coords?.lat ?? source.lat);
  const lng = Number(source.coords?.lng ?? source.lng);
  const address = source.address || [source.details, source.area, source.city, source.pinCode]
    .filter(Boolean)
    .join(', ') || source.street || '';

  return {
    ...source,
    label: source.label || source.name || 'Delivery address',
    address,
    ...(Number.isFinite(lat) && Number.isFinite(lng)
      ? { lat, lng, coords: { lat, lng } }
      : {})
  };
};

class PaymentService {
  async initPayment(userId, shopId, items, deliveryAddress, couponCode, walletCreditsUsed = 0, referralCode = '', preorderSchedule = null, orderNotes = '', paymentMethod = 'razorpay') {
    const orderId = `ord_${crypto.randomBytes(6).toString('hex')}`;
    const paymentId = `pay_${crypto.randomBytes(6).toString('hex')}`;
    const attemptId = `att_${crypto.randomBytes(6).toString('hex')}`;

    const normalizedPaymentMethod = String(paymentMethod || 'razorpay').toLowerCase();
    const isCod = normalizedPaymentMethod === 'cod';
    if (!['cod', 'razorpay', 'upi', 'card', 'net_banking'].includes(normalizedPaymentMethod)) {
      throw new Error('Unsupported payment method. Choose UPI, card, net banking, or Cash on Delivery.');
    }
    // Wallet/referral money needs an immutable server-side ledger. Until that
    // ledger exists, accepting client-supplied balances would permit free orders.
    if (Number(walletCreditsUsed) > 0 || referralCode) {
      throw new Error('Wallet credits and referral balance payments are temporarily unavailable.');
    }

    const breakdown = await OrderService.calculatePriceBreakdown(items, shopId, couponCode, 0, '', userId);
    if (!Number.isFinite(breakdown.grandTotal) || breakdown.grandTotal <= 0) {
      throw new AppError('The server-calculated order total must be greater than zero.', 422);
    }
    if (breakdown.grandTotal < limits.orderAmount.min || breakdown.grandTotal > limits.orderAmount.max) {
      throw new AppError(
        `Orders must be between ₹${limits.orderAmount.min.toFixed(2)} and ₹${limits.orderAmount.max.toFixed(2)}.`,
        422
      );
    }
    if (isCod && breakdown.grandTotal > limits.orderAmount.codMax) {
      throw new AppError(
        `Cash on Delivery is limited to ₹${limits.orderAmount.codMax.toFixed(2)}. Choose an online payment method.`,
        422
      );
    }
    
    console.log('=== AMOUNT FLOW AUDIT ===');
    console.log('Subtotal:', breakdown.subtotal);
    console.log('Delivery Fee:', breakdown.deliveryCharge);
    console.log('Platform Fee:', breakdown.platformFee);
    console.log('Packaging Fee:', breakdown.packagingFee);
    console.log('Taxes:', breakdown.taxes);
    console.log('Discount:', breakdown.discount);
    console.log('Referral Discount:', breakdown.referralDiscount);
    console.log('Wallet Applied:', breakdown.walletApplied);
    console.log('Final Amount (grandTotal):', breakdown.grandTotal);
    console.log('Razorpay Amount (paise):', Math.round(breakdown.grandTotal * 100));
    console.log('=========================');

    const priceBreakdown = breakdown;
    const expiresAt = new Date(Date.now() + timeouts.reservationExpiryMs).toISOString();
    const normalizedDeliveryAddress = normalizeDeliveryAddress(deliveryAddress);

    const shop = await ShopRepository.getById(shopId);
    const shopStatus = String(shop?.status || '').toLowerCase();
    const shopIsOpen = Boolean(shop) && (shopStatus ? shopStatus === 'open' : shop.isOpen !== false);
    if (!shopIsOpen) {
      throw new AppError('This shop is currently closed. Your cart has not been charged.', 409);
    }
    const shopName = shop.name || 'Unknown Shop';

    // Create the gateway order before reserving stock. A gateway outage then
    // leaves no DRAFT order, consumed coupon, or inventory reservation behind.
    let gatewayOrder = null;
    if (!isCod) {
      gatewayOrder = await RazorpayProvider.createGatewayOrder(
        breakdown.grandTotal,
        'INR',
        `rcpt_${orderId}`,
        { orderId, userId, shopId }
      );
    }

    await db.runTransaction(async (transaction) => {
      // Read coupon + customer redemption state before inventory begins its
      // transaction writes. This closes concurrent checkout/retry races.
      const couponReservation = await CouponService.prepareRedemption(
        transaction,
        breakdown.coupon,
        userId,
        shopId,
        breakdown.subtotal
      );

      // COD is committed immediately; online payments receive a time-bound reservation.
      // Keeping these as separate flows avoids Firestore reads after writes in a transaction.
      if (isCod) {
        await InventoryService.commitCodInventory(transaction, breakdown.validatedItems, userId);
      } else {
        await InventoryService.reserveInventory(transaction, orderId, breakdown.validatedItems, expiresAt, userId);
      }

      CouponService.commitRedemption(transaction, couponReservation, userId, orderId, isCod ? 'REDEEMED' : 'RESERVED', isCod ? null : expiresAt);

      // 2. Create the order
      const initialTimeline = isCod ? [{
        status: 'PLACED',
        timestamp: new Date().toISOString(),
        title: 'Order Confirmed',
        description: 'Cash on Delivery order has been successfully placed.'
      }] : [{
        status: 'DRAFT',
        timestamp: new Date().toISOString(),
        title: 'Checkout Started',
        description: 'The checkout session was initialized.'
      }];

      const orderData = {
        orderId,
        userId,
        shopId,
        shopName,
        status: isCod ? 'PLACED' : 'DRAFT',
        timeline: initialTimeline,
        items: breakdown.validatedItems.map(i => ({
          productId: i.productId,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          product: i.product
        })),
        priceBreakdown,
        deliveryAddress: normalizedDeliveryAddress,
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
        total: priceBreakdown.grandTotal,
        paymentMethod: isCod ? 'cod' : normalizedPaymentMethod,
        paymentStatus: isCod ? 'cod_pending' : 'unpaid'
      };
      if (breakdown.coupon) {
        orderData.couponCode = breakdown.coupon.code;
        orderData.couponId = breakdown.coupon.couponId;
        orderData.couponDiscount = breakdown.discount;
        orderData.couponType = breakdown.coupon.type;
      }
      transaction.set(OrderRepository.collection.doc(orderId), OrderRepository._prepareDoc(orderData, userId, true));

      // 3. Create parent payment record
      const paymentData = {
        paymentId,
        orderId,
        userId,
        shopId,
        gateway: isCod ? 'cod' : 'razorpay',
        status: isCod ? 'COD_PENDING' : 'PENDING',
        amount: breakdown.grandTotal,
        amountPaise: Math.round(breakdown.grandTotal * 100),
        currency: 'INR',
        environment: RazorpayProvider.environment,
        paymentMethod: isCod ? 'cod' : normalizedPaymentMethod,
        gatewayOrderId: gatewayOrder?.id || null,
        refundedAmount: 0,
        pendingRefundAmount: 0
      };
      const paymentRef = PaymentRepository.collection.doc(paymentId);
      transaction.set(paymentRef, PaymentRepository._prepareDoc(paymentData, userId, true));

      // 4. Create attempt document (only for Razorpay)
      if (!isCod) {
        const attemptData = {
          attemptId,
          paymentId,
          orderId,
          userId,
          shopId,
          gatewayOrderId: gatewayOrder.id,
          gatewayPaymentId: '',
          status: 'PENDING',
          amount: breakdown.grandTotal,
          amountPaise: Math.round(breakdown.grandTotal * 100),
          currency: 'INR',
          environment: RazorpayProvider.environment
        };
        const attemptRef = PaymentAttemptRepository.collection.doc(attemptId);
        transaction.set(attemptRef, PaymentAttemptRepository._prepareDoc(attemptData, userId, true));
      }
    });

    if (isCod) {
      paymentEmitter.emit('order.placed', { orderId, userId });

      return {
        orderId,
        paymentId,
        cod: true,
        amount: breakdown.grandTotal,
        currency: 'INR'
      };
    }

    return {
      orderId,
      paymentId,
      attemptId,
      gatewayOrderId: gatewayOrder.id,
      amount: breakdown.grandTotal,
      currency: 'INR',
      paymentKey: RazorpayProvider.keyId,
      upiAddress: require('../config/paymentConfig').upi.address,
      priceBreakdown: breakdown,
      customerDetails: { userId }
    };
  }

  async collectCodPayment(orderId, riderId) {
    const paymentHint = await PaymentRepository.getByOrderId(orderId);
    if (!paymentHint) throw new Error('COD payment record was not found.');

    let result = null;
    await db.runTransaction(async (transaction) => {
      const orderRef = OrderRepository.collection.doc(orderId);
      const paymentRef = PaymentRepository.collection.doc(paymentHint.id);
      const [orderSnap, paymentSnap] = await Promise.all([
        transaction.get(orderRef),
        transaction.get(paymentRef)
      ]);
      if (!orderSnap.exists || !paymentSnap.exists) throw new Error('COD transaction records are incomplete.');
      const order = orderSnap.data();
      const payment = paymentSnap.data();
      if (order.riderId !== riderId && order.currentRiderId !== riderId) {
        throw new Error('Only the assigned delivery partner can collect this COD payment.');
      }
      if (String(order.paymentMethod || '').toLowerCase() !== 'cod' || payment.gateway !== 'cod') {
        throw new Error('This order is not Cash on Delivery.');
      }
      if (payment.status === 'COD_COLLECTED') {
        result = { collected: true, alreadyCollected: true, orderId, amount: payment.amount, customerUserId: order.userId };
        return;
      }
      if (order.status !== 'OUT_FOR_DELIVERY') {
        throw new Error(`COD can only be collected while the order is out for delivery (current: ${order.status}).`);
      }
      if (!['COD_PENDING', 'CREATED'].includes(payment.status)) {
        throw new Error(`COD transaction is ${String(payment.status || 'unavailable').toLowerCase()}.`);
      }

      const now = new Date().toISOString();
      const gatewayPaymentId = `cod_${orderId}`;
      transaction.update(paymentRef, {
        status: 'COD_COLLECTED',
        gatewayPaymentId,
        collectedAt: now,
        collectedBy: riderId,
        updatedAt: now,
        updatedBy: riderId
      });
      transaction.update(orderRef, {
        status: 'DELIVERED',
        paymentStatus: 'completed',
        gatewayPaymentId,
        codCollectedAt: now,
        codCollectedBy: riderId,
        timeline: [...(order.timeline || []), {
          status: 'COD_COLLECTED',
          timestamp: now,
          title: 'Cash Payment Collected',
          description: `₹${Number(payment.amount).toFixed(2)} collected by the delivery partner.`
        }, {
          status: 'DELIVERED',
          timestamp: now,
          title: 'Delivered',
          description: 'Order delivered and Cash on Delivery payment recorded.'
        }],
        updatedAt: now,
        updatedBy: riderId
      });
      result = { collected: true, alreadyCollected: false, orderId, amount: payment.amount, customerUserId: order.userId };
    });
    if (!result.alreadyCollected) {
      paymentEmitter.emit('payment.verified', {
        orderId, paymentAttemptId: `cod_${orderId}`, userId: result.customerUserId,
        amount: result.amount, paymentMethod: 'cod'
      });
    }
    const { customerUserId, ...publicResult } = result;
    return publicResult;
  }

  async verifyPayment(params, userId = 'system') {
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature, orderId } = params;
    const hintDoc = await PaymentAttemptRepository.getByGatewayOrderId(razorpayOrderId);
    if (!hintDoc) throw new Error('The payment session could not be found.');
    if (hintDoc.orderId !== orderId) throw new Error('The payment does not belong to this order.');

    // Razorpay requires the gateway order ID stored by our server—not a value
    // trusted from the browser—to be used for HMAC verification.
    if (!RazorpayProvider.verifySignature(hintDoc.gatewayOrderId, razorpayPaymentId, razorpaySignature)) {
      throw new Error('Payment signature verification failed.');
    }

    const expectedAmountPaise = Number(hintDoc.amountPaise || Math.round(Number(hintDoc.amount) * 100));
    let gatewayPayment = await RazorpayProvider.fetchPayment(razorpayPaymentId, {
      orderId: hintDoc.gatewayOrderId,
      amountPaise: expectedAmountPaise,
      currency: hintDoc.currency || 'INR'
    });
    if (gatewayPayment.order_id !== hintDoc.gatewayOrderId) throw new Error('Gateway payment order mismatch.');
    if (Number(gatewayPayment.amount) !== expectedAmountPaise) throw new Error('Gateway payment amount mismatch.');
    if (String(gatewayPayment.currency || '').toUpperCase() !== 'INR') throw new Error('Gateway payment currency mismatch.');
    if (gatewayPayment.status === 'authorized' && gatewayPayment.captured !== true) {
      gatewayPayment = await RazorpayProvider.capturePayment(
        razorpayPaymentId,
        expectedAmountPaise,
        hintDoc.currency || 'INR'
      );
      if (gatewayPayment.order_id && gatewayPayment.order_id !== hintDoc.gatewayOrderId) {
        throw new Error('Captured gateway payment order mismatch.');
      }
      if (Number(gatewayPayment.amount) !== expectedAmountPaise) throw new Error('Captured gateway payment amount mismatch.');
      if (String(gatewayPayment.currency || '').toUpperCase() !== 'INR') throw new Error('Captured gateway payment currency mismatch.');
    }
    if (gatewayPayment.status !== 'captured' && gatewayPayment.captured !== true) {
      throw new Error('Payment is not captured yet. Please wait while it is reconciled.');
    }

    const usedPaymentSnapshot = await PaymentAttemptRepository.collection
      .where('gatewayPaymentId', '==', razorpayPaymentId)
      .limit(2)
      .get();
    if (usedPaymentSnapshot.docs.some(doc => doc.id !== hintDoc.id && doc.data().status === 'VERIFIED')) {
      throw new Error('This gateway payment is already linked to another order.');
    }

    let newlyVerified = false;
    let verifiedOrderId = hintDoc.orderId;
    await db.runTransaction(async (transaction) => {
      const attemptRef = PaymentAttemptRepository.collection.doc(hintDoc.id);
      const orderRef = OrderRepository.collection.doc(hintDoc.orderId);
      const paymentRef = PaymentRepository.collection.doc(hintDoc.paymentId);
      const [attemptSnap, orderSnap, paymentSnap] = await Promise.all([
        transaction.get(attemptRef),
        transaction.get(orderRef),
        transaction.get(paymentRef)
      ]);
      if (!attemptSnap.exists || !orderSnap.exists || !paymentSnap.exists) {
        throw new Error('Payment records are incomplete. Please contact support with the order ID.');
      }

      const attemptDoc = attemptSnap.data();
      const orderDoc = orderSnap.data();
      const couponRedemption = await CouponService.prepareOrderRedemption(transaction, { ...orderDoc, orderId: hintDoc.orderId });
      if (orderDoc.userId !== userId && userId !== 'system') throw new Error('Unauthorized payment verification.');
      if (attemptDoc.gatewayOrderId !== hintDoc.gatewayOrderId || attemptDoc.orderId !== orderId) {
        throw new Error('Payment session changed during verification.');
      }
      if (attemptDoc.status === 'VERIFIED') {
        if (attemptDoc.gatewayPaymentId !== razorpayPaymentId) {
          throw new Error('This order is already linked to a different payment.');
        }
        return;
      }
      if (!['DRAFT', 'PAYMENT_PENDING', 'PAYMENT_PROCESSING'].includes(orderDoc.status)) {
        throw new Error(`This order can no longer accept payment (current: ${orderDoc.status}). If money was deducted, it will be sent for refund review.`);
      }
      if (!['PENDING', 'CREATED'].includes(attemptDoc.status)) {
        throw new Error(`Payment session is ${String(attemptDoc.status || 'unavailable').toLowerCase()}.`);
      }

      await InventoryService.finalizeReservation(transaction, attemptDoc.orderId, userId);
      CouponService.confirmReservedRedemption(transaction, couponRedemption);

      const now = new Date().toISOString();
      transaction.update(attemptRef, {
        status: 'VERIFIED',
        gatewayPaymentId: razorpayPaymentId,
        verifiedAt: now,
        updatedAt: now,
        updatedBy: userId
      });
      transaction.update(paymentRef, {
        status: 'CAPTURED',
        gatewayOrderId: hintDoc.gatewayOrderId,
        gatewayPaymentId: razorpayPaymentId,
        paymentMethod: gatewayPayment.method || paymentSnap.data().paymentMethod || 'upi',
        capturedAt: now,
        updatedAt: now,
        updatedBy: userId
      });
      transaction.update(orderRef, {
        status: 'PLACED',
        timeline: [...(orderDoc.timeline || []), {
          status: 'PAYMENT_VERIFIED',
          timestamp: now,
          title: 'Payment Verified',
          description: 'Payment captured and verified securely.'
        }, {
          status: 'PLACED',
          timestamp: now,
          title: 'Order Confirmed',
          description: 'The paid order is ready for merchant acceptance.'
        }],
        paymentStatus: 'completed',
        gatewayPaymentId: razorpayPaymentId,
        updatedAt: now,
        updatedBy: userId
      });
      newlyVerified = true;
    });

    if (newlyVerified) {
      paymentEmitter.emit('payment.verified', {
        orderId: verifiedOrderId,
        paymentAttemptId: hintDoc.attemptId || hintDoc.id,
        userId: hintDoc.userId || userId,
        amount: hintDoc.amount,
        paymentMethod: gatewayPayment.method || 'upi'
      });
      paymentEmitter.emit('order.placed', {
        orderId: verifiedOrderId,
        userId: hintDoc.userId || userId
      });
    }

    return {
      verified: true,
      alreadyVerified: !newlyVerified,
      orderId: verifiedOrderId,
      paymentStatus: 'completed'
    };
  }
}

module.exports = new PaymentService();
