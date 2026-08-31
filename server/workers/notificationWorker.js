const { db } = require('../config/firebase');
const { getMessaging } = require('firebase-admin/messaging');

const isInvalidRegistrationToken = (error) => [
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered'
].includes(error?.code);

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
          // The queue document is the delivery idempotency key. If a scheduled
          // invocation stops after writing the notification but before marking
          // the task SENT, the retry overwrites the same notification instead
          // of showing the customer a duplicate.
          const notifId = `notif_${task.id}`;
          const userRef = db.collection('users').doc(task.userId);
          const riderRef = db.collection('riders').doc(task.userId);
          const [userSnapshot, riderSnapshot] = await Promise.all([userRef.get(), riderRef.get()]);
          const fcmToken = (userSnapshot.exists ? userSnapshot.data().fcmToken : null) ||
            (riderSnapshot.exists ? riderSnapshot.data().fcmToken : null);

          await userRef.collection('notifications').doc(notifId).set({
            id: notifId,
            title: task.title,
            body: task.body,
            createdAt: new Date().toISOString(),
            read: false,
            type: 'order',
            referenceId: task.referenceId || '',
            orderId: task.referenceId || ''
          });

          // Firestore notifications keep the in-app inbox reliable. FCM is
          // additionally required to wake Android/web riders while the app is
          // backgrounded or closed.
          if (fcmToken) {
            try {
              await getMessaging().send({
                token: fcmToken,
                notification: {
                  title: task.title,
                  body: task.body
                },
                data: {
                  type: String(task.userType || 'order'),
                  referenceId: String(task.referenceId || '')
                },
                android: {
                  priority: 'high',
                  notification: {
                    channelId: 'kart_kirana_orders',
                    sound: 'default',
                    tag: task.referenceId ? `order_${task.referenceId}` : task.id
                  }
                },
                webpush: {
                  headers: { Urgency: 'high' },
                  notification: {
                    tag: task.referenceId ? `order_${task.referenceId}` : task.id,
                    renotify: true
                  }
                }
              });
            } catch (pushError) {
              if (isInvalidRegistrationToken(pushError)) {
                console.warn(`[NOTIFICATION WORKER] Removing stale FCM token for user ${task.userId}.`);
                const staleTokenUpdate = { fcmToken: null, updatedAt: new Date().toISOString() };
                await Promise.all([
                  userSnapshot.exists ? userRef.update(staleTokenUpdate) : Promise.resolve(),
                  riderSnapshot.exists ? riderRef.update(staleTokenUpdate) : Promise.resolve()
                ]);
              } else {
                throw pushError;
              }
            }
          }
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
