const { db } = require('../config/firebase');
const crypto = require('crypto');

class NotificationService {
  async enqueueNotification(userId, title, body, userType = 'customer', referenceId = '') {
    console.log(`[NOTIFICATION QUEUE] Enqueueing notification task: "${title}" for ${userType} (${userId})`);
    if (!db) return;

    const queueId = `qnotif_${crypto.randomBytes(6).toString('hex')}`;
    const timestamp = new Date().toISOString();

    const queueDoc = {
      queueId,
      userId,
      title,
      body,
      userType,
      referenceId,
      status: 'PENDING',
      attempts: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: 'system',
      updatedBy: 'system',
      isDeleted: false,
      schemaVersion: 1
    };

    try {
      await db.collection('notificationQueue').doc(queueId).set(queueDoc);
    } catch (e) {
      console.error('[NOTIFICATION QUEUE ERROR] Failed to enqueue notification:', e);
    }
  }
}

module.exports = new NotificationService();
