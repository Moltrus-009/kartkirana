const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const appCheckMiddleware = require('../middleware/appCheck');
const CouponService = require('../services/couponService');

// Customer Coupon Validation Route
router.post('/coupons/validate', authMiddleware, appCheckMiddleware, async (req, res) => {
  const { code, shopId, subtotal } = req.body;
  const userId = req.user.uid;

  if (!code) {
    return res.status(400).json({ valid: false, reason: 'Missing coupon code.' });
  }

  try {
    const result = await CouponService.validateAndApplyCoupon(code, userId, shopId, Number(subtotal) || 0);
    if (result.valid) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('[COUPON VALIDATE ERROR]', error);
    res.status(500).json({ valid: false, reason: 'Internal Server Error', message: error.message });
  }
});

module.exports = router;
