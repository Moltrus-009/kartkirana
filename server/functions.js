const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');

// Firebase loads project-specific dotenv values after it first evaluates this
// module to discover function metadata. Conditional secret binding based on
// process.env at discovery time can therefore bind TEST secrets to a function
// whose deployed runtime is configured for LIVE. Bind both managed sets and
// let config/razorpay.js select exactly one environment at runtime.
const paymentSecretNames = [
  'RAZORPAY_KEY_ID_TEST',
  'RAZORPAY_KEY_SECRET_TEST',
  'RAZORPAY_WEBHOOK_SECRET_TEST',
  'RAZORPAY_KEY_ID_LIVE',
  'RAZORPAY_KEY_SECRET_LIVE',
  'RAZORPAY_WEBHOOK_SECRET_LIVE'
];
const activeSecrets = paymentSecretNames.map((name) => defineSecret(name));

exports.api = onRequest({
  region: 'asia-south1',
  memory: '512MiB',
  timeoutSeconds: 60,
  minInstances: 0,
  maxInstances: 20,
  concurrency: 40,
  invoker: 'public',
  secrets: activeSecrets
}, (request, response) => require('./index')(request, response));

// Release inventory and coupon reservations when an online checkout expires.
exports.paymentTimeoutSweep = onSchedule({
  region: 'asia-south1',
  schedule: 'every 5 minutes',
  timeZone: 'Asia/Kolkata',
  memory: '256MiB',
  timeoutSeconds: 120
}, async () => {
  const { runTimeoutWorker } = require('./workers/timeoutWorker');
  await runTimeoutWorker();
});

// Reconcile gateway payments/refunds that outlive a client callback or webhook.
exports.paymentReconciliationSweep = onSchedule({
  region: 'asia-south1',
  schedule: 'every 2 minutes',
  timeZone: 'Asia/Kolkata',
  memory: '256MiB',
  timeoutSeconds: 180,
  maxInstances: 1,
  retryCount: 1,
  secrets: activeSecrets
}, async () => {
  const { runPaymentReconciliation } = require('./workers/paymentReconciliationWorker');
  await runPaymentReconciliation();
});

// Deliver queued in-app notifications. Restrict this worker to one instance;
// notification IDs are also deterministic, so retries cannot duplicate them.
exports.notificationQueueSweep = onSchedule({
  region: 'asia-south1',
  schedule: 'every 1 minutes',
  timeZone: 'Asia/Kolkata',
  memory: '256MiB',
  timeoutSeconds: 120,
  maxInstances: 1,
  retryCount: 0
}, async () => {
  const { processNotificationQueue } = require('./workers/notificationWorker');
  await processNotificationQueue();
});

// Cloud Scheduler has one-minute granularity. Each invocation performs one
// bounded dispatch scan and exits; it never starts the local polling loop.
exports.dispatchSweep = onSchedule({
  region: 'asia-south1',
  schedule: 'every 1 minutes',
  timeZone: 'Asia/Kolkata',
  memory: '256MiB',
  timeoutSeconds: 120,
  maxInstances: 1,
  retryCount: 0
}, async () => {
  const { runDispatchWorkerOnce } = require('./workers/dispatchWorker');
  await runDispatchWorkerOnce();
});

// Start matching immediately when a merchant accepts or readies an order.
// The scheduled sweep remains as the recovery path for offline riders,
// timeouts, and transient trigger failures.
exports.dispatchOnOrderReady = onDocumentUpdated({
  document: 'orders/{orderId}',
  region: 'asia-south1',
  memory: '256MiB',
  timeoutSeconds: 60,
  maxInstances: 5,
  retry: false
}, async event => {
  const beforeStatus = String(event.data?.before.data()?.status || '').toUpperCase();
  const afterStatus = String(event.data?.after.data()?.status || '').toUpperCase();
  const dispatchable = ['ACCEPTED', 'SHOP_ACCEPTED', 'SEARCHING_RIDER', 'READY', 'READY_FOR_PICKUP'];
  if (beforeStatus === afterStatus || !dispatchable.includes(afterStatus)) return;
  const { runDispatchWorkerOnce } = require('./workers/dispatchWorker');
  await runDispatchWorkerOnce();
});

// Remove expired distributed locks and idempotency responses once per day.
exports.operationalCleanup = onSchedule({
  region: 'asia-south1',
  schedule: '15 3 * * *',
  timeZone: 'Asia/Kolkata',
  memory: '256MiB',
  timeoutSeconds: 300,
  maxInstances: 1,
  retryCount: 1
}, async () => {
  const { runCleanup } = require('./jobs/cleanupJob');
  await runCleanup();
});
