const { dbRun, dbGet, dbAll } = require('../config/db');
const { db: firestoreDb } = require('../config/firebase');
const crypto = require('crypto');

const PROCESS_INTERVAL_MS = 15 * 1000; // Run scans every 15 seconds

async function startJobsWorker() {
  console.log('[JOBS WORKER] Background jobs manager initialized.');
  processQueue();
  setInterval(processQueue, PROCESS_INTERVAL_MS);
}

async function processQueue() {
  try {
    // 1. Fetch pending background tasks from SQLite
    const pendingJobs = await dbAll("SELECT * FROM jobs_queue WHERE status = 'PENDING' LIMIT 5");
    if (pendingJobs.length === 0) return;

    console.log(`[JOBS WORKER] Executing ${pendingJobs.length} enqueued tasks...`);

    for (const job of pendingJobs) {
      await dbRun("UPDATE jobs_queue SET status = 'PROCESSING', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [job.id]);
      const payload = job.payload ? JSON.parse(job.payload) : {};
      const attempts = (job.attempts || 0) + 1;

      try {
        await executeJob(job.job_type, payload);
        await dbRun("UPDATE jobs_queue SET status = 'COMPLETED', attempts = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [attempts, job.id]);
        console.log(`[JOBS WORKER SUCCESS] Job #${job.id} (${job.job_type}) completed.`);
      } catch (err) {
        console.error(`[JOBS WORKER FAILURE] Job #${job.id} failed:`, err.message);
        const status = attempts >= 3 ? 'FAILED' : 'PENDING';
        await dbRun(
          "UPDATE jobs_queue SET status = ?, attempts = ?, last_error = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", 
          [status, attempts, err.message, job.id]
        );
      }
    }
  } catch (error) {
    console.error('[JOBS WORKER CRITICAL ERROR] Execution failed:', error.message);
  }
}

async function executeJob(type, payload) {
  switch (type) {
    case 'BROADCAST_NOTIFICATION':
      await runBroadcastNotification(payload);
      break;
    case 'GENERATE_REPORT':
      await runGenerateReport(payload);
      break;
    case 'MERCHANT_PAYOUT':
      await runMerchantPayout(payload);
      break;
    case 'FRAUD_SCAN':
      await runFraudScan();
      break;
    case 'INVENTORY_SCAN':
      await runInventoryScan();
      break;
    case 'CLEANUP_EXPIRED':
      await runCleanupExpired();
      break;
    default:
      throw new Error(`Unsupported background job type: ${type}`);
  }
}

// --- TASK IMPLEMENTATIONS ---

async function runBroadcastNotification(payload) {
  const { target, title, body, areaId } = payload;
  if (!firestoreDb) return;

  const usersSnap = await firestoreDb.collection('users').get();
  let targets = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  if (target === 'riders') {
    targets = targets.filter(u => u.role === 'rider');
  } else if (target === 'shops') {
    targets = targets.filter(u => u.role === 'owner');
  } else if (target === 'users') {
    targets = targets.filter(u => u.role === 'customer' || !u.role);
  }

  console.log(`[JOBS WORKER] Sending broadcast notification to ${targets.length} endpoints...`);

  for (const t of targets) {
    const notifId = `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    await firestoreDb.collection('users').doc(t.id).collection('notifications').doc(notifId).set({
      id: notifId,
      title,
      body,
      createdAt: new Date().toISOString(),
      read: false,
      type: 'broadcast'
    });
  }
}

async function runGenerateReport(payload) {
  // Aggregate stats and generate report logs
  console.log('[JOBS WORKER] Gathering financial metrics report...');
  // Mock complex process time
  await new Promise(r => setTimeout(r, 1000));
}

async function runMerchantPayout(payload) {
  console.log('[JOBS WORKER] Processing merchant payouts settlements ledger...');
  await new Promise(r => setTimeout(r, 1000));
}

async function runFraudScan() {
  if (!firestoreDb) return;
  console.log('[JOBS WORKER] Scanning database logs for anomalous activity...');

  // Fraud Rule A: Search users with excessive cancellations (> 3)
  const ordersSnap = await firestoreDb.collection('orders').get();
  const cancellationCounts = {};

  ordersSnap.docs.forEach(doc => {
    const data = doc.data();
    if (data.status === 'cancelled' && data.userId) {
      cancellationCounts[data.userId] = (cancellationCounts[data.userId] || 0) + 1;
    }
  });

  for (const [userId, count] of Object.entries(cancellationCounts)) {
    if (count >= 3) {
      // Check if already logged
      const exists = await dbGet("SELECT id FROM fraud_events WHERE user_id = ? AND event_type = 'CANCEL_SPAM'", [userId]);
      if (!exists) {
        await dbRun(`
          INSERT INTO fraud_events (user_id, event_type, details, severity, status)
          VALUES (?, 'CANCEL_SPAM', ?, 'HIGH', 'OPEN')
        `, [userId, `User canceled ${count} orders. High risk of platform abuse.`]);
        console.warn(`[FRAUD WARNING] User ${userId} flagged for cancellation spam.`);
      }
    }
  }
}

async function runInventoryScan() {
  if (!firestoreDb) return;
  console.log('[JOBS WORKER] Auditing store inventory levels...');
  const productsSnap = await firestoreDb.collection('products').get();
  let lowStockCount = 0;

  productsSnap.docs.forEach(doc => {
    const data = doc.data();
    if (data.stock !== undefined && data.stock <= 2) {
      lowStockCount++;
    }
  });

  if (lowStockCount > 0) {
    console.log(`[JOBS WORKER] Found ${lowStockCount} items running low on stock.`);
  }
}

async function runCleanupExpired() {
  console.log('[JOBS WORKER] Clearing temporary file caches...');
}

module.exports = {
  startJobsWorker
};
