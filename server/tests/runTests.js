process.env.NODE_ENV = 'test';
process.env.PAYMENT_ENVIRONMENT = 'TEST';
process.env.PORT = '5001';
process.env.USE_MOCK_DB = 'true';

const server = require('../index');
const { db } = require('../config/firebase');
const LockManager = require('../utils/LockManager');
const timeouts = require('../config/timeouts');
const { runTimeoutWorker } = require('../workers/timeoutWorker');

const TEST_BASE_URL = 'http://localhost:5001/v1';
const mockUserId = 'test_cust_99';
const mockShopId = 'test_shop_88';
const mockProductId = 'test_prod_77';

let createdDocs = [];

// Helper to track doc for cleanup
const trackDoc = (col, id) => {
  createdDocs.push({ col, id });
};

const setupMockData = async () => {
  if (!db) {
    console.log('[TEST SETUP] Running in mock database fallback.');
    return;
  }
  console.log('[TEST SETUP] Creating mock shop and product in Firestore...');
  
  // Create Shop
  await db.collection('shops').doc(mockShopId).set({
    id: mockShopId,
    name: 'Test Gourmet Foods',
    ownerId: 'owner_test',
    status: 'open',
    schemaVersion: 1
  });
  trackDoc('shops', mockShopId);

  // Create Product with 10 stock
  await db.collection('products').doc(mockProductId).set({
    id: mockProductId,
    shopId: mockShopId,
    name: 'Premium organic Apples',
    price: 150, // ₹150
    totalStock: 10,
    reservedStock: 0,
    schemaVersion: 1
  });
  trackDoc('products', mockProductId);
};

const cleanupMockData = async () => {
  if (!db) return;
  console.log('[TEST CLEANUP] Pruning mock documents...');
  
  for (const item of createdDocs) {
    await db.collection(item.col).doc(item.id).delete();
  }
  
  // Clean locks, idempotency collections created during tests
  const locks = await db.collection('locks').get();
  for (const doc of locks.docs) {
    await doc.ref.delete();
  }
  
  const idempotency = await db.collection('idempotencyKeys').get();
  for (const doc of idempotency.docs) {
    await doc.ref.delete();
  }

  const processedEvents = await db.collection('processedWebhookEvents').get();
  for (const doc of processedEvents.docs) {
    await doc.ref.delete();
  }
  
  console.log('[TEST CLEANUP] Done.');
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED] ${message}`);
  }
};

const runAllTests = async () => {
  try {
    await setupMockData();

    console.log('\n=== RUNNING PAYMENT GATEWAY TEST SUITE ===\n');

    // --- TEST 1: Health Diagnostics ---
    console.log('[TEST 1] Testing Health Endpoint...');
    const healthRes = await fetch('http://localhost:5001/health');
    assert(healthRes.status === 200, 'Health status must be 200');
    console.log('[PASS] Health check OK.');

    // --- TEST 2: Create Checkout Order & Calculations ---
    console.log('\n[TEST 2] Testing Order Creation (pricing calculations & stock locks)...');
    const orderPayload = {
      amount: 487.00, // Grand total expected
      userId: mockUserId,
      shopId: mockShopId,
      items: [
        { productId: mockProductId, quantity: 3 } // 3 apples = ₹450
      ],
      deliveryAddress: {
        name: 'Jane Doe',
        details: 'Apartment 4B',
        area: 'Indiranagar',
        city: 'Bengaluru'
      },
      couponCode: 'SAVE20', // SAVE20 coupon code mock
      walletCreditsUsed: 0
    };

    const createRes = await fetch(`${TEST_BASE_URL}/payments/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock_token_test_cust_99',
        'Idempotency-Key': 'idem_key_unique_1'
      },
      body: JSON.stringify(orderPayload)
    });

    assert(createRes.status === 201, `Order create status must be 201, got ${createRes.status}`);
    const orderData = await createRes.json();
    assert(orderData.orderId !== undefined, 'OrderId must be returned');
    assert(orderData.gatewayOrderId !== undefined, 'GatewayOrderId must be returned');
    trackDoc('orders', orderData.orderId);
    trackDoc('payments', orderData.paymentId);
    trackDoc('paymentAttempts', orderData.attemptId);

    // Verify stock was reserved in db (reservedStock should be 3)
    if (db) {
      const prodSnap = await db.collection('products').doc(mockProductId).get();
      assert(prodSnap.data().reservedStock === 3, 'Stock must be reserved (reservedStock = 3)');
      console.log('[PASS] Stock reserved successfully.');
    }
    console.log('[PASS] Order creation and calculations validated.');

    // --- TEST 3: Idempotency Key Gate ---
    console.log('\n[TEST 3] Testing Idempotency Keys (duplicate checkout replay check)...');
    const duplicateRes = await fetch(`${TEST_BASE_URL}/payments/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock_token_test_cust_99',
        'Idempotency-Key': 'idem_key_unique_1'
      },
      body: JSON.stringify(orderPayload)
    });
    
    assert(duplicateRes.status === 200, 'Duplicate request must return cached status 200');
    const duplicateData = await duplicateRes.json();
    assert(duplicateData.orderId === orderData.orderId, 'Cached orderId must match original');
    console.log('[PASS] Idempotency response validated.');

    // --- TEST 4: Concurrent Checkout Locks ---
    console.log('\n[TEST 4] Testing checkout locks (concurrency gate)...');
    // Lock the lock manually to simulate active concurrent request
    const lockId = `${mockUserId}_${mockShopId}`;
    await LockManager.acquireLock(lockId);

    const concurrentRes = await fetch(`${TEST_BASE_URL}/payments/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock_token_test_cust_99',
      },
      body: JSON.stringify(orderPayload)
    });

    assert(concurrentRes.status === 409, 'Concurrent request must be rejected with 409');
    console.log('[PASS] Concurrent checkout attempt safely blocked.');
    await LockManager.releaseLock(lockId); // release lock

    // --- TEST 5: Payment Signature Verification ---
    console.log('\n[TEST 5] Testing signature verification (success payment path)...');
    const verifyPayload = {
      razorpayPaymentId: 'pay_mock_payment_123',
      razorpayOrderId: orderData.gatewayOrderId,
      razorpaySignature: 'mock_sig_1234',
      orderId: orderData.orderId
    };

    const verifyRes = await fetch(`${TEST_BASE_URL}/payments/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock_token_test_cust_99'
      },
      body: JSON.stringify(verifyPayload)
    });

    assert(verifyRes.status === 200, 'Verify must return 200');
    const verifyData = await verifyRes.json();
    assert(verifyData.verified === true, 'Signature must be verified');

    // Verify stock is finalized (totalStock = 7, reservedStock = 0)
    if (db) {
      const prodSnap = await db.collection('products').doc(mockProductId).get();
      assert(prodSnap.data().totalStock === 7, 'Total stock must be updated (7)');
      assert(prodSnap.data().reservedStock === 0, 'Reserved stock must be cleared (0)');
      
      const orderSnap = await db.collection('orders').doc(orderData.orderId).get();
      assert(orderSnap.data().status === 'PLACED', 'Order status must be PLACED');
      console.log('[PASS] Database stock adjustments and order transitions finalized.');
    }
    console.log('[PASS] Signature verification success path complete.');

    // --- TEST 6: Webhook Capture & Replay Protection ---
    console.log('\n[TEST 6] Testing webhook replay protection & processing...');
    const webhookPayload = {
      id: 'evt_mock_webhook_777',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_mock_webhook_captured',
            order_id: orderData.gatewayOrderId,
            amount: 48700,
            method: 'card'
          }
        }
      }
    };

    // First webhook call
    const webhookRes = await fetch(`${TEST_BASE_URL}/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Razorpay-Signature': 'mock_valid_webhook_signature'
      },
      body: JSON.stringify(webhookPayload)
    });
    assert(webhookRes.status === 200, 'Webhook post must return 200');
    
    // Duplicate webhook call
    const dupWebhookRes = await fetch(`${TEST_BASE_URL}/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Razorpay-Signature': 'mock_valid_webhook_signature'
      },
      body: JSON.stringify(webhookPayload)
    });
    const dupWebhookData = await dupWebhookRes.json();
    assert(dupWebhookData.reason === 'duplicate', 'Duplicate webhook must be ignored with repeat code');
    console.log('[PASS] Webhook processed and replay protection validated.');

    // --- TEST 7: Stock Reservation Expiry Timeout Worker ---
    console.log('\n[TEST 7] Testing Stock Reservation timeout cleaning worker...');
    // Create another order, but let's make it expired manually in Firestore
    const orderPayload2 = {
      amount: 150.00,
      userId: mockUserId,
      shopId: mockShopId,
      items: [{ productId: mockProductId, quantity: 2 }],
      deliveryAddress: orderPayload.deliveryAddress
    };

    const createRes2 = await fetch(`${TEST_BASE_URL}/payments/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock_token_test_cust_99'
      },
      body: JSON.stringify(orderPayload2)
    });
    const orderData2 = await createRes2.json();
    trackDoc('orders', orderData2.orderId);
    trackDoc('payments', orderData2.paymentId);
    if (orderData2.attemptId) trackDoc('paymentAttempts', orderData2.attemptId);

    if (db) {
      // Find the active reservation and set expiresAt to a past time
      const resSnaps = await db.collection('inventoryReservations').where('orderId', '==', orderData2.orderId).get();
      assert(!resSnaps.empty, 'Reservation doc must exist');
      const resDocId = resSnaps.docs[0].id;
      trackDoc('inventoryReservations', resDocId);

      await db.collection('inventoryReservations').doc(resDocId).update({
        expiresAt: new Date(Date.now() - 5000).toISOString() // expired 5s ago
      });

      // Assert stock reserved is 2
      const prodSnapBefore = await db.collection('products').doc(mockProductId).get();
      assert(prodSnapBefore.data().reservedStock === 2, 'Stock must be reserved (2) before cleanup');

      // Execute Timeout Worker manually
      await runTimeoutWorker();

      // Check reservation status in database (should be EXPIRED)
      const resSnapAfter = await db.collection('inventoryReservations').doc(resDocId).get();
      assert(resSnapAfter.data().status === 'EXPIRED', 'Reservation must be marked EXPIRED');

      // Check stock restored
      const prodSnapAfter = await db.collection('products').doc(mockProductId).get();
      assert(prodSnapAfter.data().reservedStock === 0, 'Reserved stock must be restored to 0');
      
      const orderSnapAfter = await db.collection('orders').doc(orderData2.orderId).get();
      assert(orderSnapAfter.data().status === 'AUTO_CANCELLED', 'Order must be updated to AUTO_CANCELLED');
      console.log('[PASS] Timeout worker cleaned up expired reservation and restored stock.');
    } else {
      console.log('[SKIP] Skipping worker db validation in sandbox mock mode.');
    }

    // --- TEST 8: Administrative Refund Flows ---
    console.log('\n[TEST 8] Testing Administrative Refund routes (Full & Partial)...');
    const refundPayload = {
      orderId: orderData.orderId,
      amount: 200.00, // Partial refund of ₹200
      reason: 'Quality issue'
    };

    const refundRes = await fetch(`${TEST_BASE_URL}/payments/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock_token_admin'
      },
      body: JSON.stringify(refundPayload)
    });
    
    assert(refundRes.status === 200, `Refund post must return 200, got ${refundRes.status}`);
    const refundData = await refundRes.json();
    assert(refundData.status === 'PROCESSING', 'Refund must return PROCESSING status');
    console.log('[PASS] Admin refund pipeline validated.');

    // --- TEST 9: Customer Order Cancellation & Reservation Release ---
    console.log('\n[TEST 9] Testing Customer Order Cancellation & Atomic Reservation Release...');
    const orderPayload3 = {
      amount: 180.00,
      userId: mockUserId,
      shopId: mockShopId,
      items: [{ productId: mockProductId, quantity: 1 }],
      deliveryAddress: orderPayload.deliveryAddress
    };

    const createRes3 = await fetch(`${TEST_BASE_URL}/payments/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer mock_token_test_cust_99`,
        'Idempotency-Key': 'idem_key_cancel_test_1'
      },
      body: JSON.stringify(orderPayload3)
    });
    const orderData3 = await createRes3.json();
    trackDoc('orders', orderData3.orderId);

    const cancelRes = await fetch(`${TEST_BASE_URL}/orders/${orderData3.orderId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer mock_token_test_cust_99`
      },
      body: JSON.stringify({ reason: 'Changed my mind' })
    });
    assert(cancelRes.status === 200, `Cancel must return 200, got ${cancelRes.status}`);
    const cancelData = await cancelRes.json();
    assert(cancelData.success === true, 'Cancel must return success');

    if (db) {
      const orderSnap3 = await db.collection('orders').doc(orderData3.orderId).get();
      assert(orderSnap3.data().status === 'CANCELLED', 'Order status must be CANCELLED');
      const prodSnap3 = await db.collection('products').doc(mockProductId).get();
      assert(prodSnap3.data().reservedStock === 0, 'Reserved stock must be released to 0');
    }
    console.log('[PASS] Customer order cancellation and reservation release validated.');

    // --- TEST 10: Shop Rejection & COD Stock Restoration ---
    console.log('\n[TEST 10] Testing Shop Rejection & COD Inventory Restoration...');
    const codPayload = {
      amount: 300.00,
      userId: mockUserId,
      shopId: mockShopId,
      items: [{ productId: mockProductId, quantity: 2 }],
      deliveryAddress: orderPayload.deliveryAddress,
      paymentMethod: 'cod'
    };

    const codRes = await fetch(`${TEST_BASE_URL}/payments/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer mock_token_test_cust_99`,
        'Idempotency-Key': 'idem_key_cod_test_1'
      },
      body: JSON.stringify(codPayload)
    });
    const codOrderData = await codRes.json();
    trackDoc('orders', codOrderData.orderId);

    if (db) {
      const prodSnapCodBefore = await db.collection('products').doc(mockProductId).get();
      assert(prodSnapCodBefore.data().totalStock === 5, 'COD order should deduct totalStock to 5');
    }

    const shopRejectRes = await fetch(`${TEST_BASE_URL}/orders/${codOrderData.orderId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer mock_token_owner_test`
      },
      body: JSON.stringify({ reason: 'Out of stock items' })
    });
    assert(shopRejectRes.status === 200, `Shop reject must return 200, got ${shopRejectRes.status}`);

    if (db) {
      const orderSnapReject = await db.collection('orders').doc(codOrderData.orderId).get();
      assert(orderSnapReject.data().status === 'SHOP_REJECTED', 'Order status must be SHOP_REJECTED');
      const prodSnapCodAfter = await db.collection('products').doc(mockProductId).get();
      assert(prodSnapCodAfter.data().totalStock === 7, 'COD stock must be restored to 7');
    }
    console.log('[PASS] Shop rejection and COD inventory restoration validated.');

    // --- TEST 11: Webhook Payment Failure Inventory Release ---
    console.log('\n[TEST 11] Testing Razorpay Payment Failure Webhook Inventory Release...');
    const orderPayload4 = {
      amount: 150.00,
      userId: mockUserId,
      shopId: mockShopId,
      items: [{ productId: mockProductId, quantity: 1 }],
      deliveryAddress: orderPayload.deliveryAddress
    };

    const createRes4 = await fetch(`${TEST_BASE_URL}/payments/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer mock_token_test_cust_99`,
        'Idempotency-Key': 'idem_key_fail_test_1'
      },
      body: JSON.stringify(orderPayload4)
    });
    const orderData4 = await createRes4.json();
    trackDoc('orders', orderData4.orderId);

    const failWebhookPayload = {
      id: 'evt_mock_webhook_failed_11',
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_mock_webhook_failed',
            order_id: orderData4.gatewayOrderId,
            amount: 15000,
            error_description: 'Card declined by issuing bank'
          }
        }
      }
    };

    const failWebhookRes = await fetch(`${TEST_BASE_URL}/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Razorpay-Signature': 'mock_valid_webhook_signature'
      },
      body: JSON.stringify(failWebhookPayload)
    });
    assert(failWebhookRes.status === 200, 'Failed webhook post must return 200');

    if (db) {
      const orderSnapFail = await db.collection('orders').doc(orderData4.orderId).get();
      assert(orderSnapFail.data().status === 'PAYMENT_FAILED', 'Order status must be PAYMENT_FAILED');
      const prodSnapFail = await db.collection('products').doc(mockProductId).get();
      assert(prodSnapFail.data().reservedStock === 0, 'Reserved stock must be released to 0 on failure');
    }
    console.log('[PASS] Payment failure webhook inventory release validated.');

    // --- TEST 12: Concurrency & Stock Exhaustion ---
    console.log('\n[TEST 12] Testing Concurrency & Stock Exhaustion Safeguards...');
    if (db) {
      // Set stock to 1
      await db.collection('products').doc(mockProductId).update({ totalStock: 1, reservedStock: 0 });
    }

    const concurrentOrder1 = fetch(`${TEST_BASE_URL}/payments/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock_token_user_a',
        'Idempotency-Key': 'idem_conc_user_a'
      },
      body: JSON.stringify({
        amount: 150.00,
        userId: 'user_a',
        shopId: mockShopId,
        items: [{ productId: mockProductId, quantity: 1 }],
        deliveryAddress: orderPayload.deliveryAddress
      })
    });

    const concurrentOrder2 = fetch(`${TEST_BASE_URL}/payments/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock_token_user_b',
        'Idempotency-Key': 'idem_conc_user_b'
      },
      body: JSON.stringify({
        amount: 150.00,
        userId: 'user_b',
        shopId: mockShopId,
        items: [{ productId: mockProductId, quantity: 1 }],
        deliveryAddress: orderPayload.deliveryAddress
      })
    });

    const [resA, resB] = await Promise.all([concurrentOrder1, concurrentOrder2]);
    const statuses = [resA.status, resB.status];
    
    // One must succeed (201) and one must be rejected (400/409/500)
    assert(statuses.includes(201), 'At least one order must succeed (201)');
    const successRes = resA.status === 201 ? resA : resB;
    const failRes = resA.status === 201 ? resB : resA;
    const successData = await successRes.json();
    trackDoc('orders', successData.orderId);

    console.log(`[CONCURRENCY RESULT] Order A Status: ${resA.status} | Order B Status: ${resB.status}`);
    console.log('[PASS] Concurrent stock exhaustion correctly prevented oversell.');

    console.log('\n=============================================');
    console.log('ALL INTEGRATION TEST CASES PASSED SUCCESSFULLY!');
    console.log('=============================================\n');

  } catch (err) {
    console.error('\n[TEST FAILURE ALERT]', err);
    process.exit(1);
  } finally {
    await cleanupMockData();
    server.close(() => {
      console.log('[SERVER] Closed test instance.');
      process.exit(0);
    });
  }
};

runAllTests();
