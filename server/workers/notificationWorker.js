const { db } = require('../config/firebase');

const processNotificationQueue = async () => {
  if (!db) return;
  
  try {
    const queueSnaps = await db.collection('notificationQueue')
      .where('status', '==', 'PENDING')
      .where('isDeleted', '==', false)
      .limit(10)
      .get();

    if (queueSnaps.empty) {
      return;
    }

    console.log(`[NOTIFICATION WORKER] Processing ${queueSnaps.size} pending notifications...`);

    for (const doc of queueSnaps.docs) {
      const task = { id: doc.id, ...doc.data() };
      const taskRef = db.collection('notificationQueue').doc(task.id);
      
      const attempts = (task.attempts || 0) + 1;
      
      try {
        if (task.userId && task.userId !== 'riders_broadcast') {
          const notifId = `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          await db.collection('users').doc(task.userId).collection('notifications').doc(notifId).set({
            id: notifId,
            title: task.title,
            body: task.body,
            createdAt: new Date().toISOString(),
            read: false,
            type: 'order',
            referenceId: task.referenceId || ''
          });
        }

        await taskRef.update({
          status: 'SENT',
          attempts: attempts,
          updatedAt: new Date().toISOString(),
          updatedBy: 'notification_worker'
        });
        console.log(`[NOTIFICATION WORKER SUCCESS] Sent notification task ${task.id}`);
      } catch (sendError) {
        console.error(`[NOTIFICATION WORKER SEND ERROR] Task ${task.id} failed:`, sendError.message);
        
        if (attempts >= 3) {
          await taskRef.update({
            status: 'DLQ',
            attempts: attempts,
            failureReason: sendError.message,
            updatedAt: new Date().toISOString(),
            updatedBy: 'notification_worker'
          });
          console.warn(`[NOTIFICATION WORKER DLQ] Task ${task.id} has failed 3 times. Moved to Dead Letter Queue.`);
        } else {
          await taskRef.update({
            attempts: attempts,
            lastError: sendError.message,
            updatedAt: new Date().toISOString()
          });
        }
      }
    }
  } catch (error) {
    console.error('[NOTIFICATION WORKER ERROR] Queue run failed:', error.message);
  }
};

const startNotificationWorker = () => {
  processNotificationQueue();
  setInterval(processNotificationQueue, 30 * 1000);
  console.log('[NOTIFICATION WORKER] Initialized polling interval (30s)');
};

module.exports = { startNotificationWorker, processNotificationQueue };
