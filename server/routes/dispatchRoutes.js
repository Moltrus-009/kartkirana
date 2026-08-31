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

  if (!orderId || !requestId) {
    return res.status(400).json({ error: 'Bad Request', message: 'A targeted order and dispatch request are required.' });
  }

  try {
    const orderRef = db.collection('orders').doc(orderId);
    const riderProfileRef = db.collection('riders').doc(riderId);
    const reqRef = db.collection('dispatchRequests').doc(requestId);

    const result = await db.runTransaction(async (transaction) => {
      const [orderSnap, riderSnap, reqSnap] = await Promise.all([
        transaction.get(orderRef),
        transaction.get(riderProfileRef),
        transaction.get(reqRef)
      ]);

      if (!orderSnap.exists) throw new Error('Order not found.');
      const orderData = orderSnap.data();
      const riderData = riderSnap.exists ? riderSnap.data() : {};
      const requestData = reqSnap.exists ? reqSnap.data() : null;

      const isApprovedRider = (riderData.role === 'rider' || req.user.role === 'rider') && riderData.documentStatus === 'verified';
      const isOnline = riderData.status === 'online' || riderData.online === true;
      if (!isApprovedRider || !isOnline) {
        return { success: false, status: 403, message: 'Only an approved delivery partner can accept this request.' };
      }
      if (!requestData || requestData.status !== 'PENDING') {
        return { success: false, status: 409, message: 'This delivery request is no longer pending.' };
      }
      if (requestData.riderId !== riderId || requestData.orderId !== orderId) {
        return { success: false, status: 403, message: 'This delivery request belongs to another partner.' };
      }
      if (new Date(requestData.expiresAt).getTime() <= Date.now()) {
        return { success: false, status: 409, message: 'This delivery request has expired. Wait for the next assignment.' };
      }
      if (orderData.currentRiderId !== riderId) {
        return { success: false, status: 409, message: 'This order has already moved to another delivery partner.' };
      }

      // Enforce valid transitions: SEARCHING_RIDER, ACCEPTED, SHOP_ACCEPTED, ready_for_pickup, READY
      const statusUpper = String(orderData.status || '').toUpperCase();
      if (statusUpper !== 'SEARCHING_RIDER' && statusUpper !== 'ACCEPTED' && statusUpper !== 'SHOP_ACCEPTED' && statusUpper !== 'READY_FOR_PICKUP' && statusUpper !== 'READY') {
        return { success: false, status: 409, message: `Invalid state transition. Order is in status: ${orderData.status}` };
      }

      // Check if order is already assigned
      if (orderData.riderId || orderData.rider) {
        return { success: false, status: 409, message: 'This delivery request has already been accepted by another rider.' };
      }

      transaction.update(reqRef, {
        status: 'ACCEPTED',
        updatedAt: now
      });
      if (riderSnap.exists && riderData.dispatchLockId === requestId) {
        transaction.update(riderProfileRef, { dispatchLockId: null, dispatchLockExpiresAt: null });
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
        currentRiderId: riderId,
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

      return { success: true, status: 200, message: 'Order successfully assigned to rider.' };
    });

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(result.status || 400).json(result);
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
    const riderProfileRef = db.collection('riders').doc(riderId);

    const result = await db.runTransaction(async (transaction) => {
      const [orderSnap, reqSnap, riderSnap] = await Promise.all([
        transaction.get(orderRef),
        transaction.get(reqRef),
        transaction.get(riderProfileRef)
      ]);

      if (!orderSnap.exists) throw new Error('Order not found.');
      if (!reqSnap.exists) throw new Error('Dispatch request not found.');

      const orderData = orderSnap.data();
      const reqData = reqSnap.data();
      const riderData = riderSnap.exists ? riderSnap.data() : {};

      if ((riderData.role !== 'rider' && req.user.role !== 'rider') || riderData.documentStatus !== 'verified') {
        return { success: false, status: 403, message: 'Only an approved delivery partner can reject this request.' };
      }
      if (reqData.riderId !== riderId || reqData.orderId !== orderId || orderData.currentRiderId !== riderId) {
        return { success: false, status: 403, message: 'This delivery request belongs to another partner.' };
      }

      if (reqData.status !== 'PENDING') {
        return { success: false, status: 409, message: 'Request is no longer pending.' };
      }

      transaction.update(reqRef, {
        status: 'REJECTED',
        updatedAt: now
      });
      if (riderSnap.exists && riderData.dispatchLockId === requestId) {
        transaction.update(riderProfileRef, { dispatchLockId: null, dispatchLockExpiresAt: null });
      }

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

      return { success: true, status: 200, message: 'Request successfully rejected.' };
    });

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(result.status || 400).json(result);
    }
  } catch (error) {
    console.error('[DISPATCH REJECT TRANSACTION ERROR]', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

module.exports = router;
