const { db } = require('../config/firebase');
const RazorpayProvider = require('../providers/razorpay/RazorpayProvider');
const PaymentAttemptRepository = require('../repositories/PaymentAttemptRepository');
const RefundRepository = require('../repositories/RefundRepository');
const {
  handleCapturedPayment,
  handleAuthorizedPayment,
  handleFailedPayment,
  handleRefundEvent,
  createFinanceIncident
} = require('../webhooks/razorpayWebhook');

const isOlderThan = (value, ageMs) => {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) && Date.now() - timestamp >= ageMs;
};

const runPaymentReconciliation = async () => {
  if (!db) return;
  console.log('[PAYMENT RECONCILIATION] Starting bounded Razorpay reconciliation sweep.');

  const pendingSnapshot = await PaymentAttemptRepository.collection
    .where('status', 'in', ['CREATED', 'PENDING'])
    .limit(75)
    .get();

  for (const attemptDoc of pendingSnapshot.docs) {
    const attempt = { id: attemptDoc.id, ...attemptDoc.data() };
    if (!attempt.gatewayOrderId || !isOlderThan(attempt.updatedAt || attempt.createdAt, 20 * 1000)) continue;
    try {
      const response = await RazorpayProvider.fetchPaymentsForOrder(attempt.gatewayOrderId);
      const payments = Array.isArray(response?.items) ? response.items : [];
      const captured = payments.find(payment => payment.status === 'captured' || payment.captured === true);
      const authorized = payments.find(payment => payment.status === 'authorized');
      const failed = payments.find(payment => payment.status === 'failed');
      if (captured) {
        await handleCapturedPayment(captured, `reconcile_capture_${captured.id}`);
      } else if (authorized) {
        await handleAuthorizedPayment(authorized, `reconcile_authorized_${authorized.id}`);
      } else if (failed) {
        await handleFailedPayment(failed, `reconcile_failed_${failed.id}`);
      }
    } catch (error) {
      console.error(`[PAYMENT RECONCILIATION] Attempt ${attempt.id} failed:`, error.message);
      await createFinanceIncident(`reconcile_attempt_${attempt.id}`, {
        type: 'PAYMENT_RECONCILIATION_ERROR',
        paymentAttemptId: attempt.id,
        orderId: attempt.orderId,
        gatewayOrderId: attempt.gatewayOrderId,
        failureReason: error.message
      });
    }
  }

  const reviewSnapshot = await PaymentAttemptRepository.collection
    .where('status', '==', 'CAPTURED_REVIEW')
    .limit(75)
    .get();
  for (const doc of reviewSnapshot.docs) {
    const attempt = doc.data();
    await createFinanceIncident(`captured_review_${doc.id}`, {
      type: 'CAPTURED_PAYMENT_REQUIRES_REVIEW',
      paymentAttemptId: doc.id,
      orderId: attempt.orderId,
      gatewayOrderId: attempt.gatewayOrderId,
      gatewayPaymentId: attempt.gatewayPaymentId
    });
  }

  const refundSnapshot = await RefundRepository.collection
    .where('status', '==', 'REFUND_PROCESSING')
    .limit(50)
    .get();
  for (const refundDoc of refundSnapshot.docs) {
    const refund = { id: refundDoc.id, ...refundDoc.data() };
    if (!refund.gatewayRefundId) {
      await createFinanceIncident(`refund_missing_gateway_${refund.id}`, {
        type: 'REFUND_MISSING_GATEWAY_ID', refundId: refund.id, orderId: refund.orderId
      });
      continue;
    }
    try {
      const gatewayRefund = await RazorpayProvider.fetchRefund(refund.gatewayRefundId);
      if (gatewayRefund?.status === 'processed') {
        await handleRefundEvent(gatewayRefund, `reconcile_refund_processed_${refund.gatewayRefundId}`, true);
      } else if (gatewayRefund?.status === 'failed') {
        await handleRefundEvent(gatewayRefund, `reconcile_refund_failed_${refund.gatewayRefundId}`, false);
      } else if (isOlderThan(refund.updatedAt || refund.createdAt, 24 * 60 * 60 * 1000)) {
        await createFinanceIncident(`refund_stale_${refund.id}`, {
          type: 'REFUND_PROCESSING_TIMEOUT', refundId: refund.id, orderId: refund.orderId,
          gatewayRefundId: refund.gatewayRefundId, gatewayStatus: gatewayRefund?.status || 'unknown'
        });
      }
    } catch (error) {
      console.error(`[PAYMENT RECONCILIATION] Refund ${refund.id} failed:`, error.message);
      await createFinanceIncident(`reconcile_refund_${refund.id}`, {
        type: 'REFUND_RECONCILIATION_ERROR', refundId: refund.id, orderId: refund.orderId,
        gatewayRefundId: refund.gatewayRefundId, failureReason: error.message
      });
    }
  }

  console.log('[PAYMENT RECONCILIATION] Sweep complete.');
};

module.exports = { runPaymentReconciliation };
