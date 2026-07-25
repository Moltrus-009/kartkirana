const { db } = require('../config/firebase');
const CouponService = require('../services/couponService');
const OrderService = require('../services/orderService');

async function runCouponValidationTestSuite() {
  console.log('\n======================================================');
  console.log('      KART KIRANA COUPON & PROMOTION TEST SUITE       ');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  const testUserId = 'test_user_coupon_99';
  const testShopId = 'shop_test_coupon_1';

  // Seed test coupons into Firestore
  const mockCoupons = [
    {
      id: 'cpn_pct_cap',
      code: 'SUPER30',
      type: 'percentage',
      value: 30,
      minOrderValue: 200,
      maxDiscountCap: 50,
      status: 'active',
      usageLimit: 100,
      usedCount: 0
    },
    {
      id: 'cpn_expired',
      code: 'OLDEXPIRED',
      type: 'fixed',
      value: 100,
      minOrderValue: 100,
      validUntil: '2020-01-01T00:00:00.000Z',
      status: 'active'
    },
    {
      id: 'cpn_shop_only',
      code: 'EXCLUSIVE50',
      type: 'fixed',
      value: 50,
      minOrderValue: 100,
      shopId: 'shop_test_coupon_1',
      status: 'active'
    },
    {
      id: 'cpn_freedel',
      code: 'FREEFLY',
      type: 'free_delivery',
      value: 0,
      minOrderValue: 150,
      status: 'active'
    },
    {
      id: 'cpn_limit_exhausted',
      code: 'EXHAUSTED10',
      type: 'fixed',
      value: 10,
      minOrderValue: 50,
      usageLimit: 5,
      usedCount: 5,
      status: 'active'
    }
  ];

  if (db) {
    for (const c of mockCoupons) {
      await db.collection('coupons').doc(c.id).set(c);
    }
  }

  // TEST 1: Percentage discount with Max Cap enforcement
  try {
    console.log('[TEST 1] Testing Percentage Discount with Max Cap (SUPER30: 30% off, max ₹50)...');
    const res = await CouponService.validateAndApplyCoupon('SUPER30', testUserId, testShopId, 300); // 30% of 300 = 90, but cap = 50
    if (res.valid && res.discount === 50) {
      console.log(`[PASS] Percentage discount capped accurately at ₹50 (Raw: 90, Cap: 50).`);
      passed++;
    } else {
      console.error(`[FAIL] Discount calculation incorrect:`, res);
      failed++;
    }
  } catch (err) {
    console.error('[FAIL] Test 1 error:', err);
    failed++;
  }

  // TEST 2: Free Delivery Coupon
  try {
    console.log('\n[TEST 2] Testing Free Delivery Promotion (FREEFLY)...');
    const res = await CouponService.validateAndApplyCoupon('FREEFLY', testUserId, testShopId, 200);
    if (res.valid && res.isFreeDelivery && res.discount === 0) {
      console.log(`[PASS] Free delivery promotion validated successfully.`);
      passed++;
    } else {
      console.error(`[FAIL] Free delivery validation failed:`, res);
      failed++;
    }
  } catch (err) {
    console.error('[FAIL] Test 2 error:', err);
    failed++;
  }

  // TEST 3: Minimum Order Value Rejection
  try {
    console.log('\n[TEST 3] Testing Minimum Order Value Rejection (SUPER30 subtotal=100, min=200)...');
    const res = await CouponService.validateAndApplyCoupon('SUPER30', testUserId, testShopId, 100);
    if (!res.valid && res.reason.includes('Minimum order subtotal')) {
      console.log(`[PASS] Minimum order value rejection verified: "${res.reason}"`);
      passed++;
    } else {
      console.error(`[FAIL] Minimum order check bypassed:`, res);
      failed++;
    }
  } catch (err) {
    console.error('[FAIL] Test 3 error:', err);
    failed++;
  }

  // TEST 4: Expired Coupon Rejection
  try {
    console.log('\n[TEST 4] Testing Expired Coupon Rejection (OLDEXPIRED)...');
    const res = await CouponService.validateAndApplyCoupon('OLDEXPIRED', testUserId, testShopId, 200);
    if (!res.valid && res.reason.includes('expired')) {
      console.log(`[PASS] Expired coupon safely rejected: "${res.reason}"`);
      passed++;
    } else {
      console.error(`[FAIL] Expired coupon allowed:`, res);
      failed++;
    }
  } catch (err) {
    console.error('[FAIL] Test 4 error:', err);
    failed++;
  }

  // TEST 5: Shop-Specific Restriction Validation
  try {
    console.log('\n[TEST 5] Testing Shop-Specific Restriction (EXCLUSIVE50 for shop_test_coupon_1)...');
    const validShopRes = await CouponService.validateAndApplyCoupon('EXCLUSIVE50', testUserId, 'shop_test_coupon_1', 200);
    const wrongShopRes = await CouponService.validateAndApplyCoupon('EXCLUSIVE50', testUserId, 'wrong_shop_999', 200);

    if (validShopRes.valid && !wrongShopRes.valid && wrongShopRes.reason.includes('not applicable for this store')) {
      console.log(`[PASS] Shop-specific restriction enforced (Valid for target shop, blocked for unmatching shop).`);
      passed++;
    } else {
      console.error(`[FAIL] Shop restriction failed:`, { validShopRes, wrongShopRes });
      failed++;
    }
  } catch (err) {
    console.error('[FAIL] Test 5 error:', err);
    failed++;
  }

  // TEST 6: Usage Limit Rejection
  try {
    console.log('\n[TEST 6] Testing Global Usage Limit Rejection (EXHAUSTED10 used=5, limit=5)...');
    const res = await CouponService.validateAndApplyCoupon('EXHAUSTED10', testUserId, testShopId, 200);
    if (!res.valid && res.reason.includes('usage limit has been reached')) {
      console.log(`[PASS] Usage limit exhaustion safely rejected: "${res.reason}"`);
      passed++;
    } else {
      console.error(`[FAIL] Exhausted coupon allowed:`, res);
      failed++;
    }
  } catch (err) {
    console.error('[FAIL] Test 6 error:', err);
    failed++;
  }

  // TEST 7: Invalid Coupon Code Handling
  try {
    console.log('\n[TEST 7] Testing Non-Existent Invalid Coupon Code (FAKE999)...');
    const res = await CouponService.validateAndApplyCoupon('FAKE999', testUserId, testShopId, 200);
    if (!res.valid && res.reason.includes('invalid or does not exist')) {
      console.log(`[PASS] Non-existent code rejected: "${res.reason}"`);
      passed++;
    } else {
      console.error(`[FAIL] Fake coupon allowed:`, res);
      failed++;
    }
  } catch (err) {
    console.error('[FAIL] Test 7 error:', err);
    failed++;
  }

  // Cleanup test documents
  if (db) {
    console.log('\n[TEST CLEANUP] Pruning test coupon documents...');
    for (const c of mockCoupons) {
      await db.collection('coupons').doc(c.id).delete();
    }
  }

  console.log(`\n======================================================`);
  console.log(`COUPON ENGINE TEST RESULTS: ${passed} Passed | ${failed} Failed`);
  console.log(`======================================================\n`);

  if (failed > 0) process.exit(1);
}

runCouponValidationTestSuite();
