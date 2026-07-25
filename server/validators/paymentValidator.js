const { AppError } = require('../utils/errors');

const validateCreateOrder = (req, res, next) => {
  const { amount, userId, shopId, items, deliveryAddress } = req.body;
  
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return next(new AppError('Invalid or missing amount. Must be a positive number.', 400));
  }
  if (!userId || typeof userId !== 'string') {
    return next(new AppError('Invalid or missing userId.', 400));
  }
  if (!shopId || typeof shopId !== 'string') {
    return next(new AppError('Invalid or missing shopId.', 400));
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return next(new AppError('Invalid or missing items list.', 400));
  }
  if (!deliveryAddress || typeof deliveryAddress !== 'object') {
    return next(new AppError('Missing deliveryAddress payload.', 400));
  }
  next();
};

const validateVerifyPayment = (req, res, next) => {
  const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
  if (!razorpayPaymentId || typeof razorpayPaymentId !== 'string') {
    return next(new AppError('Missing or invalid razorpayPaymentId.', 400));
  }
  if (!razorpayOrderId || typeof razorpayOrderId !== 'string') {
    return next(new AppError('Missing or invalid razorpayOrderId.', 400));
  }
  if (!razorpaySignature || typeof razorpaySignature !== 'string') {
    return next(new AppError('Missing or invalid razorpaySignature.', 400));
  }
  next();
};

const validateRefund = (req, res, next) => {
  const { orderId, amount, reason } = req.body;
  if (!orderId || typeof orderId !== 'string') {
    return next(new AppError('Missing or invalid orderId.', 400));
  }
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return next(new AppError('Missing or invalid refund amount.', 400));
  }
  if (!reason || typeof reason !== 'string') {
    return next(new AppError('Missing refund reason details.', 400));
  }
  next();
};

module.exports = {
  validateCreateOrder,
  validateVerifyPayment,
  validateRefund
};
