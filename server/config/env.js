const path = require('path');

// Developer secrets belong in the ignored .env.local file. The tracked .env
// fallback is retained for non-secret defaults in existing deployments.
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  PAYMENT_ENVIRONMENT: (process.env.PAYMENT_ENVIRONMENT || 'TEST').toUpperCase(), // TEST or LIVE
  USE_MOCK_DB: process.env.USE_MOCK_DB === 'true',
  
  // Razorpay Test
  RAZORPAY_KEY_ID_TEST: process.env.RAZORPAY_KEY_ID_TEST || '',
  RAZORPAY_KEY_SECRET_TEST: process.env.RAZORPAY_KEY_SECRET_TEST || '',
  RAZORPAY_WEBHOOK_SECRET_TEST: process.env.RAZORPAY_WEBHOOK_SECRET_TEST || '',
  
  // Razorpay Live
  RAZORPAY_KEY_ID_LIVE: process.env.RAZORPAY_KEY_ID_LIVE || '',
  RAZORPAY_KEY_SECRET_LIVE: process.env.RAZORPAY_KEY_SECRET_LIVE || '',
  RAZORPAY_WEBHOOK_SECRET_LIVE: process.env.RAZORPAY_WEBHOOK_SECRET_LIVE || '',
  
  // Firebase
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'kartkirana-3cd12',
  FIREBASE_SERVICE_ACCOUNT_KEY: process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '',
  
  // App Config
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['*'],
  MAINTENANCE_MODE: process.env.MAINTENANCE_MODE === 'true',
};

module.exports = env;
