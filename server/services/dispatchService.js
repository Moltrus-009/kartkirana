const { db } = require('../config/firebase');
const NotificationService = require('./notificationService');

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const calculateRiderScore = (distance, rating, acceptanceRate, lastUpdatedIso, maxRadius = 15.0) => {
  // 1. Distance score (40%): 0km = 100 pts, maxRadius = 0 pts
  const distanceScore = Math.max(0, 100 - (distance / maxRadius) * 100);

  // 2. Rating score (30%): 5.0 stars = 100 pts, 1.0 star = 20 pts
  const numRating = Number(rating) || 4.5;
  const ratingScore = Math.min(100, Math.max(0, (numRating / 5.0) * 100));

  // 3. Acceptance rate score (20%): 100% = 100 pts
  const numAcceptance = Number(acceptanceRate) || 95;
  const acceptanceScore = Math.min(100, Math.max(0, numAcceptance));

  // 4. GPS Freshness score (10%): updated < 30s ago = 100 pts, 10 min ago = 0 pts
  const lastUpdatedMs = lastUpdatedIso ? new Date(lastUpdatedIso).getTime() : Date.now();
  const ageInSeconds = Math.max(0, (Date.now() - lastUpdatedMs) / 1000);
  const freshnessScore = Math.max(0, 100 - (ageInSeconds / 600) * 100);

  // Composite Score
  const score = (distanceScore * 0.40) + (ratingScore * 0.30) + (acceptanceScore * 0.20) + (freshnessScore * 0.10);
  return parseFloat(score.toFixed(2));
};

const calculateDynamicETA = (shopLat, shopLng, custLat, custLng, riderLat, riderLng) => {
  const RIDER_SPEED_KMH = 20; // Average city traffic speed (km/h)
  
  // Rider to Shop travel
  const riderToShopDist = calculateDistance(riderLat, riderLng, shopLat, shopLng);
  const riderToShopMins = (riderToShopDist / RIDER_SPEED_KMH) * 60;

  // Shop Prep Buffer
  const prepBufferMins = 8;

  // Shop to Customer travel
  const cLat = Number(custLat) || shopLat;
  const cLng = Number(custLng) || shopLng;
  const shopToCustDist = calculateDistance(shopLat, shopLng, cLat, cLng);
  const shopToCustMins = (shopToCustDist / RIDER_SPEED_KMH) * 60;

  // Handoff buffer
  const handoffBufferMins = 3;

  const totalMins = Math.ceil(riderToShopMins + prepBufferMins + shopToCustMins + handoffBufferMins);
  const clampedETA = Math.min(60, Math.max(12, totalMins));

  return {
    etaMinutes: clampedETA,
    estimatedDeliveryText: `${clampedETA}-${clampedETA + 5} Mins`
  };
};

class DispatchService {
  async handleVideoCallLifecycle() {
    try {
      const now = new Date();
      // A. Handle Ringing Timeouts (30 seconds)
      const ringingCallsSnap = await db.collection('videoCalls').where('status', '==', 'initiated').get();
      for (const callDoc of ringingCallsSnap.docs) {
        const callData = callDoc.data();
        const createdAt = new Date(callData.createdAt);
        if (now - createdAt > 30 * 1000) {
          console.log(`[VIDEO CALL SYSTEM] Call for Order ${callDoc.id} timed out (no answer). Marking missed.`);
          try {
            const callerCandidatesSnap = await callDoc.ref.collection('callerCandidates').get();
            for (const c of callerCandidatesSnap.docs) await c.ref.delete();
            const calleeCandidatesSnap = await callDoc.ref.collection('calleeCandidates').get();
            for (const c of calleeCandidatesSnap.docs) await c.ref.delete();
          } catch (e) {}

          await callDoc.ref.update({
            status: 'missed',
            endedAt: now.toISOString(),
            endedBy: 'system',
            offer: null,
            answer: null,
            updatedAt: now.toISOString()
          });
        }
      }

      // B. Terminate Call if associated Order has finished/canceled
      const activeCallsSnap = await db.collection('videoCalls').get();
      for (const callDoc of activeCallsSnap.docs) {
        const callData = callDoc.data();
        if (callData.status === 'initiated' || callData.status === 'connected') {
          const orderSnap = await db.collection('orders').doc(callDoc.id).get();
          let terminate = false;
          let reason = '';
          
          if (!orderSnap.exists) {
            terminate = true;
            reason = 'Order not found';
          } else {
            const orderData = orderSnap.data();
            const orderStatus = (orderData.status || '').toUpperCase();
            
            if (['DELIVERED', 'CANCELLED', 'FAILED', 'COMPLETED', 'AUTO_CANCELLED'].includes(orderStatus)) {
              terminate = true;
              reason = `Order status is ${orderData.status}`;
            } else if (orderData.riderId !== callData.riderId) {
              terminate = true;
              reason = 'Rider unassigned/reassigned';
            }
          }

          if (terminate) {
            console.log(`[VIDEO CALL SYSTEM] Terminating active call for Order ${callDoc.id} due to: ${reason}`);
            let duration = 0;
            const start = callData.startedAt || callData.createdAt;
            if (start) {
              duration = Math.max(0, Math.round((now.getTime() - new Date(start).getTime()) / 1000));
            }
            
            try {
              const callerCandidatesSnap = await callDoc.ref.collection('callerCandidates').get();
              for (const c of callerCandidatesSnap.docs) await c.ref.delete();
              const calleeCandidatesSnap = await callDoc.ref.collection('calleeCandidates').get();
              for (const c of calleeCandidatesSnap.docs) await c.ref.delete();
            } catch (e) {}

            await callDoc.ref.update({
              status: 'ended',
              endedAt: now.toISOString(),
              endedBy: 'system',
              duration,
              offer: null,
              answer: null,
              updatedAt: now.toISOString()
            });
          }
        }
      }
    } catch (err) {
      console.error('[VIDEO CALL LIFECYCLE ERROR]', err);
    }
  }

  async runCycle() {
    try {
      // Run video call lifecycle checks
      await this.handleVideoCallLifecycle();

      // 1. CLEAN UP EXPIRED REQUESTS (TIMEOUTS)
      const now = new Date();
      const pendingReqsSnap = await db.collection('dispatchRequests').where('status', '==', 'PENDING').get();
      
      const busyRiderIds = new Set();
      for (const doc of pendingReqsSnap.docs) {
        const reqData = doc.data();
        const expiresAt = new Date(reqData.expiresAt);
        
        if (expiresAt < now) {
          console.log(`[DISPATCH SYSTEM] Request ${doc.id} timed out.`);
          
          await db.runTransaction(async (transaction) => {
            const reqRef = db.collection('dispatchRequests').doc(doc.id);
            const orderRef = db.collection('orders').doc(reqData.orderId);
            
            const reqSnap = await transaction.get(reqRef);
            const orderSnap = await transaction.get(orderRef);
            
            if (reqSnap.exists && reqSnap.data().status === 'PENDING') {
              transaction.update(reqRef, {
                status: 'TIMEOUT',
                updatedAt: now.toISOString()
              });
              
              if (orderSnap.exists) {
                const orderData = orderSnap.data();
                const rejectedRiders = orderData.rejectedRiders || [];
                if (!rejectedRiders.includes(reqData.riderId)) {
                  rejectedRiders.push(reqData.riderId);
                }
                
                const currentTimeline = orderData.timeline || [];
                const timelineEntry = {
                  status: 'SEARCHING_RIDER',
                  timestamp: now.toISOString(),
                  title: 'Searching Delivery Executive',
                  desc: 'Rider request timed out. Auto-reassigning to another delivery partner...'
                };
                
                transaction.update(orderRef, {
                  dispatchStatus: 'IDLE',
                  currentRiderId: null,
                  rejectedRiders,
                  timeline: [...currentTimeline, timelineEntry],
                  updatedAt: now.toISOString()
                });
              }
            }
          });
        } else {
          // Keep active pending riders marked busy
          if (reqData.riderId) {
            busyRiderIds.add(reqData.riderId);
          }
        }
      }

      // 2. DISPATCH NEW MATCHES
      const acceptedOrdersSnap = await db.collection('orders').where('status', 'in', ['ACCEPTED', 'SHOP_ACCEPTED']).get();
      const searchingOrdersSnap = await db.collection('orders').where('status', '==', 'SEARCHING_RIDER').get();
      
      const ordersToDispatch = [];
      
      const addOrders = (snap) => {
        snap.docs.forEach(doc => {
          const order = { id: doc.id, ...doc.data() };
          if (order.dispatchStatus !== 'PENDING' && order.status !== 'RIDER_ASSIGNED') {
            ordersToDispatch.push(order);
          }
        });
      };
      
      addOrders(acceptedOrdersSnap);
      addOrders(searchingOrdersSnap);

      if (ordersToDispatch.length === 0) return;

      console.log(`[DISPATCH SYSTEM] Found ${ordersToDispatch.length} orders waiting for assignment.`);

      // Query riders profiles and locations
      const ridersSnap = await db.collection('users').where('role', '==', 'rider').get();
      const riderLocationsSnap = await db.collection('riders').get();
      
      const locationsMap = {};
      riderLocationsSnap.docs.forEach(doc => {
        locationsMap[doc.id] = doc.data();
      });

      // Filter riders to find active online ones
      const onlineRiders = [];
      for (const doc of ridersSnap.docs) {
        const profile = doc.data();
        const loc = locationsMap[doc.id];
        
        const isOnline = profile.status === 'online' || (loc && loc.online === true);
        const isVerified = profile.documentStatus === 'verified';
        const coords = profile.coords || (loc && loc.coords);
        const riderId = doc.id;
        
        if (isOnline && isVerified && coords && !busyRiderIds.has(riderId)) {
          const activeOrdersSnap = await db.collection('orders')
            .where('riderId', '==', riderId)
            .get();
          
          let busy = false;
          for (const orderDoc of activeOrdersSnap.docs) {
            const status = orderDoc.data().status;
            if (status !== 'DELIVERED' && status !== 'COMPLETED' && status !== 'cancelled' && status !== 'CANCELLED' && status !== 'SHOP_REJECTED') {
              busy = true;
              break;
            }
          }

          if (!busy) {
            onlineRiders.push({
              uid: riderId,
              fullName: profile.fullName || 'Rider Partner',
              phone: profile.phone || '',
              rating: profile.rating || 4.8,
              acceptanceRate: profile.acceptanceRate || 96,
              coords,
              lastUpdated: profile.updatedAt || (loc && loc.updatedAt) || new Date().toISOString()
            });
          }
        }
      }

      console.log(`[DISPATCH SYSTEM] Total idle online riders found: ${onlineRiders.length}`);

      const assignedInThisCycle = new Set();

      for (const order of ordersToDispatch) {
        let shopLat = 28.5835;
        let shopLng = 77.3142;
        
        if (order.shopCoords) {
          shopLat = order.shopCoords.lat;
          shopLng = order.shopCoords.lng;
        } else {
          const shopSnap = await db.collection('shops').doc(order.shopId).get();
          if (shopSnap.exists) {
            shopLat = shopSnap.data().lat || 28.5835;
            shopLng = shopSnap.data().lng || 77.3142;
          }
        }

        let rejectedRiders = order.rejectedRiders || [];
        
        // Auto-reassignment & exhaustion recovery check
        let availableOnlineNotAssigned = onlineRiders.filter(r => !assignedInThisCycle.has(r.uid));
        
        // If all available riders rejected, check if we should reset rejected list after cooling period
        if (availableOnlineNotAssigned.length > 0 && availableOnlineNotAssigned.every(r => rejectedRiders.includes(r.uid))) {
          console.log(`[DISPATCH SYSTEM] All nearby riders previously rejected Order #${order.id}. Resetting rejected list for auto-reassignment.`);
          rejectedRiders = [];
          await db.collection('orders').doc(order.id).update({
            rejectedRiders: [],
            updatedAt: new Date().toISOString()
          });
        }

        // Tiered distance radius scan: 5km -> 10km -> 15km
        let eligibleRiders = [];
        let maxSearchRadius = 10.0;
        for (const radiusLimit of [5.0, 10.0, 15.0]) {
          maxSearchRadius = radiusLimit;
          const matches = [];
          for (const rider of availableOnlineNotAssigned) {
            if (!rejectedRiders.includes(rider.uid)) {
              const distance = calculateDistance(shopLat, shopLng, rider.coords.lat, rider.coords.lng);
              if (distance <= radiusLimit) {
                const score = calculateRiderScore(distance, rider.rating, rider.acceptanceRate, rider.lastUpdated, radiusLimit);
                matches.push({ ...rider, distance, score });
              }
            }
          }
          if (matches.length > 0) {
            eligibleRiders = matches;
            break;
          }
        }

        if (eligibleRiders.length === 0) {
          console.log(`[DISPATCH SYSTEM] No eligible riders nearby for Order #${order.id}. Retrying next cycle.`);
          continue;
        }

        // Multi-Factor Ranking: Sort by composite score (highest score first)
        eligibleRiders.sort((a, b) => b.score - a.score);
        const targetRider = eligibleRiders[0];

        // Mark rider assigned in this cycle to prevent duplicate assignment
        assignedInThisCycle.add(targetRider.uid);

        // Compute dynamic ETA
        const custLat = order.deliveryAddress?.coords?.lat || order.deliveryAddress?.lat;
        const custLng = order.deliveryAddress?.coords?.lng || order.deliveryAddress?.lng;
        const etaResult = calculateDynamicETA(shopLat, shopLng, custLat, custLng, targetRider.coords.lat, targetRider.coords.lng);

        const requestId = `req_${order.id}_${targetRider.uid}`;
        const expiresAt = new Date(Date.now() + 30 * 1000).toISOString(); // 30s countdown

        await db.runTransaction(async (transaction) => {
          const orderRef = db.collection('orders').doc(order.id);
          const reqRef = db.collection('dispatchRequests').doc(requestId);

          const currentTimeline = order.timeline || [];
          const timelineEntry = {
            status: 'SEARCHING_RIDER',
            timestamp: new Date().toISOString(),
            title: 'Searching Delivery Partner',
            desc: `Matched partner: ${targetRider.fullName} (${targetRider.distance.toFixed(1)} km, score: ${targetRider.score}). Dispatching request...`
          };

          transaction.set(reqRef, {
            id: requestId,
            orderId: order.id,
            riderId: targetRider.uid,
            shopId: order.shopId,
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            expiresAt,
            distance: parseFloat(targetRider.distance.toFixed(2)),
            earnings: 45,
            timeoutSeconds: 30
          });

          transaction.update(orderRef, {
            status: 'SEARCHING_RIDER',
            dispatchStatus: 'PENDING',
            currentRiderId: targetRider.uid,
            estimatedDelivery: etaResult.estimatedDeliveryText,
            estimatedDeliveryMinutes: etaResult.etaMinutes,
            timeline: [...currentTimeline, timelineEntry],
            updatedAt: new Date().toISOString()
          });
        });

        await NotificationService.enqueueNotification(
          targetRider.uid,
          'New delivery request',
          `Pickup available from ${order.shopName || 'the shop'}. ETA: ${etaResult.estimatedDeliveryText}. Respond within 30 seconds.`,
          'rider',
          order.id
        );

        console.log(`[DISPATCH SYSTEM] Dispatched order ${order.id} to rider ${targetRider.fullName} (Score: ${targetRider.score}, Distance: ${targetRider.distance.toFixed(2)} km, ETA: ${etaResult.estimatedDeliveryText})`);
      }
    } catch (error) {
      console.error('[DISPATCH SYSTEM CRITICAL ERROR]', error);
    }
  }
}

module.exports = new DispatchService();
