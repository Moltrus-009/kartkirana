const { AppError } = require('../utils/errors');

const validateCreateOrder = (req, res, next) => {
  const { shopId, items, deliveryAddress, paymentMethod = 'razorpay', walletCreditsUsed = 0, referralCode = '' } = req.body;
  if (!shopId || typeof shopId !== 'string') {
    return next(new AppError('Invalid or missing shopId.', 400));
  }
  if (!items || !Array.isArray(items) || items.length === 0 || items.length > 100) {
    return next(new AppError('Invalid or missing items list.', 400));
  }
  if (items.some(item => !item || typeof item.productId !== 'string' || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99)) {
    return next(new AppError('Each item must have a productId and a quantity from 1 to 99.', 400));
  }
  const productIds = items.map(item => item.productId);
  if (new Set(productIds).size !== productIds.length) {
    return next(new AppError('Duplicate product lines are not allowed. Combine quantities for the same product.', 400));
  }
  if (!deliveryAddress || typeof deliveryAddress !== 'object') {
    return next(new AppError('Missing deliveryAddress payload.', 400));
  }
  const lat = Number(deliveryAddress.coords?.lat ?? deliveryAddress.lat);
  const lng = Number(deliveryAddress.coords?.lng ?? deliveryAddress.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) {
    return next(new AppError('A valid delivery map location is required.', 400));
  }
  if (!['cod', 'razorpay', 'upi', 'card', 'net_banking'].includes(String(paymentMethod).toLowerCase())) {
    return next(new AppError('Unsupported payment method.', 400));
  }
  if (Number(walletCreditsUsed) !== 0 || referralCode) {
    return next(new AppError('Wallet credits and referral balance payments are currently unavailable.', 400));
  }
  next();
};

const validateVerifyPayment = (req, res, next) => {
  const { razorpayPaymentId, razorpayOrderId, razorpaySignature, orderId } = req.body;
  if (!razorpayPaymentId || typeof razorpayPaymentId !== 'string') {
    return next(new AppError('Missing or invalid razorpayPaymentId.', 400));
  }
  if (!razorpayOrderId || typeof razorpayOrderId !== 'string') {
    return next(new AppError('Missing or invalid razorpayOrderId.', 400));
  }
  if (!razorpaySignature || typeof razorpaySignature !== 'string') {
    return next(new AppError('Missing or invalid razorpaySignature.', 400));
  }
  if (!orderId || typeof orderId !== 'string') {
    return next(new AppError('Missing or invalid internal orderId.', 400));
  }
  next();
};

const validateRefund = (req, res, next) => {
  const { orderId, amount, reason } = req.body;
  if (!orderId || typeof orderId !== 'string') {
    return next(new AppError('Missing or invalid orderId.', 400));
  }
  if (!amount || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || Math.abs(Math.round(amount * 100) - amount * 100) > 1e-7) {
    return next(new AppError('Missing or invalid refund amount.', 400));
  }
  if (!reason || typeof reason !== 'string') {
    return next(new AppError('Missing refund reason details.', 400));
  }
  next();
};

const validateCodCollection = (req, res, next) => {
  if (!req.body.orderId || typeof req.body.orderId !== 'string') {
    return next(new AppError('Missing or invalid orderId.', 400));
  }
  next();
};

module.exports = {
  validateCreateOrder,
  validateVerifyPayment,
  validateRefund,
  validateCodCollection
};
