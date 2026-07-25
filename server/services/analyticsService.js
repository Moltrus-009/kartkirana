const { db } = require('../config/firebase');

class AnalyticsService {
  async trackPaymentSuccess(orderId, amount, paymentMethod = 'upi') {
    console.log(`[ANALYTICS] Recording success metrics for order ${orderId} (₹${amount}) via ${paymentMethod}`);
    if (!db) return;

    const dateStr = new Date().toISOString().split('T')[0];
    const metricRef = db.collection('analytics').doc(dateStr);

    try {
      await db.runTransaction(async (transaction) => {
        const docSnap = await transaction.get(metricRef);
        const defaults = {
          date: dateStr,
          totalRevenue: 0,
          successCount: 0,
          paymentMethods: {},
          schemaVersion: 1
        };
        
        const current = docSnap.exists ? docSnap.data() : defaults;
        const newRevenue = (current.totalRevenue || 0) + amount;
        const newSuccess = (current.successCount || 0) + 1;
        
        const pMethods = { ...(current.paymentMethods || {}) };
        pMethods[paymentMethod] = (pMethods[paymentMethod] || 0) + 1;

        transaction.set(metricRef, {
          ...current,
          totalRevenue: newRevenue,
          successCount: newSuccess,
          paymentMethods: pMethods,
          updatedAt: new Date().toISOString()
        });
      });
    } catch (e) {
      console.error('[ANALYTICS ERROR] Failed to record payment success metric:', e);
    }
  }

  async trackPaymentFailure(orderId, reason = 'unknown') {
    console.log(`[ANALYTICS] Recording failure metrics for order ${orderId}. Reason: ${reason}`);
    if (!db) return;

    const dateStr = new Date().toISOString().split('T')[0];
    const metricRef = db.collection('analytics').doc(dateStr);

    try {
      await db.runTransaction(async (transaction) => {
        const docSnap = await transaction.get(metricRef);
        const defaults = {
          date: dateStr,
          failureCount: 0,
          failureReasons: {},
          schemaVersion: 1
        };
        
        const current = docSnap.exists ? docSnap.data() : defaults;
        const newFailure = (current.failureCount || 0) + 1;
        
        const reasons = { ...(current.failureReasons || {}) };
        reasons[reason] = (reasons[reason] || 0) + 1;

        transaction.set(metricRef, {
          ...current,
          failureCount: newFailure,
          failureReasons: reasons,
          updatedAt: new Date().toISOString()
        });
      });
    } catch (e) {
      console.error('[ANALYTICS ERROR] Failed to record payment failure metric:', e);
    }
  }
}

module.exports = new AnalyticsService();
