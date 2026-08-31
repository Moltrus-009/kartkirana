const { db } = require('../config/firebase');
const PaymentService = require('../services/paymentService');
const FraudService = require('../services/fraudService');
const LockManager = require('../utils/LockManager');
const IdempotencyRepository = require('../repositories/IdempotencyRepository');
const PaymentRepository = require('../repositories/PaymentRepository');
const PaymentAttemptRepository = require('../repositories/PaymentAttemptRepository');
const OrderRepository = require('../repositories/OrderRepository');
const RefundRepository = require('../repositories/RefundRepository');
const { AppError } = require('../utils/errors');
const crypto = require('crypto');

class PaymentController {
  async createOrder(req, res, next) {
    const idempotencyKey = req.header('Idempotency-Key');
    if (!idempotencyKey || !/^[A-Za-z0-9_-]{16,128}$/.test(idempotencyKey)) {
      return next(new AppError('A valid Idempotency-Key (16-128 letters, numbers, hyphens, or underscores) is required.', 400));
    }

    // Override userId with the verified token's uid for absolute security
    req.body.userId = req.user.uid;
    const { userId, shopId, items, deliveryAddress, couponCode, walletCreditsUsed, referralCode, preorderSchedule, orderNotes, paymentMethod } = req.body;
    const requestHash = crypto.createHash('sha256').update(JSON.stringify(req.body)).digest('hex');
    const tempCartId = `${userId}_${shopId}`;
    let lockToken = null;

    try {
        const cachedRes = await IdempotencyRepository.findKey(idempotencyKey, userId, requestHash);
        if (cachedRes?.conflict) {
          return next(new AppError('This checkout retry key was already used with different cart details.', 409));
        }
        if (cachedRes) {
          console.log(`[IDEMPOTENCY] Returning existing checkout for user ${userId}`);
          return res.status(200).json(cachedRes.response);
        }

        const safetyResult = await FraudService.evaluateTransactionSecurity(userId, req.body, req);
        if (!safetyResult.secure) {
          console.warn(`[FRAUD ALERT] Transaction flagged for user ${userId}:`, safetyResult.alerts);
          return next(new AppError('Checkout was blocked by transaction security checks. Please contact support.', 403));
        }

        try {
          lockToken = await LockManager.acquireLock(tempCartId);
        } catch (lockError) {
          return next(new AppError('Another checkout session is currently processing. Please wait.', 409));
        }

        const result = await PaymentService.initPayment(
          userId,
          shopId,
          items,
          deliveryAddress,
          couponCode,
          walletCreditsUsed,
          referralCode,
          preorderSchedule,
          orderNotes,
          paymentMethod
        );

      await IdempotencyRepository.saveKey(idempotencyKey, result, userId, requestHash);

      res.status(201).json(result);
    } catch (error) {
      next(error);
    } finally {
      if (lockToken) await LockManager.releaseLock(tempCartId, lockToken);
    }
  }

  async verifyPayment(req, res, next) {
    try {
      const result = await PaymentService.verifyPayment(req.body, req.user ? req.user.uid : 'system');
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async collectCodPayment(req, res, next) {
    try {
      const result = await PaymentService.collectCodPayment(req.body.orderId, req.user.uid);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getPaymentStatus(req, res, next) {
    const { paymentId } = req.params;
    try {
      const payment = await PaymentRepository.getById(paymentId);
      if (!payment) return next(new AppError(`Payment ${paymentId} not found`, 404));
      
      const role = req.user.role;
      const isAuthorized = req.user.admin === true || role === 'admin' || role === 'super_admin' || role === 'operations' || role === 'finance' || payment.userId === req.user.uid;
      
      if (!isAuthorized) {
        const { db } = require('../config/firebase');
        let isShopOwner = false;
        if (db && payment.shopId) {
          const shopDoc = await db.collection('shops').doc(payment.shopId).get();
          if (shopDoc.exists && shopDoc.data().ownerId === req.user.uid) {
            isShopOwner = true;
          }
        }
        if (!isShopOwner) {
          return next(new AppError('Forbidden: You do not have permission to view this payment.', 403));
        }
      }

      res.status(200).json(payment);
    } catch (error) {
      next(error);
    }
  }
 
  async getPaymentByOrderId(req, res, next) {
    const { orderId } = req.params;
    try {
      const order = await OrderRepository.getById(orderId);
      if (!order) return next(new AppError(`Order ${orderId} not found`, 404));
      
      const role = req.user.role;
      const isAuthorized = req.user.admin === true || role === 'admin' || role === 'super_admin' || role === 'operations' || role === 'finance' || order.userId === req.user.uid || order.riderId === req.user.uid;
      
      if (!isAuthorized) {
        const { db } = require('../config/firebase');
        let isShopOwner = false;
        if (db && order.shopId) {
          const shopDoc = await db.collection('shops').doc(order.shopId).get();
          if (shopDoc.exists && shopDoc.data().ownerId === req.user.uid) {
            isShopOwner = true;
          }
        }
        if (!isShopOwner) {
          return next(new AppError('Forbidden: You do not have permission to view payment info for this order.', 403));
        }
      }
 
      const paymentSnaps = await PaymentRepository.collection.where('orderId', '==', orderId).get();
      const payments = paymentSnaps.docs.map(doc => {
        const value = doc.data();
        return {
          id: doc.id,
          status: value.status,
          amount: value.amount,
          currency: value.currency,
          paymentMethod: value.paymentMethod || value.gateway,
          gatewayPaymentId: value.gatewayPaymentId || null,
          capturedAt: value.capturedAt || value.collectedAt || null,
          refundedAmount: Number(value.refundedAmount || 0)
        };
      });

      const attemptSnaps = await PaymentAttemptRepository.collection.where('orderId', '==', orderId).get();
      const attempts = attemptSnaps.docs.map(doc => {
        const value = doc.data();
        return {
          id: doc.id,
          status: value.status,
          gatewayOrderId: value.gatewayOrderId,
          gatewayPaymentId: value.gatewayPaymentId || null,
          failureReason: value.failureReason || null,
          createdAt: value.createdAt,
          verifiedAt: value.verifiedAt || null
        };
      });

      const refundSnaps = await RefundRepository.collection.where('orderId', '==', orderId).get();
      const refunds = refundSnaps.docs.map(doc => {
        const value = doc.data();
        return {
          id: doc.id,
          status: value.status,
          amount: value.amount,
          reason: value.reason || null,
          gatewayRefundId: value.gatewayRefundId || null,
          gatewayStatus: value.gatewayStatus || null,
          processedAt: value.processedAt || null,
          failedAt: value.failedAt || null
        };
      });

      res.status(200).json({
        orderStatus: order.status,
        paymentStatus: order.paymentStatus,
        paid: payments.some(payment => ['CAPTURED', 'CAPTURED_REVIEW', 'COD_COLLECTED', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(payment.status)),
        reviewRequired: payments.some(payment => payment.status === 'CAPTURED_REVIEW'),
        amount: order.total,
        payments,
        attempts,
        refunds
      });
    } catch (error) {
      next(error);
    }
  }

  async refundPayment(req, res, next) {
    const { orderId, amount, reason } = req.body;
    const userId = req.user ? req.user.uid : 'admin';
    const idempotencyKey = req.header('Idempotency-Key');
    if (!idempotencyKey || !/^[A-Za-z0-9_-]{16,128}$/.test(idempotencyKey)) {
      return next(new AppError('A valid Idempotency-Key is required for refunds.', 400));
    }
    const requestHash = crypto.createHash('sha256').update(JSON.stringify({ orderId, amount, reason })).digest('hex');
    const scopedKey = `refund_${idempotencyKey}`;
    const lockId = `refund_${orderId}`;
    let lockToken = null;
    try {
      const cached = await IdempotencyRepository.findKey(scopedKey, userId, requestHash);
      if (cached?.conflict) throw new AppError('This refund retry key was used with different details.', 409);
      if (cached) return res.status(200).json(cached.response);

      lockToken = await LockManager.acquireLock(lockId);
      const refundId = `rfnd_${crypto.randomBytes(6).toString('hex')}`;
      const paymentHint = await PaymentRepository.getByOrderId(orderId);
      if (!paymentHint) throw new AppError(`No payment document found for order ${orderId}`, 404);
      let paymentDoc;
      
      await db.runTransaction(async (transaction) => {
        const orderRef = OrderRepository.collection.doc(orderId);
        const paymentRef = PaymentRepository.collection.doc(paymentHint.id);
        const [orderSnap, paymentSnap] = await Promise.all([transaction.get(orderRef), transaction.get(paymentRef)]);
        if (!orderSnap.exists || !paymentSnap.exists) throw new AppError('Order payment records are incomplete.', 409);
        paymentDoc = { id: paymentSnap.id, ...paymentSnap.data() };
        if (!['CAPTURED', 'CAPTURED_REVIEW', 'PARTIALLY_REFUNDED'].includes(paymentDoc.status)) {
          throw new AppError(`Only captured payments can be refunded (current: ${paymentDoc.status}).`, 409);
        }
        const available = Number(paymentDoc.amount) - Number(paymentDoc.refundedAmount || 0) - Number(paymentDoc.pendingRefundAmount || 0);
        if (amount > available + 0.00001) throw new AppError(`Refund exceeds the available refundable amount of ₹${available.toFixed(2)}.`, 409);

        const refundRef = RefundRepository.collection.doc(refundId);
        const refundDoc = {
          refundId,
          orderId,
          amount,
          reason,
          status: 'REFUND_REQUESTED',
          environment: paymentDoc.environment || 'TEST',
          gatewayPaymentId: paymentDoc.gatewayPaymentId,
          requestedBy: userId
        };
        transaction.set(refundRef, RefundRepository._prepareDoc(refundDoc, userId, true));
        transaction.update(paymentRef, {
          pendingRefundAmount: Number(paymentDoc.pendingRefundAmount || 0) + amount,
          updatedAt: new Date().toISOString(), updatedBy: userId
        });
      });

      const rzpRef = require('../providers/razorpay/RazorpayProvider');
      try {
        const refundRes = await rzpRef.createRefund(paymentDoc.gatewayPaymentId, amount, reason, refundId);
        const isProcessed = refundRes.status === 'processed';
        let finalRefundCompleted = false;
        await db.runTransaction(async transaction => {
          const orderRef = OrderRepository.collection.doc(orderId);
          const paymentRef = PaymentRepository.collection.doc(paymentDoc.id);
          const refundRef = RefundRepository.collection.doc(refundId);
          const [orderSnap, paymentSnap, refundSnap] = await Promise.all([
            transaction.get(orderRef),
            transaction.get(paymentRef),
            transaction.get(refundRef)
          ]);
          if (!paymentSnap.exists || !refundSnap.exists) {
            throw new AppError('Refund ledger records are incomplete.', 409);
          }
          const currentPayment = paymentSnap.data();
          const currentRefund = refundSnap.data();
          const alreadyCompleted = currentRefund.status === 'REFUND_COMPLETED';
          finalRefundCompleted = alreadyCompleted || isProcessed;
          const applyCompletion = isProcessed && !alreadyCompleted;
          const refundedAmount = Number(currentPayment.refundedAmount || 0) + (applyCompletion ? amount : 0);
          const pendingRefundAmount = Math.max(0, Number(currentPayment.pendingRefundAmount || 0) - (applyCompletion ? amount : 0));
          const fullyRefunded = refundedAmount >= Number(currentPayment.amount) - 0.00001;
          transaction.update(refundRef, {
            status: alreadyCompleted ? 'REFUND_COMPLETED' : (isProcessed ? 'REFUND_COMPLETED' : 'REFUND_PROCESSING'),
            gatewayRefundId: refundRes.id,
            gatewayStatus: refundRes.status,
            ...(applyCompletion ? { processedAt: new Date().toISOString() } : {}),
            updatedAt: new Date().toISOString(), updatedBy: userId
          });
          transaction.update(paymentRef, {
            status: applyCompletion ? (fullyRefunded ? 'REFUNDED' : 'PARTIALLY_REFUNDED') : currentPayment.status,
            refundedAmount,
            pendingRefundAmount,
            updatedAt: new Date().toISOString(), updatedBy: userId
          });
          if (applyCompletion && orderSnap.exists) {
            const order = orderSnap.data();
            const now = new Date().toISOString();
            transaction.update(orderRef, {
              paymentStatus: fullyRefunded ? 'refunded' : 'partially_refunded',
              timeline: [...(order.timeline || []), {
                status: fullyRefunded ? 'PAYMENT_REFUNDED' : 'PAYMENT_PARTIALLY_REFUNDED',
                timestamp: now,
                title: fullyRefunded ? 'Payment Refunded' : 'Partial Refund Processed',
                description: `₹${amount.toFixed(2)} refund processed.`
              }],
              updatedAt: now, updatedBy: userId
            });
          }
        });
        const response = { refundId, status: finalRefundCompleted ? 'COMPLETED' : 'PROCESSING', gatewayRefundId: refundRes.id };
        await IdempotencyRepository.saveKey(scopedKey, response, userId, requestHash);
        return res.status(200).json(response);
      } catch (refundError) {
        console.error('[REFUND ERROR] Gateway process failed:', refundError.message);
        let completedDuringFailure = null;
        await db.runTransaction(async transaction => {
          const paymentRef = PaymentRepository.collection.doc(paymentDoc.id);
          const refundRef = RefundRepository.collection.doc(refundId);
          const [paymentSnap, refundSnap] = await Promise.all([
            transaction.get(paymentRef),
            transaction.get(refundRef)
          ]);
          if (refundSnap.exists && refundSnap.data().status === 'REFUND_COMPLETED') {
            completedDuringFailure = refundSnap.data().gatewayRefundId || null;
            return;
          }
          transaction.update(paymentRef, {
            pendingRefundAmount: Math.max(0, Number(paymentSnap.data().pendingRefundAmount || 0) - amount),
            updatedAt: new Date().toISOString(), updatedBy: userId
          });
          transaction.update(refundRef, {
            status: 'REFUND_FAILED', failureReason: refundError.message,
            updatedAt: new Date().toISOString(), updatedBy: userId
          });
        });
        if (completedDuringFailure) {
          const response = { refundId, status: 'COMPLETED', gatewayRefundId: completedDuringFailure };
          await IdempotencyRepository.saveKey(scopedKey, response, userId, requestHash);
          return res.status(200).json(response);
        }
        throw new AppError('The payment gateway did not accept the refund. No refundable balance was consumed.', 502);
      }
    } catch (error) {
      next(error);
    } finally {
      if (lockToken) await LockManager.releaseLock(lockId, lockToken);
    }
  }
}

module.exports = new PaymentController();
