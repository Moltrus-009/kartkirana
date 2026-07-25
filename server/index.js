const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');

// Strict production startup environment validation
if (process.env.NODE_ENV === 'production') {
  if (env.USE_MOCK_DB === true || env.USE_MOCK_DB === 'true') {
    console.error('[FATAL CONFIG ERROR] USE_MOCK_DB cannot be enabled in production environments.');
    process.exit(1);
  }
  const isRazorpayTest = (env.RAZORPAY_KEY_ID_LIVE || '').startsWith('rzp_test') || (env.RAZORPAY_KEY_ID_TEST || '').startsWith('rzp_live');
  if (isRazorpayTest) {
    console.error('[FATAL CONFIG ERROR] Razorpay keys are mismatched or configured with test keys in production.');
    process.exit(1);
  }
}

const requestIdGateway = require('./gateway/requestId');
const maintenanceModeGateway = require('./gateway/maintenanceMode');
const ipFilterGateway = require('./gateway/ipFilter');
const rateLimiterGateway = require('./gateway/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');

require('./events/listeners');

const { startTimeoutWorker } = require('./workers/timeoutWorker');
const { startNotificationWorker } = require('./workers/notificationWorker');
const { startJobsWorker } = require('./workers/jobsWorker');
const { startCleanupJob } = require('./jobs/cleanupJob');
const { startDispatchWorker } = require('./workers/dispatchWorker');


const app = express();
const port = env.PORT || 5000;

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
  'https://admin.kartkirana.com'
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
      callback(new Error('Not allowed by CORS'));
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

app.get('/health/database', async (req, res, next) => {
  try {
    const { db } = require('./config/firebase');
    if (!db) throw new Error('Database service not connected.');
    await db.collection('_health_check').doc('ping').set({ ping: true, timestamp: new Date().toISOString() });
    res.status(200).json({ status: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'disconnected', error: error.message });
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

if (env.NODE_ENV !== 'test') {
  startTimeoutWorker();
  startNotificationWorker();
  startCleanupJob();
  startJobsWorker();
  startDispatchWorker();
}

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`[API] Enterprise KartKirana payment server running on port ${port} [Mode: ${env.PAYMENT_ENVIRONMENT}]`);
});

module.exports = server;
