const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const appCheckMiddleware = require('../middleware/appCheck');
const { db } = require('../config/firebase');

// Initiate Video Call
router.post('/video/initiate', authMiddleware, appCheckMiddleware, async (req, res) => {
  const { orderId } = req.body;
  const callerUid = req.user.uid;

  if (!orderId) {
    return res.status(400).json({ error: 'Bad Request', message: 'Missing orderId.' });
  }

  try {
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Order not found.' });
    }

    const orderData = orderSnap.data();

    // Verify caller belongs to order as Customer
    if (orderData.userId !== callerUid) {
      return res.status(403).json({ error: 'Forbidden', message: 'Only the customer who placed the order can initiate a call.' });
    }

    // Verify order has an assigned rider
    if (!orderData.riderId) {
      return res.status(403).json({ error: 'Forbidden', message: 'Cannot call. No rider has been assigned yet.' });
    }

    // Check order state
    const allowedStates = ['RIDER_ASSIGNED', 'ARRIVED_AT_SHOP', 'PICKED_UP', 'OUT_FOR_DELIVERY'];
    const currentStatus = (orderData.status || '').toUpperCase();

    if (!allowedStates.includes(currentStatus)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Video calls are not allowed when order is in state: ${orderData.status}. Allowed states are: ${allowedStates.join(', ')}`
      });
    }

    // Check if there is already an active call
    const callRef = db.collection('videoCalls').doc(orderId);
    const callSnap = await callRef.get();

    if (callSnap.exists) {
      const callData = callSnap.data();
      if (callData.status === 'initiated' || callData.status === 'connected') {
        return res.status(400).json({
          error: 'Conflict',
          message: 'An active video call session already exists for this order.',
          callId: orderId
        });
      }
    }

    // Create Call Document
    const now = new Date().toISOString();
    const callPayload = {
      id: orderId,
      orderId: orderId,
      customerId: orderData.userId,
      riderId: orderData.riderId,
      status: 'initiated',
      createdAt: now,
      startedAt: null,
      endedAt: null,
      endedBy: null,
      duration: 0,
      offer: null,
      answer: null
    };

    await callRef.set(callPayload);

    console.log(`[VIDEO CALL] Initiated call for Order ${orderId} (Customer: ${orderData.userId} -> Rider: ${orderData.riderId})`);
    
    return res.status(200).json({
      success: true,
      message: 'Video call initiated successfully.',
      call: callPayload
    });

  } catch (error) {
    console.error('[VIDEO CALL INITIATE ERROR]', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// Terminate Video Call & Purge Temporary Signaling Data
router.post('/video/terminate', authMiddleware, appCheckMiddleware, async (req, res) => {
  const { orderId, endedBy } = req.body;
  const userUid = req.user.uid;
  const now = new Date().toISOString();

  if (!orderId) {
    return res.status(400).json({ error: 'Bad Request', message: 'Missing orderId.' });
  }

  try {
    const callRef = db.collection('videoCalls').doc(orderId);
    const callSnap = await callRef.get();

    if (!callSnap.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Call session not found.' });
    }

    const callData = callSnap.data();

    // Verify authorized user
    if (callData.customerId !== userUid && callData.riderId !== userUid) {
      return res.status(403).json({ error: 'Forbidden', message: 'Unauthorized access to call session.' });
    }

    if (callData.status === 'ended') {
      return res.status(200).json({ success: true, message: 'Call already ended.' });
    }

    // Calculate duration
    let duration = 0;
    const start = callData.startedAt || callData.createdAt;
    if (start) {
      duration = Math.max(0, Math.round((new Date(now).getTime() - new Date(start).getTime()) / 1000));
    }

    // Clean up ICE candidate subcollections safely
    try {
      const callerCandidatesCol = callRef.collection('callerCandidates');
      const calleeCandidatesCol = callRef.collection('calleeCandidates');

      const callerCandidatesSnap = await callerCandidatesCol.get();
      for (const doc of callerCandidatesSnap.docs) {
        await doc.ref.delete();
      }

      const calleeCandidatesSnap = await calleeCandidatesCol.get();
      for (const doc of calleeCandidatesSnap.docs) {
        await doc.ref.delete();
      }
    } catch (cleanErr) {
      console.warn(`[VIDEO CALL CLEANUP WARNING] Failed cleaning ICE candidates: ${cleanErr.message}`);
    }

    // Update parent doc: remove SDP and change status
    const updatePayload = {
      status: 'ended',
      endedAt: now,
      endedBy: endedBy || (userUid === callData.customerId ? 'customer' : 'rider'),
      duration,
      offer: null,
      answer: null,
      updatedAt: now
    };

    await callRef.update(updatePayload);

    console.log(`[VIDEO CALL] Terminated call for Order ${orderId} (Duration: ${duration}s)`);

    return res.status(200).json({
      success: true,
      message: 'Call terminated and signaling data purged successfully.'
    });

  } catch (error) {
    console.error('[VIDEO CALL TERMINATE ERROR]', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

module.exports = router;
