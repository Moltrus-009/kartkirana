const RazorpayProvider = require('../providers/razorpay/RazorpayProvider');
const WebhookRepository = require('../repositories/WebhookRepository');
const PaymentAttemptRepository = require('../repositories/PaymentAttemptRepository');
const PaymentRepository = require('../repositories/PaymentRepository');
const OrderRepository = require('../repositories/OrderRepository');
const InventoryService = require('../services/inventoryService');
const paymentEmitter = require('../events/paymentEvents');
const { db } = require('../config/firebase');

const handleWebhook = async (req, res, next) => {
  const signatureHeader = req.header('X-Razorpay-Signature');
  const rawBody = req.rawBody || JSON.stringify(req.body);

  const isValid = RazorpayProvider.verifyWebhookSignature(rawBody, signatureHeader);
  if (!isValid) {
    console.warn('[WEBHOOK SIGNATURE FAILED] Invalid webhook signature detected.');
    return res.status(400).json({ error: 'Invalid webhook signature.' });
  }

  const event = req.body.event;
  const eventId = req.body.id;
  const payload = req.body.payload;

  console.log(`[WEBHOOK] Received event: ${event} | ID: ${eventId}`);

  const processed = await WebhookRepository.isProcessed(eventId);
  if (processed) {
    console.log(`[WEBHOOK DUPLICATE] Event ${eventId} has already been processed. Ignoring.`);
    return res.status(200).json({ status: 'ignored', reason: 'duplicate' });
  }

  try {
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentData = payload.payment.entity;
      const gatewayOrderId = paymentData.order_id;
      const gatewayPaymentId = paymentData.id;
      const amount = paymentData.amount / 100;

      const attemptDoc = await PaymentAttemptRepository.getByGatewayOrderId(gatewayOrderId);
      if (attemptDoc) {
        let success = false;
        
        await db.runTransaction(async (transaction) => {
          const attemptRef = PaymentAttemptRepository.collection.doc(attemptDoc.attemptId);
          const attemptSnap = await transaction.get(attemptRef);
          
          if (attemptSnap.data().status === 'VERIFIED') {
            success = true;
            return;
          }

          const orderRef = OrderRepository.collection.doc(attemptDoc.orderId);
          const orderSnap = await transaction.get(orderRef);

          // All reads must happen before writes (finalizeReservation executes its reads before writes internally)
          await InventoryService.finalizeReservation(transaction, attemptDoc.orderId, 'webhook');

          // Now execute writes
          transaction.update(attemptRef, {
            status: 'VERIFIED',
            gatewayPaymentId,
            updatedAt: new Date().toISOString(),
            updatedBy: 'webhook'
          });

          const paymentRef = PaymentRepository.collection.doc(attemptDoc.paymentId);
          transaction.update(paymentRef, {
            status: 'CAPTURED',
            paymentMethod: paymentData.method || 'upi',
            updatedAt: new Date().toISOString(),
            updatedBy: 'webhook'
          });

          const timelineEntry = {
            status: 'PLACED',
            timestamp: new Date().toISOString(),
            title: 'Order Confirmed (Webhook)',
            description: 'Payment was successfully captured by webhook event.'
          };

          const currentTimeline = orderSnap.data().timeline || [];
          transaction.update(orderRef, {
            status: 'PLACED',
            timeline: [...currentTimeline, {
              status: 'PAYMENT_VERIFIED',
              timestamp: new Date().toISOString(),
              title: 'Payment Verified (Webhook)',
              description: 'Webhook verification completed successfully.'
            }, timelineEntry],
            paymentStatus: 'completed',
            updatedAt: new Date().toISOString(),
            updatedBy: 'webhook'
          });

          success = true;
        });

        if (success) {
          paymentEmitter.emit('payment.verified', {
            orderId: attemptDoc.orderId,
            paymentAttemptId: attemptDoc.attemptId,
            userId: attemptDoc.userId || 'system',
            amount
          });
        }
      }
    } else if (event === 'payment.failed') {
      const paymentData = payload.payment.entity;
      const gatewayOrderId = paymentData.order_id;
      
      const attemptDoc = await PaymentAttemptRepository.getByGatewayOrderId(gatewayOrderId);
      if (attemptDoc) {
        await db.runTransaction(async (transaction) => {
          const attemptRef = PaymentAttemptRepository.collection.doc(attemptDoc.attemptId);
          const orderRef = OrderRepository.collection.doc(attemptDoc.orderId);
          
          // All reads must happen before writes
          const orderSnap = await transaction.get(orderRef);

          await InventoryService.releaseReservation(transaction, attemptDoc.orderId, 'RELEASED', 'webhook');

          // Now execute writes
          transaction.update(attemptRef, {
            status: 'FAILED',
            failureReason: paymentData.error_description || 'Gateway transaction failed',
            updatedAt: new Date().toISOString(),
            updatedBy: 'webhook'
          });

          const paymentRef = PaymentRepository.collection.doc(attemptDoc.paymentId);
          transaction.update(paymentRef, {
            status: 'FAILED',
            updatedAt: new Date().toISOString(),
            updatedBy: 'webhook'
          });

          const timelineEntry = {
            status: 'PAYMENT_FAILED',
            timestamp: new Date().toISOString(),
            title: 'Payment Failed',
            description: paymentData.error_description || 'Payment transaction failed on bank gateway.'
          };
          const currentTimeline = orderSnap.data().timeline || [];
          transaction.update(orderRef, {
            status: 'PAYMENT_FAILED',
            timeline: [...currentTimeline, timelineEntry],
            paymentStatus: 'failed',
            updatedAt: new Date().toISOString(),
            updatedBy: 'webhook'
          });
        });
      }
    }

    await WebhookRepository.markProcessed(eventId, { event });

    res.status(200).json({ status: 'ok', eventId });
  } catch (error) {
    console.error(`[WEBHOOK ERROR] Failed to process webhook event ${eventId}:`, error);
    res.status(500).json({ error: 'Webhook processing failed.' });
  }
};

module.exports = { handleWebhook };
