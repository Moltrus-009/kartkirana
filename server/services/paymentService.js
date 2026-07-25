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
const paymentEmitter = require('../events/paymentEvents');
const timeouts = require('../config/timeouts');
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

    const breakdown = await OrderService.calculatePriceBreakdown(items, shopId, couponCode, walletCreditsUsed, referralCode, userId);
    
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

    const isCod = paymentMethod === 'cod' || paymentMethod === 'COD';

    await db.runTransaction(async (transaction) => {
      // COD is committed immediately; online payments receive a time-bound reservation.
      // Keeping these as separate flows avoids Firestore reads after writes in a transaction.
      if (isCod) {
        await InventoryService.commitCodInventory(transaction, breakdown.validatedItems, userId);
      } else {
        await InventoryService.reserveInventory(transaction, orderId, breakdown.validatedItems, expiresAt, userId);
      }

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

      const shop = await ShopRepository.getById(shopId);
      const shopName = shop ? shop.name : 'Unknown Shop';

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
        walletApplied: priceBreakdown.walletApplied,
        total: priceBreakdown.grandTotal,
        paymentStatus: isCod ? 'pending' : 'unpaid'
      };
      transaction.set(OrderRepository.collection.doc(orderId), OrderRepository._prepareDoc(orderData, userId, true));

      // 3. Create parent payment record
      const paymentData = {
        paymentId,
        orderId,
        userId,
        shopId,
        gateway: isCod ? 'cod' : 'razorpay',
        status: isCod ? 'CREATED' : 'CREATED',
        amount: breakdown.grandTotal,
        currency: 'INR',
        environment: RazorpayProvider.environment
      };
      const paymentRef = PaymentRepository.collection.doc(paymentId);
      transaction.set(paymentRef, PaymentRepository._prepareDoc(paymentData, userId, true));

      // 4. Create attempt document (only for Razorpay)
      if (!isCod) {
        const attemptData = {
          attemptId,
          paymentId,
          orderId,
          gatewayOrderId: '',
          gatewayPaymentId: '',
          status: 'CREATED',
          amount: breakdown.grandTotal,
          environment: RazorpayProvider.environment
        };
        const attemptRef = PaymentAttemptRepository.collection.doc(attemptId);
        transaction.set(attemptRef, PaymentAttemptRepository._prepareDoc(attemptData, userId, true));
      }
    });

    if (isCod) {
      // Emit event for event-driven systems (notifications, invoice, metrics)
      paymentEmitter.emit('payment.verified', {
        orderId,
        paymentAttemptId: 'cod_attempt',
        userId,
        amount: breakdown.grandTotal,
        paymentMethod: 'cod'
      });

      return {
        orderId,
        paymentId,
        cod: true,
        amount: breakdown.grandTotal,
        currency: 'INR'
      };
    }

    let gatewayOrder;
    try {
      gatewayOrder = await RazorpayProvider.createGatewayOrder(
        breakdown.grandTotal,
        'INR',
        `rcpt_${orderId}`,
        { orderId, userId, shopId }
      );
    } catch (error) {
      console.error('[RAZORPAY ERROR] Failed to create gateway order, releasing stock reservation:', error);
      await db.runTransaction(async (transaction) => {
        await InventoryService.releaseReservation(transaction, orderId, 'RELEASED', userId);
        const orderRef = OrderRepository.collection.doc(orderId);
        transaction.update(orderRef, { 
          status: 'CANCELLED', 
          updatedBy: 'system', 
          updatedAt: new Date().toISOString() 
        });
      });
      throw error;
    }

    await PaymentAttemptRepository.update(attemptId, { gatewayOrderId: gatewayOrder.id }, userId);

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

  async verifyPayment(params, userId = 'system') {
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature, orderId } = params;

    const isSignatureValid = await RazorpayProvider.verifySignature(params);
    if (!isSignatureValid) {
      throw new Error('Invalid signature. Potential fraud attempt.');
    }

    // Prevent payment replay attacks: verify if this payment ID was already used
    const existingAttempts = await PaymentAttemptRepository.collection
      .where('gatewayPaymentId', '==', razorpayPaymentId)
      .where('status', '==', 'VERIFIED')
      .get();
    if (!existingAttempts.empty) {
      throw new Error('Replay attack detected: This payment has already been verified.');
    }

    let success = false;
    let paymentAttemptId = '';
    let attemptDoc = null;

    await db.runTransaction(async (transaction) => {
      // Find the attempt doc ID outside transaction (as a hint), then re-read inside
      // for OCC safety. This ensures our read is part of the transaction snapshot.
      const hintDoc = await PaymentAttemptRepository.getByGatewayOrderId(razorpayOrderId);
      if (!hintDoc) throw new Error(`Payment attempt for Razorpay Order ID ${razorpayOrderId} not found.`);

      // Re-read inside transaction for OCC guarantees
      const attemptRef = PaymentAttemptRepository.collection.doc(hintDoc.attemptId);
      const attemptSnap = await transaction.get(attemptRef);
      if (!attemptSnap.exists) throw new Error(`Payment attempt ${hintDoc.attemptId} not found.`);

      attemptDoc = { id: attemptSnap.id, ...attemptSnap.data() };
      paymentAttemptId = attemptDoc.attemptId;

      if (attemptDoc.status === 'VERIFIED') {
        success = true;
        return;
      }

      // Execute all READS first
      const orderRef = OrderRepository.collection.doc(attemptDoc.orderId);
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists) throw new Error(`Order ${attemptDoc.orderId} not found.`);

      // Ensure ownership verification (BOLA mitigation)
      if (orderSnap.data().userId !== userId && userId !== 'system') {
        throw new Error('Unauthorized: You do not own this order.');
      }

      // finalizeReservation internally executes all gets (reads) before updates (writes)
      await InventoryService.finalizeReservation(transaction, attemptDoc.orderId, userId);

      // Execute all WRITES now
      transaction.update(attemptRef, {
        status: 'VERIFIED',
        gatewayPaymentId: razorpayPaymentId,
        signature: razorpaySignature,
        updatedAt: new Date().toISOString(),
        updatedBy: userId
      });

      const paymentRef = PaymentRepository.collection.doc(attemptDoc.paymentId);
      transaction.update(paymentRef, {
        status: 'CAPTURED',
        paymentMethod: params.paymentMethod || 'upi',
        updatedAt: new Date().toISOString(),
        updatedBy: userId
      });

      const timelineEntry = {
        status: 'PLACED',
        timestamp: new Date().toISOString(),
        title: 'Order Confirmed',
        description: 'Payment was successfully captured and order is placed.'
      };
      
      const currentTimeline = orderSnap.data().timeline || [];
      transaction.update(orderRef, {
        status: 'PLACED',
        timeline: [...currentTimeline, {
          status: 'PAYMENT_VERIFIED',
          timestamp: new Date().toISOString(),
          title: 'Payment Verified',
          description: 'Secure signature verification succeeded on server.'
        }, timelineEntry],
        paymentStatus: 'completed',
        updatedAt: new Date().toISOString(),
        updatedBy: userId
      });

      success = true;
    });

    if (success && attemptDoc) {
      paymentEmitter.emit('payment.verified', {
        orderId: attemptDoc.orderId,
        paymentAttemptId,
        userId: attemptDoc.userId || userId,
        amount: attemptDoc.amount
      });
    }

    return { verified: true };
  }
}

module.exports = new PaymentService();
