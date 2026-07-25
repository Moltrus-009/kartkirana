const { db } = require('../config/firebase');
const timeouts = require('../config/timeouts');

class LockManager {
  async acquireLock(orderId, serverId = 'server-1') {
    if (!db) return true;
    
    const lockRef = db.collection('locks').doc(orderId);
    let acquired = false;

    await db.runTransaction(async (transaction) => {
      const lockSnap = await transaction.get(lockRef);
      const now = Date.now();

      if (lockSnap.exists) {
        const lockData = lockSnap.data();
        const expiresAt = new Date(lockData.expiresAt).getTime();
        
        if (now < expiresAt) {
          throw new Error(`Lock for order ${orderId} is currently held by another process.`);
        }
      }

      const expiresAtIso = new Date(now + timeouts.lockExpiryMs).toISOString();
      transaction.set(lockRef, {
        orderId,
        ownerServer: serverId,
        expiresAt: expiresAtIso,
        createdAt: new Date().toISOString()
      });
      acquired = true;
    });

    return acquired;
  }

  async releaseLock(orderId) {
    if (!db) return;
    try {
      await db.collection('locks').doc(orderId).delete();
    } catch (e) {
      console.warn(`[LOCK WARNING] Failed to release lock for order ${orderId}:`, e.message);
    }
  }
}

module.exports = new LockManager();
