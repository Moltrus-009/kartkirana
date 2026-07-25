const Razorpay = require('razorpay');
const env = require('./env');

const activeEnv = env.PAYMENT_ENVIRONMENT; // 'TEST' or 'LIVE'

const credentials = {
  key_id: activeEnv === 'LIVE' ? env.RAZORPAY_KEY_ID_LIVE : env.RAZORPAY_KEY_ID_TEST,
  key_secret: activeEnv === 'LIVE' ? env.RAZORPAY_KEY_SECRET_LIVE : env.RAZORPAY_KEY_SECRET_TEST,
  webhook_secret: activeEnv === 'LIVE' ? env.RAZORPAY_WEBHOOK_SECRET_LIVE : env.RAZORPAY_WEBHOOK_SECRET_TEST,
};

let razorpayClient = null;
if (credentials.key_id && credentials.key_secret) {
  razorpayClient = new Razorpay({
    key_id: credentials.key_id,
    key_secret: credentials.key_secret
  });
  console.log(`[RAZORPAY] Initialized in ${activeEnv} mode`);
} else {
  console.warn(`[WARNING] Razorpay keys are not configured for active environment: ${activeEnv}`);
}

module.exports = {
  razorpayClient,
  keyId: credentials.key_id,
  keySecret: credentials.key_secret,
  webhookSecret: credentials.webhook_secret,
  environment: activeEnv
};
