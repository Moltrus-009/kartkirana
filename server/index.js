const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');

// Strict production runtime validation. Firebase loads the module once during
// deployment discovery, before Secret Manager values are injected; validate
// only in a real server/function runtime so discovery never needs local secrets.
const isProductionRuntime = env.NODE_ENV === 'production'
  || Boolean(process.env.K_SERVICE || process.env.FUNCTION_TARGET);

if (isProductionRuntime) {
  if (env.USE_MOCK_DB === true || env.USE_MOCK_DB === 'true') {
    console.error('[FATAL CONFIG ERROR] USE_MOCK_DB cannot be enabled in production environments.');
    process.exit(1);
  }
  const activeKeyId = env.PAYMENT_ENVIRONMENT === 'LIVE' ? env.RAZORPAY_KEY_ID_LIVE : env.RAZORPAY_KEY_ID_TEST;
  const activeKeySecret = env.PAYMENT_ENVIRONMENT === 'LIVE' ? env.RAZORPAY_KEY_SECRET_LIVE : env.RAZORPAY_KEY_SECRET_TEST;
  const activeWebhookSecret = env.PAYMENT_ENVIRONMENT === 'LIVE' ? env.RAZORPAY_WEBHOOK_SECRET_LIVE : env.RAZORPAY_WEBHOOK_SECRET_TEST;
  const expectedPrefix = env.PAYMENT_ENVIRONMENT === 'LIVE' ? 'rzp_live_' : 'rzp_test_';
  if (!['TEST', 'LIVE'].includes(env.PAYMENT_ENVIRONMENT) || !activeKeyId.startsWith(expectedPrefix) || !activeKeySecret || !activeWebhookSecret) {
    console.error('[FATAL CONFIG ERROR] Active Razorpay key ID, key secret, and webhook secret must match PAYMENT_ENVIRONMENT.');
    process.exit(1);
  }
}

const requestIdGateway = require('./gateway/requestId');
const maintenanceModeGateway = require('./gateway/maintenanceMode');
const ipFilterGateway = require('./gateway/ipFilter');
const rateLimiterGateway = require('./gateway/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const { AppError } = require('./utils/errors');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');

require('./events/listeners');


const app = express();
const port = env.PORT || 5000;
app.set('trust proxy', 1);

// Enforce strict Zero-Trust HTTP security headers via Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://*.firebasestorage.app"],
      connectSrc: ["'self'", "https://api.razorpay.com", "https://*.googleapis.com", "https://*.firebaseio.com", "wss://*.firebaseio.com"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'same-origin' },
  noSniff: true,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(requestIdGateway);
app.use(maintenanceModeGateway);
app.use(ipFilterGateway);
app.use('/v1/', rateLimiterGateway);

app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[REQUEST] [${timestamp}] RequestID: ${req.id} | Method: ${req.method} | URL: ${req.url} | IP: ${req.clientIp}`);
  next();
});

// Enforce whitelist-only CORS configurations
const allowedOrigins = [
  'https://kartkirana.com',
  'https://admin.kartkirana.com',
  // Capacitor WebView origins configured by the signed Android apps.
  'https://customer.kartkirana.com',
  'https://rider.kartkirana.com',
  ...env.ALLOWED_ORIGINS.filter(origin => origin && origin !== '*')
];
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push(
    'http://localhost:3000',
    'http://localhost:5000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:8100',
    'http://localhost:12004',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
    'http://127.0.0.1:8100',
    'http://127.0.0.1:12004'
  );
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new AppError('Origin is not allowed by CORS.', 403));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-ID', 'X-Firebase-AppCheck']
}));


app.use(express.json({
  verify: (req, res, buf) => {
    if (req.originalUrl.includes('/webhook')) {
      req.rawBody = buf.toString();
    }
  }
}));

const sanitizer = require('./middleware/sanitizer');
app.use(sanitizer);


app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: env.PAYMENT_ENVIRONMENT
  });
});

// Public, non-secret readiness probe used by Checkout before creating a
// payment order. This prevents customers from entering the gateway when the
// server is missing credentials required to reconcile their transaction.
app.get('/health/payments', async (req, res) => {
  const razorpayConfig = require('./config/razorpay');
  const RazorpayProvider = require('./providers/razorpay/RazorpayProvider');
  const gatewayConfigured = Boolean(
    razorpayConfig.razorpayClient &&
    razorpayConfig.keyId &&
    razorpayConfig.keySecret
  );
  const webhookConfigured = Boolean(razorpayConfig.webhookSecret);
  const gatewayProbe = gatewayConfigured
    ? await RazorpayProvider.checkCredentialReadiness()
    : { ready: false, reason: 'NOT_CONFIGURED' };
  const ready = gatewayProbe.ready && webhookConfigured && !env.MAINTENANCE_MODE;

  res.status(ready ? 200 : 503).json({
    ready,
    environment: env.PAYMENT_ENVIRONMENT,
    checks: {
      gateway: gatewayProbe.ready ? 'authenticated' : 'unavailable',
      gatewayReason: gatewayProbe.reason,
      gatewayCheckedAt: gatewayProbe.checkedAt,
      webhook: webhookConfigured ? 'configured' : 'unavailable',
      maintenance: env.MAINTENANCE_MODE
    },
    message: ready
      ? 'Secure payment services are ready.'
      : 'Online payments are temporarily unavailable. No payment attempt has been created; please use Cash on Delivery.'
  });
});

const { healthLimiter } = require('./gateway/rateLimiter');
app.get('/health/database', healthLimiter, async (req, res) => {
  try {
    const { db } = require('./config/firebase');
    if (!db) throw new Error('Database service not connected.');
    await db.collection('_health_check').limit(1).get();
    res.status(200).json({ status: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('[HEALTH] Database connectivity check failed:', error.message);
    res.status(503).json({ status: 'disconnected', message: 'Database readiness check failed.' });
  }
});

const dispatchRoutes = require('./routes/dispatchRoutes');
const videoRoutes = require('./routes/videoRoutes');
const cancelRoutes = require('./routes/cancelRoutes');
const couponRoutes = require('./routes/couponRoutes');

app.use('/v1', paymentRoutes);
app.use('/v1', adminRoutes);
app.use('/v1', dispatchRoutes);
app.use('/v1', videoRoutes);
app.use('/v1', cancelRoutes);
app.use('/v1', couponRoutes);

app.use(errorHandler);

let exportedServer = app;
if (require.main === module || env.NODE_ENV === 'test') {
  if (env.NODE_ENV !== 'test') {
    const { startTimeoutWorker } = require('./workers/timeoutWorker');
    const { startNotificationWorker } = require('./workers/notificationWorker');
    const { startJobsWorker } = require('./workers/jobsWorker');
    const { startCleanupJob } = require('./jobs/cleanupJob');
    const { startDispatchWorker } = require('./workers/dispatchWorker');
    startTimeoutWorker();
    startNotificationWorker();
    startCleanupJob();
    startJobsWorker();
    startDispatchWorker();
  }

  exportedServer = app.listen(port, '0.0.0.0', () => {
    console.log(`[API] Enterprise KartKirana payment server running on port ${port} [Mode: ${env.PAYMENT_ENVIRONMENT}]`);
  });
}

module.exports = exportedServer;
