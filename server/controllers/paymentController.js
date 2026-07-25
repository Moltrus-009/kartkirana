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
    
    // Override userId with the verified token's uid for absolute security
    req.body.userId = req.user.uid;
    const { userId, shopId, items, deliveryAddress, couponCode, walletCreditsUsed, referralCode, preorderSchedule, orderNotes, paymentMethod } = req.body;

      try {
        if (idempotencyKey) {
          const cachedRes = await IdempotencyRepository.findKey(idempotencyKey);
          if (cachedRes) {
            console.log(`[IDEMPOTENCY] Found duplicate request for key: ${idempotencyKey}`);
            return res.status(200).json(cachedRes.response);
          }
        }

        const safetyResult = await FraudService.evaluateTransactionSecurity(userId, req.body, req);
        if (!safetyResult.secure) {
          console.warn(`[FRAUD ALERT] Transaction flagged for user ${userId}:`, safetyResult.alerts);
        }

        const tempCartId = `${userId}_${shopId}`;
        try {
          await LockManager.acquireLock(tempCartId);
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

      await LockManager.releaseLock(tempCartId);

      if (idempotencyKey) {
        await IdempotencyRepository.saveKey(idempotencyKey, result, userId);
      }

      res.status(201).json(result);
    } catch (error) {
      const tempCartId = `${userId}_${shopId}`;
      await LockManager.releaseLock(tempCartId);
      next(error);
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
      const payments = paymentSnaps.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const attemptSnaps = await PaymentAttemptRepository.collection.where('orderId', '==', orderId).get();
      const attempts = attemptSnaps.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const refundSnaps = await RefundRepository.collection.where('orderId', '==', orderId).get();
      const refunds = refundSnaps.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      res.status(200).json({
        orderStatus: order.status,
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

    if (!db) {
      return res.status(200).json({ status: 'PROCESSING', mock: true });
    }

    try {
      const refundId = `rfnd_${crypto.randomBytes(6).toString('hex')}`;
      let paymentDoc = null;
      
      await db.runTransaction(async (transaction) => {
        const orderRef = OrderRepository.collection.doc(orderId);
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists) throw new Error(`Order ${orderId} not found`);

        const orderData = orderSnap.data();

        const paymentSnaps = await PaymentRepository.collection.where('orderId', '==', orderId).get();
        if (paymentSnaps.empty) throw new Error(`No payment document found for order ${orderId}`);
        paymentDoc = { id: paymentSnaps.docs[0].id, ...paymentSnaps.docs[0].data() };

        if (amount > paymentDoc.amount) {
          throw new Error('Refund amount exceeds the original payment value.');
        }

        const refundRef = RefundRepository.collection.doc(refundId);
        const refundDoc = {
          refundId,
          orderId,
          amount,
          reason,
          status: 'REFUND_REQUESTED',
          environment: paymentDoc.environment || 'TEST',
          gatewayPaymentId: paymentDoc.gatewayPaymentId || paymentDoc.paymentId
        };
        transaction.set(refundRef, RefundRepository._prepareDoc(refundDoc, userId, true));

        transaction.update(orderRef, {
          status: 'REFUNDED',
          updatedAt: new Date().toISOString(),
          updatedBy: userId
        });
      });

      const rzpRef = require('../providers/razorpay/RazorpayProvider');
      
      try {
        const refundRes = await rzpRef.createRefund(
          paymentDoc.gatewayPaymentId || paymentDoc.paymentId, 
          amount, 
          reason
        );
        await RefundRepository.update(refundId, {
          status: 'REFUND_COMPLETED',
          gatewayRefundId: refundRes.id,
          gatewayResponse: refundRes
        }, userId);
        console.log(`[REFUND SUCCESS] Refunded ${amount} for order ${orderId}`);
      } catch (refundError) {
        console.error('[REFUND ERROR] Gateway process failed:', refundError.message);
        await RefundRepository.update(refundId, {
          status: 'REFUND_FAILED',
          failureReason: refundError.message
        }, userId);
      }

      res.status(200).json({ refundId, status: 'PROCESSING' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PaymentController();
