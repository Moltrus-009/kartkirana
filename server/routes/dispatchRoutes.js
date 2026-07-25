const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const appCheckMiddleware = require('../middleware/appCheck');
const { db } = require('../config/firebase');

// Transactional Rider Acceptance
router.post('/dispatch/accept', authMiddleware, appCheckMiddleware, async (req, res) => {
  const { orderId, requestId } = req.body;
  const riderId = req.user.uid;
  const now = new Date().toISOString();

  if (!orderId) {
    return res.status(400).json({ error: 'Bad Request', message: 'Missing orderId parameter.' });
  }

  try {
    const orderRef = db.collection('orders').doc(orderId);
    const riderProfileRef = db.collection('users').doc(riderId);

    const result = await db.runTransaction(async (transaction) => {
      const orderSnap = await transaction.get(orderRef);
      const riderSnap = await transaction.get(riderProfileRef);

      if (!orderSnap.exists) throw new Error('Order not found.');
      const orderData = orderSnap.data();
      const riderData = riderSnap.exists ? riderSnap.data() : {};

      // Enforce valid transitions: SEARCHING_RIDER, ACCEPTED, SHOP_ACCEPTED, ready_for_pickup, READY
      const statusUpper = String(orderData.status || '').toUpperCase();
      if (statusUpper !== 'SEARCHING_RIDER' && statusUpper !== 'ACCEPTED' && statusUpper !== 'SHOP_ACCEPTED' && statusUpper !== 'READY_FOR_PICKUP' && statusUpper !== 'READY') {
        return { success: false, message: `Invalid state transition. Order is in status: ${orderData.status}` };
      }

      // Check if order is already assigned
      if (orderData.riderId || orderData.rider) {
        return { success: false, message: 'This delivery request has already been accepted by another rider.' };
      }

      // If targeted dispatch request ID provided, lock request
      if (requestId) {
        const reqRef = db.collection('dispatchRequests').doc(requestId);
        const reqSnap = await transaction.get(reqRef);
        if (reqSnap.exists) {
          const reqData = reqSnap.data();
          if (reqData.status === 'PENDING' && reqData.riderId === riderId) {
            transaction.update(reqRef, {
              status: 'ACCEPTED',
              updatedAt: now
            });
          }
        }
      }

      const timelineEntry = {
        status: 'RIDER_ASSIGNED',
        timestamp: now,
        title: 'Delivery Executive Assigned',
        desc: `${riderData.fullName || 'Delivery Partner'} is assigned and driving to pickup location.`
      };

      // update order
      transaction.update(orderRef, {
        status: 'RIDER_ASSIGNED',
        dispatchStatus: 'ASSIGNED',
        riderId: riderId,
        rider: {
          uid: riderId,
          name: riderData.fullName || 'Rider Partner',
          phone: riderData.phone || '',
          coords: riderData.coords || { lat: 28.5835, lng: 77.3142 },
          progress: 0
        },
        timeline: [...(orderData.timeline || []), timelineEntry],
        updatedAt: now
      });

      return { success: true, message: 'Order successfully assigned to rider.' };
    });

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('[DISPATCH ACCEPT TRANSACTION ERROR]', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// Transactional Rider Rejection
router.post('/dispatch/reject', authMiddleware, appCheckMiddleware, async (req, res) => {
  const { orderId, requestId } = req.body;
  const riderId = req.user.uid;
  const now = new Date().toISOString();

  if (!orderId || !requestId) {
    return res.status(400).json({ error: 'Bad Request', message: 'Missing orderId or requestId.' });
  }

  try {
    const orderRef = db.collection('orders').doc(orderId);
    const reqRef = db.collection('dispatchRequests').doc(requestId);

    const result = await db.runTransaction(async (transaction) => {
      const orderSnap = await transaction.get(orderRef);
      const reqSnap = await transaction.get(reqRef);

      if (!orderSnap.exists) throw new Error('Order not found.');
      if (!reqSnap.exists) throw new Error('Dispatch request not found.');

      const orderData = orderSnap.data();
      const reqData = reqSnap.data();

      if (reqData.status !== 'PENDING') {
        return { success: false, message: 'Request is no longer pending.' };
      }

      transaction.update(reqRef, {
        status: 'REJECTED',
        updatedAt: now
      });

      const rejectedRiders = orderData.rejectedRiders || [];
      if (!rejectedRiders.includes(riderId)) {
        rejectedRiders.push(riderId);
      }

      transaction.update(orderRef, {
        dispatchStatus: 'IDLE',
        currentRiderId: null,
        rejectedRiders,
        updatedAt: now
      });

      return { success: true, message: 'Request successfully rejected.' };
    });

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('[DISPATCH REJECT TRANSACTION ERROR]', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

module.exports = router;
