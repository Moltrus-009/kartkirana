const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const paymentValidator = require('../validators/paymentValidator');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const { handleWebhook } = require('../webhooks/razorpayWebhook');
const { orderLimiter } = require('../gateway/rateLimiter');
const appCheckMiddleware = require('../middleware/appCheck');

router.post('/payments/create-order', authMiddleware, appCheckMiddleware, orderLimiter, paymentValidator.validateCreateOrder, paymentController.createOrder);
router.post('/payments/verify', authMiddleware, appCheckMiddleware, orderLimiter, paymentValidator.validateVerifyPayment, paymentController.verifyPayment);

router.post('/payments/webhook', handleWebhook);

router.post('/payments/refund', authMiddleware, appCheckMiddleware, adminMiddleware, paymentValidator.validateRefund, paymentController.refundPayment);

router.get('/payments/status/:paymentId', authMiddleware, appCheckMiddleware, paymentController.getPaymentStatus);
router.get('/orders/:orderId/payment', authMiddleware, appCheckMiddleware, paymentController.getPaymentByOrderId);

module.exports = router;


