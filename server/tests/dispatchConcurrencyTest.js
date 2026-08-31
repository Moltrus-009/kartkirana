const { db } = require('../config/firebase');
const DispatchService = require('../services/dispatchService');

async function runDispatchEngineBenchmark() {
  console.log('\n======================================================');
  console.log('      KART KIRANA DISPATCH ENGINE BENCHMARK SUITE     ');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Verify Multi-Factor Scoring Ranking
  try {
    console.log('[TEST 1] Verifying Multi-Factor Rider Scoring Ranking...');
    const r1 = { uid: 'r_bench_1', rating: 4.9, acceptanceRate: 98, lastUpdated: new Date().toISOString(), coords: { lat: 28.585, lng: 77.315 } };
    const r2 = { uid: 'r_bench_2', rating: 4.2, acceptanceRate: 85, lastUpdated: new Date().toISOString(), coords: { lat: 28.581, lng: 77.311 } };
    const r3 = { uid: 'r_bench_3', rating: 5.0, acceptanceRate: 100, lastUpdated: new Date().toISOString(), coords: { lat: 28.600, lng: 77.330 } };

    await db.collection('riders').doc(r1.uid).set({ role: 'rider', status: 'online', online: true, documentStatus: 'verified', fullName: 'Rider High Rating', ...r1 });
    await db.collection('riders').doc(r2.uid).set({ role: 'rider', status: 'online', online: true, documentStatus: 'verified', fullName: 'Rider Closer Low Rating', ...r2 });
    await db.collection('riders').doc(r3.uid).set({ role: 'rider', status: 'online', online: true, documentStatus: 'verified', fullName: 'Rider Top Rated Farther', ...r3 });

    const testOrderId = 'ord_bench_dispatch_1';
    await db.collection('orders').doc(testOrderId).set({
      id: testOrderId,
      shopId: 'shop_bench_1',
      shopName: 'Bench Shop',
      shopCoords: { lat: 28.5835, lng: 77.3142 },
      deliveryAddress: { lat: 28.6000, lng: 77.3300 },
      status: 'SHOP_ACCEPTED',
      dispatchStatus: 'IDLE',
      rejectedRiders: [],
      timeline: []
    });

    await DispatchService.runCycle();

    const orderSnap = await db.collection('orders').doc(testOrderId).get();
    const orderData = orderSnap.data();

    if (orderData.dispatchStatus === 'PENDING' && orderData.currentRiderId === 'r_bench_1') {
      console.log(`[PASS] Multi-factor scoring selected best overall rider: ${orderData.currentRiderId} (ETA: ${orderData.estimatedDelivery})`);
      passed++;
    } else {
      console.error(`[FAIL] Unexpected rider selection: ${orderData?.currentRiderId}`);
      failed++;
    }
  } catch (err) {
    console.error('[FAIL] Test 1 Error:', err);
    failed++;
  }

  // Test 2: Concurrent Orders - Zero Duplicate Assignments Protection
  try {
    console.log('\n[TEST 2] Verifying Concurrency & Duplicate Assignment Protection...');
    const o2 = 'ord_bench_concur_2';
    const o3 = 'ord_bench_concur_3';

    await db.collection('orders').doc(o2).set({
      id: o2,
      shopId: 'shop_bench_1',
      shopCoords: { lat: 28.5835, lng: 77.3142 },
      deliveryAddress: { lat: 28.6000, lng: 77.3300 },
      status: 'SHOP_ACCEPTED',
      dispatchStatus: 'IDLE',
      rejectedRiders: [],
      timeline: []
    });

    await db.collection('orders').doc(o3).set({
      id: o3,
      shopId: 'shop_bench_1',
      shopCoords: { lat: 28.5835, lng: 77.3142 },
      deliveryAddress: { lat: 28.6000, lng: 77.3300 },
      status: 'SHOP_ACCEPTED',
      dispatchStatus: 'IDLE',
      rejectedRiders: [],
      timeline: []
    });

    const startTime = Date.now();
    await DispatchService.runCycle();
    const cycleTimeMs = Date.now() - startTime;

    const snap2 = await db.collection('orders').doc(o2).get();
    const snap3 = await db.collection('orders').doc(o3).get();

    const assignedRiders = [snap2.data()?.currentRiderId, snap3.data()?.currentRiderId].filter(Boolean);
    const uniqueAssigned = new Set(assignedRiders);

    if (assignedRiders.length === uniqueAssigned.size) {
      console.log(`[PASS] Zero duplicate rider assignments under concurrent dispatch. Cycle latency: ${cycleTimeMs}ms`);
      passed++;
    } else {
      console.error(`[FAIL] Duplicate rider assignment detected:`, assignedRiders);
      failed++;
    }
  } catch (err) {
    console.error('[FAIL] Test 2 Error:', err);
    failed++;
  }

  // Cleanup
  console.log('\n[TEST CLEANUP] Pruning test documents...');
  try {
    await db.collection('orders').doc('ord_bench_dispatch_1').delete();
    await db.collection('orders').doc('ord_bench_concur_2').delete();
    await db.collection('orders').doc('ord_bench_concur_3').delete();
    await db.collection('riders').doc('r_bench_1').delete();
    await db.collection('riders').doc('r_bench_2').delete();
    await db.collection('riders').doc('r_bench_3').delete();
  } catch (e) {}

  console.log(`\n======================================================`);
  console.log(`DISPATCH BENCHMARK RESULTS: ${passed} Passed | ${failed} Failed`);
  console.log(`======================================================\n`);

  if (failed > 0) process.exit(1);
}

runDispatchEngineBenchmark();
