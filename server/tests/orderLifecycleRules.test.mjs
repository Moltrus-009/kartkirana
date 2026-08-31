import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';

const here = dirname(fileURLToPath(import.meta.url));
const rules = await readFile(resolve(here, '../../firestore.rules'), 'utf8');
const environment = await initializeTestEnvironment({
  projectId: 'kartkirana-order-lifecycle-test',
  firestore: { rules }
});

const ownerId = 'owner_rules_test';
const riderId = 'rider_rules_test';
const customerId = 'customer_rules_test';
const otherCustomerId = 'customer_other_rules_test';
const shopId = 'shop_rules_test';

try {
  await environment.withSecurityRulesDisabled(async context => {
    const database = context.firestore();
    await Promise.all([
      setDoc(doc(database, 'users', ownerId), { uid: ownerId, role: 'owner', shopId }),
      // The same UID can be a customer while its rider role lives separately.
      setDoc(doc(database, 'users', riderId), { uid: riderId, role: 'customer', phone: '+919999999999' }),
      setDoc(doc(database, 'users', customerId), { uid: customerId, role: 'customer' }),
      setDoc(doc(database, 'users', otherCustomerId), { uid: otherCustomerId, role: 'customer' }),
      setDoc(doc(database, 'shops', shopId), { ownerId, name: 'Rules Test Shop' }),
      setDoc(doc(database, 'riders', riderId), {
        uid: riderId,
        role: 'rider',
        phone: '+919999999999',
        documentStatus: 'verified',
        status: 'online',
        online: true,
        coords: { lat: 28.60, lng: 77.33 }
      })
    ]);
  });

  const ownerDb = environment.authenticatedContext(ownerId, { role: 'owner', shopId }).firestore();
  const riderDb = environment.authenticatedContext(riderId, { role: 'rider' }).firestore();

  await environment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'orders', 'merchant_order'), {
      userId: customerId,
      shopId,
      status: 'PLACED',
      timeline: [],
      riderId: null,
      currentRiderId: null,
      batchId: null
    });
  });
  await assertSucceeds(updateDoc(doc(ownerDb, 'orders', 'merchant_order'), {
    status: 'SHOP_ACCEPTED', timeline: [{ status: 'SHOP_ACCEPTED' }], updatedAt: new Date().toISOString()
  }));
  await assertSucceeds(updateDoc(doc(ownerDb, 'orders', 'merchant_order'), {
    status: 'SEARCHING_RIDER', timeline: [{ status: 'SHOP_ACCEPTED' }, { status: 'SEARCHING_RIDER' }], updatedAt: new Date().toISOString()
  }));
  await assertFails(updateDoc(doc(ownerDb, 'orders', 'merchant_order'), {
    status: 'DELIVERED', timeline: [{ status: 'DELIVERED' }], updatedAt: new Date().toISOString()
  }));

  await environment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'orders', 'rider_order'), {
      userId: customerId,
      shopId,
      status: 'RIDER_ASSIGNED',
      timeline: [],
      riderId,
      currentRiderId: riderId,
      batchId: null,
      rider: { uid: riderId, name: 'Rules Rider', phone: '+919999999999', coords: { lat: 28.60, lng: 77.33 }, progress: 0 }
    });
  });
  const riderProgress = writeBatch(riderDb);
  riderProgress.update(doc(riderDb, 'orders', 'rider_order'), {
    status: 'ARRIVED_AT_SHOP',
    timeline: [{ status: 'ARRIVED_AT_SHOP' }],
    updatedAt: new Date().toISOString()
  });
  riderProgress.set(doc(riderDb, 'users', customerId, 'notifications', 'rider_arrived'), {
    id: 'rider_arrived', type: 'order', orderId: 'rider_order', title: 'Arrived', body: 'Rider arrived', createdAt: new Date().toISOString(), read: false
  });
  await assertSucceeds(riderProgress.commit());
  await assertFails(setDoc(doc(riderDb, 'users', otherCustomerId, 'notifications', 'forged'), {
    id: 'forged', type: 'order', orderId: 'rider_order', title: 'Forged', body: 'Wrong customer', createdAt: new Date().toISOString(), read: false
  }));
  await assertSucceeds(updateDoc(doc(riderDb, 'riders', riderId), {
    online: true,
    coords: { lat: 28.601, lng: 77.331 },
    latitude: 28.601,
    longitude: 77.331,
    updatedAt: new Date().toISOString()
  }));

  const batchOrderIds = ['batch_order_one', 'batch_order_two'];
  await environment.withSecurityRulesDisabled(async context => {
    const database = context.firestore();
    await setDoc(doc(database, 'batches', 'batch_rules_test'), {
      id: 'batch_rules_test', shopId, riderId, status: 'assigned', orderIds: batchOrderIds,
      stops: [{ id: 'pickup', type: 'pickup', orderId: batchOrderIds[0], orderIds: batchOrderIds, status: 'pending' }],
      currentStopIndex: 0
    });
    for (const orderId of batchOrderIds) {
      await setDoc(doc(database, 'orders', orderId), {
        userId: customerId,
        shopId,
        status: 'SEARCHING_RIDER',
        timeline: [],
        riderId: null,
        currentRiderId: riderId,
        batchId: 'batch_rules_test',
        rider: null
      });
    }
  });

  const acceptBatch = writeBatch(riderDb);
  acceptBatch.update(doc(riderDb, 'batches', 'batch_rules_test'), { status: 'accepted', updatedAt: new Date().toISOString() });
  for (const orderId of batchOrderIds) {
    acceptBatch.update(doc(riderDb, 'orders', orderId), {
      status: 'RIDER_ASSIGNED',
      riderId,
      currentRiderId: riderId,
      rider: { uid: riderId, name: 'Rules Rider', phone: '+919999999999', coords: { lat: 28.60, lng: 77.33 }, progress: 0 },
      timeline: [{ status: 'RIDER_ASSIGNED' }],
      updatedAt: new Date().toISOString()
    });
  }
  await assertSucceeds(acceptBatch.commit());

  const advanceBatch = writeBatch(riderDb);
  advanceBatch.update(doc(riderDb, 'batches', 'batch_rules_test'), {
    status: 'in_progress',
    stops: [{ id: 'pickup', type: 'pickup', orderId: batchOrderIds[0], orderIds: batchOrderIds, status: 'arrived' }],
    currentStopIndex: 0,
    updatedAt: new Date().toISOString()
  });
  for (const orderId of batchOrderIds) {
    advanceBatch.update(doc(riderDb, 'orders', orderId), {
      status: 'ARRIVED_AT_SHOP',
      timeline: [{ status: 'RIDER_ASSIGNED' }, { status: 'ARRIVED_AT_SHOP' }],
      updatedAt: new Date().toISOString()
    });
    advanceBatch.set(doc(riderDb, 'users', customerId, 'notifications', `notif_${orderId}_ARRIVED_AT_SHOP`), {
      id: `notif_${orderId}_ARRIVED_AT_SHOP`, type: 'order', orderId, title: 'Arrived', body: 'Rider arrived', createdAt: new Date().toISOString(), read: false
    });
  }
  await assertSucceeds(advanceBatch.commit());

  console.log('PASS: merchant transitions, rider notifications, live status, batch acceptance, and atomic batch progress rules');
} finally {
  await environment.cleanup();
}
