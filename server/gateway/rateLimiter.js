const rateLimit = require('express-rate-limit');
const limitsConfig = require('../config/limits');

const limiter = rateLimit({
  windowMs: limitsConfig.rateLimiter.windowMs,
  max: limitsConfig.rateLimiter.max,
  message: limitsConfig.rateLimiter.message,
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => process.env.NODE_ENV === 'test' || req.originalUrl.split('?')[0] === '/v1/payments/webhook',
});

const orderLimiter = rateLimit({
  windowMs: limitsConfig.orderLimiter.windowMs,
  max: limitsConfig.orderLimiter.max,
  message: limitsConfig.orderLimiter.message,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test'
});

const complaintsLimiter = rateLimit({
  windowMs: limitsConfig.complaintsLimiter.windowMs,
  max: limitsConfig.complaintsLimiter.max,
  message: limitsConfig.complaintsLimiter.message,
  standardHeaders: true,
  legacyHeaders: false,
});

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  message: { error: 'Webhook rate limit exceeded.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test'
});

const healthLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Health probe rate limit exceeded.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test'
});

module.exports = limiter;
module.exports.orderLimiter = orderLimiter;
module.exports.complaintsLimiter = complaintsLimiter;
module.exports.webhookLimiter = webhookLimiter;
module.exports.healthLimiter = healthLimiter;
