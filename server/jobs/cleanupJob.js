const { db } = require('../config/firebase');

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
      const batch = db.batch();
      lockSnaps.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }

    const idempotencySnaps = await db.collection('idempotencyKeys')
      .where('expiresAt', '<', nowIso)
      .get();

    if (!idempotencySnaps.empty) {
      console.log(`[CLEANUP JOB] Clearing ${idempotencySnaps.size} expired idempotency responses.`);
      const batch = db.batch();
      idempotencySnaps.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }

    console.log('[CLEANUP JOB] Finished database archiving successfully.');
  } catch (error) {
    console.error('[CLEANUP JOB ERROR] Routine failed:', error.message);
  }
};

const startCleanupJob = () => {
  runCleanup();
  setInterval(runCleanup, 24 * 60 * 60 * 1000);
  console.log('[CLEANUP JOB] Initialized polling interval (24 Hours)');
};

module.exports = { startCleanupJob, runCleanup };
