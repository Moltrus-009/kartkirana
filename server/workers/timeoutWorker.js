const { db } = require('../config/firebase');
const ReservationRepository = require('../repositories/ReservationRepository');
const ProductRepository = require('../repositories/ProductRepository');
const OrderRepository = require('../repositories/OrderRepository');
const PaymentAttemptRepository = require('../repositories/PaymentAttemptRepository');
const PaymentRepository = require('../repositories/PaymentRepository');
const InventoryService = require('../services/inventoryService');
const NotificationService = require('../services/notificationService');
const CouponService = require('../services/couponService');

const runTimeoutWorker = async () => {
  if (!db) return;
  console.log('[TIMEOUT WORKER] Scanning for expired stock reservations...');
  
  const nowIso = new Date().toISOString();
  try {
    const expiredReservations = await ReservationRepository.getExpiredActiveReservations(nowIso);
    if (expiredReservations.length === 0) {
      console.log('[TIMEOUT WORKER] No expired active reservations found.');
      return;
    }

    console.log(`[TIMEOUT WORKER] Found ${expiredReservations.length} expired reservations. Grouping by order...`);

    // Group reservations by orderId
    const reservationsByOrder = new Map();
    for (const res of expiredReservations) {
      const list = reservationsByOrder.get(res.orderId) || [];
      list.push(res);
      reservationsByOrder.set(res.orderId, list);
    }

    for (const [orderId, reservations] of reservationsByOrder.entries()) {
      try {
        const latestAttempt = await PaymentAttemptRepository.getLatestByOrderId(orderId);
        const paymentHint = await PaymentRepository.getByOrderId(orderId);
        const userId = reservations[0]?.createdBy || 'system';

        await db.runTransaction(async (transaction) => {
          // Phase 1: ALL READS
          const resRefsMap = new Map();
          const prodSnapsMap = new Map();

          for (const res of reservations) {
            const resRef = ReservationRepository.collection.doc(res.reservationId);
            const resSnap = await transaction.get(resRef);
            if (resSnap.exists && resSnap.data().status === 'ACTIVE') {
              resRefsMap.set(res.reservationId, { resRef, resData: resSnap.data() });

              if (!prodSnapsMap.has(res.productId)) {
                const prodRef = ProductRepository.collection.doc(res.productId);
                const prodSnap = await transaction.get(prodRef);
                prodSnapsMap.set(res.productId, { prodRef, prodSnap });
              }
            }
          }

          if (resRefsMap.size === 0) return; // All already processed

          const orderRef = OrderRepository.collection.doc(orderId);
          const orderSnap = await transaction.get(orderRef);
          const paymentRef = paymentHint ? PaymentRepository.collection.doc(paymentHint.id) : null;
          const paymentSnap = paymentRef ? await transaction.get(paymentRef) : null;
          const couponRedemption = orderSnap.exists
            ? await CouponService.prepareOrderRedemption(transaction, { ...orderSnap.data(), orderId })
            : null;

          // Phase 2: ALL WRITES
          const quantities = new Map();
          for (const { resData } of resRefsMap.values()) {
            quantities.set(resData.productId, (quantities.get(resData.productId) || 0) + resData.quantity);
          }
          for (const [productId, quantity] of quantities) {
            const { prodSnap } = prodSnapsMap.get(productId);
            if (prodSnap && prodSnap.exists) {
              await ProductRepository.adjustStockInTransaction(transaction, productId, -quantity, true, prodSnap);
            }
          }
          for (const { resRef } of resRefsMap.values()) {
            transaction.update(resRef, {
              status: 'EXPIRED',
              updatedAt: new Date().toISOString(),
              updatedBy: 'timeout_worker'
            });
          }

          if (orderSnap.exists) {
            const orderData = orderSnap.data();
            if (orderData.status === 'DRAFT' || orderData.status === 'PAYMENT_PENDING' || orderData.status === 'PAYMENT_PROCESSING') {
              const currentTimeline = orderData.timeline || [];
              transaction.update(orderRef, {
                status: 'AUTO_CANCELLED',
                timeline: [...currentTimeline, {
                  status: 'AUTO_CANCELLED',
                  timestamp: new Date().toISOString(),
                  title: 'Order Expired',
                  description: 'Payment session expired. Reserved inventory has been released.'
                }],
                paymentStatus: 'expired',
                updatedAt: new Date().toISOString(),
                updatedBy: 'timeout_worker'
              });
            }
          }
          CouponService.releaseReservedRedemption(transaction, couponRedemption, 'PAYMENT_TIMEOUT');

          if (latestAttempt && ['CREATED', 'PENDING'].includes(latestAttempt.status)) {
            const attemptRef = PaymentAttemptRepository.collection.doc(latestAttempt.attemptId);
            transaction.update(attemptRef, {
              status: 'EXPIRED',
              updatedAt: new Date().toISOString(),
              updatedBy: 'timeout_worker'
            });
          }
          if (paymentRef && paymentSnap && paymentSnap.exists && ['CREATED', 'PENDING'].includes(paymentSnap.data().status)) {
            transaction.update(paymentRef, {
              status: 'EXPIRED',
              updatedAt: new Date().toISOString(),
              updatedBy: 'timeout_worker'
            });
          }
        });

        await NotificationService.enqueueNotification(
          userId,
          'Cart Released',
          `Your reservation for items in order ${orderId} has expired and stock is released.`,
          'customer',
          orderId
        );

        console.log(`[TIMEOUT WORKER SUCCESS] Cleaned up ${reservations.length} reservation(s) for Order ${orderId}`);
      } catch (err) {
        console.error(`[TIMEOUT WORKER ERROR] Failed to clean up reservations for Order ${orderId}:`, err.message);
      }
    }
  } catch (error) {
    console.error('[TIMEOUT WORKER ERROR] Scan failed:', error.message);
  }
};

const startTimeoutWorker = () => {
  runTimeoutWorker();
  setInterval(runTimeoutWorker, 60 * 1000);
  console.log('[TIMEOUT WORKER] Initialized polling interval (1 min)');
};

module.exports = { startTimeoutWorker, runTimeoutWorker };
