module.exports = {
  // Rate Limits
  rateLimiter: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: { error: 'Too many requests, please try again later.' }
  },

  orderLimiter: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 15, // Max 15 order creation or verify calls per minute
    message: { error: 'Too many payment/order attempts. Please wait a minute.' }
  },

  complaintsLimiter: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 5, // Max 5 complaints submissions per minute
    message: { error: 'Too many complaints submitted. Please wait a minute.' }
  },
  
  // Fraud Velocity Limits (requests per user)
  fraudVelocity: {
    paymentAttemptsMax: 5,
    paymentAttemptsWindowMs: 10 * 60 * 1000, // 10 minutes
  },
  
  // Transaction Limits (INR)
  orderAmount: {
    min: 10.00, // Minimum order ₹10
    max: 50000.00, // Maximum order ₹50,000
    codMax: 10000.00, // Cash on Delivery max ₹10,000
  }
};

