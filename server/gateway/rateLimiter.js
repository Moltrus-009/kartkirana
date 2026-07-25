const rateLimit = require('express-rate-limit');
const limitsConfig = require('../config/limits');

const limiter = rateLimit({
  windowMs: limitsConfig.rateLimiter.windowMs,
  max: limitsConfig.rateLimiter.max,
  message: limitsConfig.rateLimiter.message,
  standardHeaders: true,
  legacyHeaders: false,
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

module.exports = limiter;
module.exports.orderLimiter = orderLimiter;
module.exports.complaintsLimiter = complaintsLimiter;

