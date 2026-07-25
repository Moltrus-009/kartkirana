const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const appCheckMiddleware = require('../middleware/appCheck');
const { orderLimiter } = require('../gateway/rateLimiter');
const CancelService = require('../services/cancelService');
const { db } = require('../config/firebase');

/**
 * POST /v1/orders/:orderId/cancel
 *
 * Atomically cancels an order and releases/restores inventory.
 * Authorized for: order owner (customer), shop owner (merchant), admin.
 *
 * Body: { reason?: string }
 */
router.post('/orders/:orderId/cancel', authMiddleware, appCheckMiddleware, orderLimiter, async (req, res, next) => {
  const { orderId } = req.params;
  const { reason } = req.body || {};
  const uid = req.user.uid;

  if (!orderId) {
    return res.status(400).json({ error: 'Bad Request', message: 'Missing orderId.' });
  }

  try {
    // Determine the caller's role relative to this order
    let cancellerRole = 'customer'; // default

    // Check if user is admin
    const tokenClaims = req.user;
    if (tokenClaims.admin === true || ['super_admin', 'admin', 'operations', 'support'].includes(tokenClaims.role)) {
      cancellerRole = 'admin';
    } else if (tokenClaims.role === 'owner' || tokenClaims.role === 'shopkeeper') {
      // Verify they own the shop for this order
      if (db) {
        const orderSnap = await db.collection('orders').doc(orderId).get();
        if (orderSnap.exists) {
          const orderData = orderSnap.data();
          const shopSnap = await db.collection('shops').doc(orderData.shopId).get();
          if (shopSnap.exists && (shopSnap.data().ownerId === uid || !shopSnap.data().ownerId)) {
            cancellerRole = 'shopkeeper';
          }
        }
      } else {
        cancellerRole = 'shopkeeper';
      }
    }

    const result = await CancelService.cancelOrder(orderId, uid, cancellerRole, reason || '');
    res.status(200).json(result);
  } catch (error) {
    console.error(`[CANCEL ORDER ERROR] Order ${orderId}:`, error.message);
    
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: 'Forbidden', message: error.message });
    }
    if (error.message.includes('cannot be cancelled') || error.message.includes('not found')) {
      return res.status(400).json({ error: 'Bad Request', message: error.message });
    }
    
    next(error);
  }
});

module.exports = router;
