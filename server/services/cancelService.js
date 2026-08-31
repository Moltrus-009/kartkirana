const { db } = require('../config/firebase');
const OrderRepository = require('../repositories/OrderRepository');
const InventoryService = require('./inventoryService');
const NotificationService = require('./notificationService');
const CouponService = require('./couponService');
const PaymentRepository = require('../repositories/PaymentRepository');
const PaymentAttemptRepository = require('../repositories/PaymentAttemptRepository');
const { AppError } = require('../utils/errors');

/**
 * Cancellation states from which an order can be cancelled.
 * Once an order reaches PICKED_UP or beyond, it cannot be cancelled
 * because the rider physically has the goods.
 */
const CANCELLABLE_STATUSES = new Set([
  'DRAFT',
  'PLACED',
  'SHOP_ACCEPTED',
  'SEARCHING_RIDER',
  'RIDER_ASSIGNED',
  'ARRIVED_AT_SHOP',
  // Legacy statuses that may exist in Firestore:
  'confirmed',
  'accepted',
  'preparing',
  'ready_for_pickup',
]);

/**
 * Statuses where inventory was committed (COD) rather than reserved.
 * For these, we must restore totalStock on cancel.
 */
const COMMITTED_STATUSES = new Set([
  'PLACED',
  'SHOP_ACCEPTED',
  'SEARCHING_RIDER',
  'RIDER_ASSIGNED',
  'ARRIVED_AT_SHOP',
]);

class CancelService {
  /**
   * Atomically cancel an order and release/restore its inventory.
   *
   * @param {string} orderId
   * @param {string} cancelledBy - uid of the user performing cancellation
   * @param {'customer'|'shopkeeper'|'admin'} cancellerRole
   * @param {string} [reason] - human-readable reason
   * @returns {{ success: boolean, message: string }}
   */
  async cancelOrder(orderId, cancelledBy, cancellerRole, reason = '') {
    if (!db) throw new AppError('Database connection is unavailable.', 503);

    const finalStatus = cancellerRole === 'shopkeeper' ? 'SHOP_REJECTED' : 'CANCELLED';
    const now = new Date().toISOString();

    // Check for active reservations BEFORE the transaction
    // (Firestore transactions cannot do collection queries, only doc gets)
    const hasReservations = await InventoryService.hasActiveReservations(orderId);
    const paymentHint = await PaymentRepository.getByOrderId(orderId);
    const attemptHint = await PaymentAttemptRepository.getLatestByOrderId(orderId);

    const cancellationApplied = await db.runTransaction(async (transaction) => {
      // Phase 1: ALL READS
      const orderRef = OrderRepository.collection.doc(orderId);
      const orderSnap = await transaction.get(orderRef);

      if (!orderSnap.exists) {
        throw new AppError('Order not found.', 404);
      }

      const orderData = orderSnap.data();
      const paymentRef = paymentHint ? PaymentRepository.collection.doc(paymentHint.id) : null;
      const attemptRef = attemptHint ? PaymentAttemptRepository.collection.doc(attemptHint.id || attemptHint.attemptId) : null;
      const paymentSnap = paymentRef ? await transaction.get(paymentRef) : null;
      const attemptSnap = attemptRef ? await transaction.get(attemptRef) : null;
      const couponRedemption = await CouponService.prepareOrderRedemption(transaction, { ...orderData, orderId });

      // Authorization check
      if (cancellerRole === 'customer' && orderData.userId !== cancelledBy) {
        throw new AppError('You do not own this order.', 403);
      }

      // Idempotency: a retry after a completed cancellation is successful.
      if (orderData.status === 'CANCELLED' || orderData.status === 'SHOP_REJECTED' || orderData.status === 'AUTO_CANCELLED') {
        return false;
      }

      const paymentStatus = paymentSnap?.data()?.status;
      if (
        orderData.paymentStatus === 'completed' ||
        ['CAPTURED', 'CAPTURED_REVIEW', 'PARTIALLY_REFUNDED'].includes(paymentStatus)
      ) {
        throw new AppError(
          'This paid order cannot be cancelled until a verified refund is started. Please contact support.',
          409
        );
      }

      // State guard: prevent cancellation of non-cancellable orders
      if (!CANCELLABLE_STATUSES.has(orderData.status)) {
        throw new AppError(
          `Order cannot be cancelled in its current state (${orderData.status}). ` +
          'Orders that have been picked up or delivered cannot be cancelled.',
          409
        );
      }

      // Determine inventory release strategy:
      // 1. If order has ACTIVE reservations (online payment pending) → releaseReservation
      // 2. If order is COD and in a committed status → restoreCommittedStock
      // 3. If order is DRAFT (checkout not completed) → no inventory action needed

      if (hasReservations) {
        // Online payment flow: reservation exists, release it
        await InventoryService.releaseReservation(transaction, orderId, 'CANCELLED', cancelledBy);
      } else if (orderData.status !== 'DRAFT' && COMMITTED_STATUSES.has(orderData.status)) {
        // COD flow or finalized payment: stock was committed, restore it
        const items = orderData.items || [];
        if (items.length > 0) {
          await InventoryService.restoreCommittedStock(transaction, items, cancelledBy);
        }
      }
      CouponService.releaseReservedRedemption(transaction, couponRedemption, finalStatus);

      // Phase 2: ALL WRITES
      const currentTimeline = orderData.timeline || [];
      const timelineEntry = {
        status: finalStatus,
        timestamp: now,
        title: cancellerRole === 'shopkeeper' ? 'Order Rejected by Shop' : 'Order Cancelled',
        description: reason || `Order ${finalStatus === 'SHOP_REJECTED' ? 'rejected' : 'cancelled'} by ${cancellerRole}.`,
      };

      transaction.update(orderRef, {
        status: finalStatus,
        paymentStatus: 'cancelled',
        timeline: [...currentTimeline, timelineEntry],
        updatedAt: now,
        updatedBy: cancelledBy,
      });
      if (paymentRef && paymentSnap?.exists && ['PENDING', 'CREATED', 'COD_PENDING'].includes(paymentStatus)) {
        transaction.update(paymentRef, {
          status: 'CANCELLED',
          updatedAt: now,
          updatedBy: cancelledBy
        });
      }
      if (attemptRef && attemptSnap?.exists && ['PENDING', 'CREATED'].includes(attemptSnap.data().status)) {
        transaction.update(attemptRef, {
          status: 'CANCELLED',
          updatedAt: now,
          updatedBy: cancelledBy
        });
      }
      return true;
    });

    // A repeated cancellation request is successful, but it must not enqueue a
    // second customer notification or repeat any other post-transaction work.
    if (!cancellationApplied) {
      return { success: true, message: `Order ${finalStatus === 'SHOP_REJECTED' ? 'rejected' : 'cancelled'} successfully.` };
    }

    // Post-transaction: fire-and-forget notifications (non-critical)
    try {
      const order = await OrderRepository.getById(orderId);
      if (order && order.userId) {
        const title = finalStatus === 'SHOP_REJECTED' ? 'Order Rejected' : 'Order Cancelled';
        const body = finalStatus === 'SHOP_REJECTED'
          ? `Your order from ${order.shopName || 'the shop'} was rejected by the merchant.${reason ? ' Reason: ' + reason : ''}`
          : `Your order #${orderId.slice(-6)} has been cancelled.${reason ? ' Reason: ' + reason : ''}`;

        await NotificationService.enqueueNotification(
          order.userId,
          title,
          body,
          'customer',
          orderId
        );
      }
    } catch (notifErr) {
      console.warn('[CancelService] Non-critical: notification failed after cancel:', notifErr.message);
    }

    return { success: true, message: `Order ${finalStatus === 'SHOP_REJECTED' ? 'rejected' : 'cancelled'} successfully.` };
  }
}

module.exports = new CancelService();
