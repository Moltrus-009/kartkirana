const RazorpayProvider = require('../providers/razorpay/RazorpayProvider');
const WebhookRepository = require('../repositories/WebhookRepository');
const PaymentAttemptRepository = require('../repositories/PaymentAttemptRepository');
const PaymentRepository = require('../repositories/PaymentRepository');
const OrderRepository = require('../repositories/OrderRepository');
const RefundRepository = require('../repositories/RefundRepository');
const InventoryService = require('../services/inventoryService');
const CouponService = require('../services/couponService');
const paymentEmitter = require('../events/paymentEvents');
const { db } = require('../config/firebase');

const processedEventRef = (eventId) => WebhookRepository.collection.doc(eventId);

const createFinanceIncident = async (id, details) => {
  const safeId = String(id || 'unknown').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 180);
  const now = new Date().toISOString();
  await db.collection('financeIncidents').doc(safeId).set({
    incidentId: safeId,
    status: 'OPEN',
    severity: 'HIGH',
    ...details,
    updatedAt: now,
    createdAt: now
  }, { merge: true });
};

const handleCapturedPayment = async (paymentData, eventId) => {
  const gatewayOrderId = paymentData?.order_id;
  const gatewayPaymentId = paymentData?.id;
  if (!gatewayOrderId || !gatewayPaymentId) throw new Error('Captured payment webhook is missing gateway identifiers.');

  const attemptHint = await PaymentAttemptRepository.getByGatewayOrderId(gatewayOrderId);
  if (!attemptHint) {
    console.warn(`[WEBHOOK] No payment attempt found for gateway order ${gatewayOrderId}.`);
    await createFinanceIncident(`unknown_capture_${eventId}`, {
      type: 'UNKNOWN_CAPTURED_PAYMENT',
      gatewayOrderId,
      gatewayPaymentId,
      amountPaise: Number(paymentData?.amount || 0),
      currency: String(paymentData?.currency || ''),
      sourceEventId: eventId
    });
    return { newlyVerified: false, unknownAttempt: true };
  }
  const expectedAmountPaise = Number(attemptHint.amountPaise || Math.round(Number(attemptHint.amount) * 100));
  if (Number(paymentData.amount) !== expectedAmountPaise) throw new Error('Captured payment amount does not match the checkout amount.');
  if (String(paymentData.currency || 'INR').toUpperCase() !== 'INR') throw new Error('Captured payment currency is not INR.');
  if (paymentData.status && paymentData.status !== 'captured' && paymentData.captured !== true) {
    throw new Error('Payment webhook is not in captured state.');
  }

  let newlyVerified = false;
  let duplicateEvent = false;
  await db.runTransaction(async (transaction) => {
    const eventRef = processedEventRef(eventId);
    const attemptRef = PaymentAttemptRepository.collection.doc(attemptHint.id);
    const orderRef = OrderRepository.collection.doc(attemptHint.orderId);
    const paymentRef = PaymentRepository.collection.doc(attemptHint.paymentId);
    const [eventSnap, attemptSnap, orderSnap, paymentSnap] = await Promise.all([
      transaction.get(eventRef),
      transaction.get(attemptRef),
      transaction.get(orderRef),
      transaction.get(paymentRef)
    ]);
    if (eventSnap.exists) {
      duplicateEvent = true;
      return;
    }
    if (!attemptSnap.exists || !orderSnap.exists || !paymentSnap.exists) throw new Error('Internal payment records are incomplete.');

    const attempt = attemptSnap.data();
    const order = orderSnap.data();
    const couponRedemption = await CouponService.prepareOrderRedemption(transaction, { ...orderSnap.data(), orderId: attemptHint.orderId });
    if (attempt.gatewayOrderId !== gatewayOrderId) throw new Error('Gateway order mismatch.');
    if (attempt.status === 'VERIFIED') {
      if (attempt.gatewayPaymentId !== gatewayPaymentId) throw new Error('Order is already linked to a different captured payment.');
      transaction.set(eventRef, WebhookRepository._prepareDoc({ event: 'payment.captured', processedAt: new Date().toISOString() }, 'webhook', true));
      return;
    }
    if (!['DRAFT', 'PAYMENT_PENDING', 'PAYMENT_PROCESSING'].includes(order.status) || !['PENDING', 'CREATED'].includes(attempt.status)) {
      const now = new Date().toISOString();
      transaction.update(attemptRef, { status: 'CAPTURED_REVIEW', gatewayPaymentId, updatedAt: now, updatedBy: 'webhook' });
      transaction.update(paymentRef, {
        status: 'CAPTURED_REVIEW', gatewayOrderId, gatewayPaymentId,
        capturedAt: now, reviewReason: `Captured after order/attempt reached ${order.status}/${attempt.status}`,
        updatedAt: now, updatedBy: 'webhook'
      });
      transaction.update(orderRef, { paymentStatus: 'review_required', updatedAt: now, updatedBy: 'webhook' });
      transaction.set(eventRef, WebhookRepository._prepareDoc({ event: 'payment.captured', processedAt: now, reviewRequired: true }, 'webhook', true));
      return;
    }

    await InventoryService.finalizeReservation(transaction, attempt.orderId, 'webhook');
    CouponService.confirmReservedRedemption(transaction, couponRedemption);

    const now = new Date().toISOString();
    transaction.update(attemptRef, {
      status: 'VERIFIED',
      gatewayPaymentId,
      verifiedAt: now,
      updatedAt: now,
      updatedBy: 'webhook'
    });
    transaction.update(paymentRef, {
      status: 'CAPTURED',
      gatewayOrderId,
      gatewayPaymentId,
      paymentMethod: paymentData.method || paymentSnap.data().paymentMethod || 'upi',
      capturedAt: now,
      updatedAt: now,
      updatedBy: 'webhook'
    });
    transaction.update(orderRef, {
      status: 'PLACED',
      timeline: [...(order.timeline || []), {
        status: 'PAYMENT_VERIFIED',
        timestamp: now,
        title: 'Payment Verified',
        description: 'Captured payment confirmed by Razorpay webhook.'
      }, {
        status: 'PLACED',
        timestamp: now,
        title: 'Order Confirmed',
        description: 'The paid order is ready for merchant acceptance.'
      }],
      paymentStatus: 'completed',
      gatewayPaymentId,
      updatedAt: now,
      updatedBy: 'webhook'
    });
    transaction.set(eventRef, WebhookRepository._prepareDoc({ event: 'payment.captured', processedAt: now }, 'webhook', true));
    newlyVerified = true;
  });

  if (newlyVerified) {
    paymentEmitter.emit('payment.verified', {
      orderId: attemptHint.orderId,
      paymentAttemptId: attemptHint.attemptId || attemptHint.id,
      userId: attemptHint.userId || 'system',
      amount: attemptHint.amount,
      paymentMethod: paymentData.method || 'upi'
    });
    paymentEmitter.emit('order.placed', {
      orderId: attemptHint.orderId,
      userId: attemptHint.userId || 'system'
    });
  }
  return { newlyVerified, duplicateEvent };
};

const handleAuthorizedPayment = async (paymentData, eventId) => {
  const gatewayOrderId = paymentData?.order_id;
  const gatewayPaymentId = paymentData?.id;
  if (!gatewayOrderId || !gatewayPaymentId) throw new Error('Authorized payment webhook is missing gateway identifiers.');
  const attemptHint = await PaymentAttemptRepository.getByGatewayOrderId(gatewayOrderId);
  if (!attemptHint) {
    await createFinanceIncident(`unknown_authorized_${eventId}`, {
      type: 'UNKNOWN_AUTHORIZED_PAYMENT', gatewayOrderId, gatewayPaymentId, sourceEventId: eventId
    });
    return { unknownAttempt: true };
  }
  const expectedAmountPaise = Number(attemptHint.amountPaise || Math.round(Number(attemptHint.amount) * 100));
  if (Number(paymentData.amount) !== expectedAmountPaise) throw new Error('Authorized payment amount does not match the checkout amount.');
  if (String(paymentData.currency || 'INR').toUpperCase() !== 'INR') throw new Error('Authorized payment currency is not INR.');
  const captured = await RazorpayProvider.capturePayment(gatewayPaymentId, expectedAmountPaise, 'INR');
  return handleCapturedPayment({ ...paymentData, ...captured, order_id: gatewayOrderId, id: gatewayPaymentId }, eventId);
};

const handleFailedPayment = async (paymentData, eventId) => {
  const gatewayOrderId = paymentData?.order_id;
  if (!gatewayOrderId) throw new Error('Failed payment webhook is missing the gateway order ID.');
  const attemptHint = await PaymentAttemptRepository.getByGatewayOrderId(gatewayOrderId);
  if (!attemptHint) return { unknownAttempt: true };

  let duplicateEvent = false;
  await db.runTransaction(async (transaction) => {
    const eventRef = processedEventRef(eventId);
    const attemptRef = PaymentAttemptRepository.collection.doc(attemptHint.id);
    const orderRef = OrderRepository.collection.doc(attemptHint.orderId);
    const paymentRef = PaymentRepository.collection.doc(attemptHint.paymentId);
    const [eventSnap, attemptSnap, orderSnap, paymentSnap] = await Promise.all([
      transaction.get(eventRef),
      transaction.get(attemptRef),
      transaction.get(orderRef),
      transaction.get(paymentRef)
    ]);
    if (eventSnap.exists) {
      duplicateEvent = true;
      return;
    }
    if (!attemptSnap.exists || !orderSnap.exists || !paymentSnap.exists) throw new Error('Internal payment records are incomplete.');
    const attempt = attemptSnap.data();
    const order = orderSnap.data();
    const couponRedemption = await CouponService.prepareOrderRedemption(transaction, { ...orderSnap.data(), orderId: attemptHint.orderId });

    // Webhooks may arrive out of order. A late failure can never reverse a
    // payment that has already reached VERIFIED/CAPTURED.
    if (attempt.status === 'VERIFIED' || paymentSnap.data().status === 'CAPTURED') {
      transaction.set(eventRef, WebhookRepository._prepareDoc({ event: 'payment.failed', ignored: 'already_captured' }, 'webhook', true));
      return;
    }
    if (attempt.status === 'FAILED') {
      transaction.set(eventRef, WebhookRepository._prepareDoc({ event: 'payment.failed', ignored: 'already_failed' }, 'webhook', true));
      return;
    }
    if (['CANCELLED', 'SHOP_REJECTED', 'AUTO_CANCELLED'].includes(order.status)) {
      const now = new Date().toISOString();
      transaction.update(attemptRef, { status: 'CANCELLED', updatedAt: now, updatedBy: 'webhook' });
      if (['PENDING', 'CREATED'].includes(paymentSnap.data().status)) {
        transaction.update(paymentRef, { status: 'CANCELLED', updatedAt: now, updatedBy: 'webhook' });
      }
      transaction.set(eventRef, WebhookRepository._prepareDoc({ event: 'payment.failed', ignored: `order_${order.status}` }, 'webhook', true));
      return;
    }
    if (!['PENDING', 'CREATED'].includes(attempt.status)) {
      transaction.set(eventRef, WebhookRepository._prepareDoc({ event: 'payment.failed', ignored: `state_${attempt.status}` }, 'webhook', true));
      return;
    }

    await InventoryService.releaseReservation(transaction, attempt.orderId, 'RELEASED', 'webhook');
    CouponService.releaseReservedRedemption(transaction, couponRedemption, 'PAYMENT_FAILED');
    const now = new Date().toISOString();
    const reason = paymentData.error_description || 'Payment transaction failed at the bank or gateway.';
    transaction.update(attemptRef, {
      status: 'FAILED',
      gatewayPaymentId: paymentData.id || '',
      failureReason: reason,
      updatedAt: now,
      updatedBy: 'webhook'
    });
    transaction.update(paymentRef, { status: 'FAILED', failureReason: reason, updatedAt: now, updatedBy: 'webhook' });
    transaction.update(orderRef, {
      status: 'PAYMENT_FAILED',
      timeline: [...(order.timeline || []), {
        status: 'PAYMENT_FAILED',
        timestamp: now,
        title: 'Payment Failed',
        description: reason
      }],
      paymentStatus: 'failed',
      updatedAt: now,
      updatedBy: 'webhook'
    });
    transaction.set(eventRef, WebhookRepository._prepareDoc({ event: 'payment.failed', processedAt: now }, 'webhook', true));
  });
  return { duplicateEvent };
};

const handleRefundEvent = async (refundData, eventId, processed) => {
  const gatewayRefundId = refundData?.id;
  const internalRefundId = refundData?.notes?.internalRefundId || refundData?.receipt;
  let refundHint = internalRefundId ? await RefundRepository.getById(internalRefundId) : null;
  if (!refundHint && gatewayRefundId) {
    const snapshot = await RefundRepository.collection.where('gatewayRefundId', '==', gatewayRefundId).limit(1).get();
    if (!snapshot.empty) refundHint = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  }
  if (!refundHint) return { unknownRefund: true };
  const paymentHint = await PaymentRepository.getByOrderId(refundHint.orderId);
  if (!paymentHint) throw new Error('Refund payment record is missing.');

  let duplicateEvent = false;
  await db.runTransaction(async transaction => {
    const eventRef = processedEventRef(eventId);
    const refundRef = RefundRepository.collection.doc(refundHint.id);
    const paymentRef = PaymentRepository.collection.doc(paymentHint.id);
    const orderRef = OrderRepository.collection.doc(refundHint.orderId);
    const [eventSnap, refundSnap, paymentSnap, orderSnap] = await Promise.all([
      transaction.get(eventRef), transaction.get(refundRef), transaction.get(paymentRef), transaction.get(orderRef)
    ]);
    if (eventSnap.exists) { duplicateEvent = true; return; }
    if (!refundSnap.exists || !paymentSnap.exists) throw new Error('Refund ledger records are incomplete.');
    const refund = refundSnap.data();
    const payment = paymentSnap.data();
    if (gatewayRefundId && refund.gatewayRefundId && gatewayRefundId !== refund.gatewayRefundId) throw new Error('Refund gateway ID mismatch.');
    if (refundData.payment_id && refundData.payment_id !== payment.gatewayPaymentId) throw new Error('Refund payment ID mismatch.');
    if (refundData.amount != null && Number(refundData.amount) !== Math.round(Number(refund.amount) * 100)) throw new Error('Refund amount mismatch.');

    const now = new Date().toISOString();
    const wasCompleted = refund.status === 'REFUND_COMPLETED';
    const wasFailed = refund.status === 'REFUND_FAILED';
    if (processed && !wasCompleted) {
      const refundedAmount = Number(payment.refundedAmount || 0) + Number(refund.amount);
      const pendingRefundAmount = Math.max(0, Number(payment.pendingRefundAmount || 0) - Number(refund.amount));
      const fullyRefunded = refundedAmount >= Number(payment.amount) - 0.00001;
      transaction.update(refundRef, { status: 'REFUND_COMPLETED', gatewayStatus: 'processed', processedAt: now, updatedAt: now, updatedBy: 'webhook' });
      transaction.update(paymentRef, {
        status: fullyRefunded ? 'REFUNDED' : 'PARTIALLY_REFUNDED', refundedAmount, pendingRefundAmount,
        updatedAt: now, updatedBy: 'webhook'
      });
      if (orderSnap.exists) {
        const order = orderSnap.data();
        transaction.update(orderRef, {
          paymentStatus: fullyRefunded ? 'refunded' : 'partially_refunded',
          timeline: [...(order.timeline || []), {
            status: fullyRefunded ? 'PAYMENT_REFUNDED' : 'PAYMENT_PARTIALLY_REFUNDED', timestamp: now,
            title: fullyRefunded ? 'Payment Refunded' : 'Partial Refund Processed',
            description: `₹${Number(refund.amount).toFixed(2)} refund processed.`
          }],
          updatedAt: now, updatedBy: 'webhook'
        });
      }
    } else if (!processed && !wasCompleted && !wasFailed) {
      transaction.update(refundRef, { status: 'REFUND_FAILED', gatewayStatus: 'failed', failedAt: now, updatedAt: now, updatedBy: 'webhook' });
      transaction.update(paymentRef, {
        pendingRefundAmount: Math.max(0, Number(payment.pendingRefundAmount || 0) - Number(refund.amount)),
        updatedAt: now, updatedBy: 'webhook'
      });
    }
    transaction.set(eventRef, WebhookRepository._prepareDoc({ event: processed ? 'refund.processed' : 'refund.failed', processedAt: now }, 'webhook', true));
  });
  return { duplicateEvent };
};

const handleWebhook = async (req, res) => {
  const signatureHeader = req.header('X-Razorpay-Signature');
  const rawBody = req.rawBody;
  if (!rawBody || !RazorpayProvider.verifyWebhookSignature(rawBody, signatureHeader)) {
    console.warn('[WEBHOOK SIGNATURE FAILED] Invalid Razorpay webhook signature.');
    return res.status(400).json({ error: 'Invalid webhook signature.' });
  }

  const event = req.body?.event;
  const eventId = req.header('x-razorpay-event-id') || (RazorpayProvider.isTestHarness ? req.body?.id : null);
  if (!eventId) return res.status(400).json({ error: 'Missing x-razorpay-event-id header.' });

  try {
    let result = {};
    if (event === 'payment.captured' || event === 'order.paid') {
      result = await handleCapturedPayment(req.body?.payload?.payment?.entity, eventId);
    } else if (event === 'payment.authorized') {
      result = await handleAuthorizedPayment(req.body?.payload?.payment?.entity, eventId);
    } else if (event === 'payment.failed') {
      result = await handleFailedPayment(req.body?.payload?.payment?.entity, eventId);
    } else if (event === 'refund.processed' || event === 'refund.failed') {
      result = await handleRefundEvent(req.body?.payload?.refund?.entity, eventId, event === 'refund.processed');
    } else {
      if (await WebhookRepository.isProcessed(eventId)) {
        return res.status(200).json({ status: 'ignored', reason: 'duplicate', eventId });
      }
      await WebhookRepository.markProcessed(eventId, { event, ignored: true });
    }

    if (result.duplicateEvent) return res.status(200).json({ status: 'ignored', reason: 'duplicate', eventId });
    return res.status(200).json({ status: 'ok', eventId, ...result });
  } catch (error) {
    console.error(`[WEBHOOK ERROR] Failed to process ${eventId}:`, error);
    return res.status(500).json({ error: 'Webhook processing failed.' });
  }
};

module.exports = {
  handleWebhook,
  handleCapturedPayment,
  handleAuthorizedPayment,
  handleFailedPayment,
  handleRefundEvent,
  createFinanceIncident
};
