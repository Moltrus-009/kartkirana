const { db } = require('../config/firebase');

const deleteSnapshotsInChunks = async (snapshot, chunkSize = 400) => {
  for (let start = 0; start < snapshot.docs.length; start += chunkSize) {
    const batch = db.batch();
    snapshot.docs.slice(start, start + chunkSize).forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
};

const runCleanup = async () => {
  if (!db) return;
  console.log('[CLEANUP JOB] Running database archiving and cleanup routine...');
  
  const nowIso = new Date().toISOString();

  try {
    const lockSnaps = await db.collection('locks')
      .where('expiresAt', '<', nowIso)
      .get();
    
    if (!lockSnaps.empty) {
      console.log(`[CLEANUP JOB] Clearing ${lockSnaps.size} expired checkout locks.`);
      await deleteSnapshotsInChunks(lockSnaps);
    }

    const idempotencySnaps = await db.collection('idempotencyKeys')
      .where('expiresAt', '<', nowIso)
      .get();

    if (!idempotencySnaps.empty) {
      console.log(`[CLEANUP JOB] Clearing ${idempotencySnaps.size} expired idempotency responses.`);
      await deleteSnapshotsInChunks(idempotencySnaps);
    }

    console.log('[CLEANUP JOB] Finished database archiving successfully.');
  } catch (error) {
    console.error('[CLEANUP JOB ERROR] Routine failed:', error.message);
    throw error;
  }
};

const startCleanupJob = () => {
  const runSafely = () => runCleanup().catch(() => {
    // The long-running local worker logs and retries on its next interval. The
    // scheduled Cloud Function calls runCleanup directly so failures propagate
    // to Cloud Scheduler and its configured retry policy.
  });
  runSafely();
  setInterval(runSafely, 24 * 60 * 60 * 1000);
  console.log('[CLEANUP JOB] Initialized polling interval (24 Hours)');
};

module.exports = { startCleanupJob, runCleanup };
