const assert = require('node:assert/strict');
const { db } = require('../config/firebase');
const DispatchService = require('../services/dispatchService');

const riderId = 'integration-rider';
const shopId = 'integration-shop';
const orderIds = ['integration-order-1', 'integration-order-2'];
const now = new Date().toISOString();
const shopCoords = { lat: 26.76055, lng: 83.37317 };

const makeOrder = (id, index) => ({
  id,
  userId: `integration-customer-${index + 1}`,
  shopId,
  shopName: 'Integration Test Store',
  shopAddress: 'Test market',
  status: 'SEARCHING_RIDER',
  dispatchStatus: 'IDLE',
  riderId: null,
  currentRiderId: null,
  batchId: null,
  contact: { name: `Test Customer ${index + 1}`, phone: '0000000000' },
  deliveryAddress: {
    address: `Test address ${index + 1}`,
    coords: {
      lat: shopCoords.lat + 0.002 + (index * 0.001),
      lng: shopCoords.lng + 0.002 + (index * 0.001)
    }
  },
  timeline: [],
  createdAt: now,
  updatedAt: now
});

async function main() {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('This integration test may only run against the Firestore emulator.');
  }

  const rider = {
    uid: riderId,
    fullName: 'Integration Rider',
    phone: '0000000000',
    coords: { lat: shopCoords.lat, lng: shopCoords.lng }
  };
  const orders = orderIds.map(makeOrder);

  await Promise.all([
    db.collection('users').doc(riderId).set({
      role: 'rider',
      fullName: rider.fullName,
      phone: rider.phone,
      documentStatus: 'verified',
      status: 'online',
      coords: rider.coords,
      updatedAt: now
    }),
    db.collection('riders').doc(riderId).set({
      uid: riderId,
      online: true,
      coords: rider.coords,
      updatedAt: now
    }),
    ...orders.map(order => db.collection('orders').doc(order.id).set(order))
  ]);

  const batch = await DispatchService.createTargetedBatch(orders, rider, shopCoords);
  assert.ok(batch, 'A compatible two-order batch should be created.');
  assert.equal(batch.status, 'assigned');
  assert.deepEqual(new Set(batch.orderIds), new Set(orderIds));
  assert.equal(batch.stops.length, 3, 'The route must contain one pickup and two delivery stops.');
  assert.equal(batch.totalEarnings, 35, 'Two ₹10 delivery fees plus the ₹15 batch bonus are expected.');
  assert.ok(batch.maxDeliverySpreadMeters <= 1500, 'Batch deliveries must remain within the configured spread.');

  const [batchSnapshot, riderSnapshot, ...orderSnapshots] = await Promise.all([
    db.collection('batches').doc(batch.id).get(),
    db.collection('riders').doc(riderId).get(),
    ...orderIds.map(orderId => db.collection('orders').doc(orderId).get())
  ]);
  assert.equal(batchSnapshot.data().source, 'automatic_dispatch');
  assert.equal(riderSnapshot.data().dispatchLockId, batch.id);
  orderSnapshots.forEach(snapshot => {
    assert.equal(snapshot.data().batchId, batch.id);
    assert.equal(snapshot.data().currentRiderId, riderId);
    assert.equal(snapshot.data().dispatchStatus, 'BATCH_PENDING');
  });

  const queueSnapshot = await db.collection('notificationQueue')
    .where('referenceId', '==', batch.id)
    .get();
  assert.equal(queueSnapshot.size, 1, 'The rider must receive one batch assignment notification.');
  assert.equal(queueSnapshot.docs[0].data().status, 'PENDING');

  await db.collection('batches').doc(batch.id).update({
    expiresAt: new Date(Date.now() - 1000).toISOString()
  });
  await DispatchService.expireStaleBatches(new Date());

  const [expiredBatch, releasedRider, ...releasedOrders] = await Promise.all([
    db.collection('batches').doc(batch.id).get(),
    db.collection('riders').doc(riderId).get(),
    ...orderIds.map(orderId => db.collection('orders').doc(orderId).get())
  ]);
  assert.equal(expiredBatch.data().status, 'rejected');
  assert.equal(releasedRider.data().dispatchLockId, null);
  releasedOrders.forEach(snapshot => {
    assert.equal(snapshot.data().batchId, null);
    assert.equal(snapshot.data().currentRiderId, null);
    assert.equal(snapshot.data().dispatchStatus, 'IDLE');
    assert.ok(snapshot.data().rejectedRiders.includes(riderId));
  });

  console.log('PASS: automatic batch creation, route ordering, rider lock, notification, and timeout release');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
