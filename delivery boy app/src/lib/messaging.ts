// H-2 fix: real push notifications via Firebase Cloud Messaging.
//
// Previously "new order" alerts were implemented purely as an in-app sound
// triggered by a live Firestore listener — meaning a rider got nothing at
// all if the app was killed, backgrounded past Android's throttling limits,
// or the device was asleep.
//
// This uses firebase/messaging, which ships inside the `firebase` npm
// package that's already a project dependency (no new install required).
// It registers a service worker (public/firebase-messaging-sw.js) so
// notifications can be delivered and shown by the OS even when the app's
// page/WebView isn't running, and stores the resulting FCM token on the
// rider's profile so a backend Cloud Function can target this device when a
// new order is dispatched.
//
// Native-APK note: for the most reliable delivery on a Capacitor Android
// build, pairing this with @capacitor/push-notifications (which talks to
// FCM through the native Android notification channel APIs rather than the
// web Service Worker Push API) is the recommended long-term addition — that
// plugin isn't in node_modules in this environment and needs `npm install`
// with network access to add. This FCM-web implementation is fully
// functional today and is the correct foundation either way (same Firebase
// project, same server-side send call); the native plugin would sit
// alongside it, not replace it.

import { getMessaging, getToken, onMessage, isSupported, type Messaging } from 'firebase/messaging';
import { app } from './firebase';
import { logger } from './logger';

let messaging: Messaging | null = null;

async function getMessagingInstance(): Promise<Messaging | null> {
  if (messaging) return messaging;
  if (!app) return null;
  try {
    if (!(await isSupported())) {
      logger.warn('Push', 'FCM is not supported in this browser/WebView environment.');
      return null;
    }
    messaging = getMessaging(app);
    return messaging;
  } catch (err) {
    logger.warn('Push', 'Failed to initialize Firebase Messaging:', err);
    return null;
  }
}

/**
 * Registers the background service worker, requests notification
 * permission, and returns an FCM registration token for this device — or
 * null if push isn't available/permitted (never throws; push is a
 * progressive enhancement, not a hard requirement to use the app).
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
    return null;
  }

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    logger.warn('Push', 'VITE_FIREBASE_VAPID_KEY is not set — cannot register for push. ' +
      'Get one from Firebase Console > Project Settings > Cloud Messaging > Web Push certificates.');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      logger.info('Push', `Notification permission: ${permission}`);
      return null;
    }

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const msg = await getMessagingInstance();
    if (!msg) return null;

    const token = await getToken(msg, { vapidKey, serviceWorkerRegistration: registration });
    return token || null;
  } catch (err) {
    logger.warn('Push', 'Failed to register for push notifications:', err);
    return null;
  }
}

/**
 * Subscribes to foreground push messages (app open + focused). Background
 * messages are handled by the service worker itself, independent of this
 * subscription and independent of the app being open.
 */
export async function onForegroundMessage(callback: (payload: { title?: string; body?: string; data?: Record<string, string> }) => void) {
  const msg = await getMessagingInstance();
  if (!msg) return () => {};
  return onMessage(msg, (payload) => {
    callback({
      title: payload.notification?.title,
      body: payload.notification?.body,
      data: payload.data
    });
  });
}
