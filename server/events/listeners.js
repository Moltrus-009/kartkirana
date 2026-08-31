const paymentEmitter = require('./paymentEvents');
const InvoiceService = require('../services/invoiceService');
const AnalyticsService = require('../services/analyticsService');
const NotificationService = require('../services/notificationService');
const { db } = require('../config/firebase');

paymentEmitter.on('payment.verified', async (data) => {
  const { orderId, paymentAttemptId, userId, amount, paymentMethod = 'upi' } = data;
  console.log(`[EVENT] Received payment.verified event for order: ${orderId}`);

  try {
    await InvoiceService.generateInvoiceMetadata(orderId, userId);
  } catch (error) {
    console.error('[EVENT ERROR] Invoice generation failed:', error);
  }

  try {
    await AnalyticsService.trackPaymentSuccess(orderId, amount, paymentMethod);
  } catch (error) {
    console.error('[EVENT ERROR] Analytics tracking failed:', error);
  }

});

paymentEmitter.on('order.placed', async ({ orderId, userId }) => {
  try {
    if (db) {
      const orderSnap = await db.collection('orders').doc(orderId).get();
      if (orderSnap.exists) {
        const orderData = orderSnap.data();
        const shopId = orderData.shopId;
        await NotificationService.enqueueNotification(
          userId,
          'Order Confirmed!',
          `Your order ${orderId} has been successfully placed.`,
          'customer',
          orderId
        );

        if (shopId) {
          // Notification documents belong to a user, not a shop. Resolve the
          // merchant owner before enqueueing so it reaches the signed-in app.
          const shopSnap = await db.collection('shops').doc(shopId).get();
          const shopOwnerId = shopSnap.exists ? shopSnap.data().ownerId : null;
          if (shopOwnerId) {
            await NotificationService.enqueueNotification(
              shopOwnerId,
              'New Order Received',
              `You have a new order: ${orderId}. Click to accept.`,
              'shopkeeper',
              orderId
            );
          } else {
            console.warn(`[EVENT] Cannot notify shopkeeper: no owner found for shop ${shopId}.`);
          }
        }

      }
    }
  } catch (error) {
    console.error('[EVENT ERROR] Notification dispatch failed:', error);
  }
});
