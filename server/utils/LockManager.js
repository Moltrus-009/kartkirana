const { db } = require('../config/firebase');
const timeouts = require('../config/timeouts');
const crypto = require('crypto');

class LockManager {
  async acquireLock(orderId, serverId = 'server-1') {
    const ownerToken = crypto.randomUUID();
    if (!db) return ownerToken;
    
    const lockRef = db.collection('locks').doc(orderId);
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
        ownerToken,
        expiresAt: expiresAtIso,
        createdAt: new Date().toISOString()
      });
    });

    return ownerToken;
  }

  async releaseLock(orderId, ownerToken) {
    if (!db) return;
    if (!ownerToken) {
      console.warn(`[LOCK WARNING] Refusing to release lock for order ${orderId} without an owner token.`);
      return;
    }
    try {
      const lockRef = db.collection('locks').doc(orderId);
      await db.runTransaction(async (transaction) => {
        const lockSnap = await transaction.get(lockRef);
        if (!lockSnap.exists) return;
        if (lockSnap.data().ownerToken !== ownerToken) {
          console.warn(`[LOCK WARNING] Refusing to release lock for order ${orderId} owned by another process.`);
          return;
        }
        transaction.delete(lockRef);
      });
    } catch (e) {
      console.warn(`[LOCK WARNING] Failed to release lock for order ${orderId}:`, e.message);
    }
  }
}

module.exports = new LockManager();
