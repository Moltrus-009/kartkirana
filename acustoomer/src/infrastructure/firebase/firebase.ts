import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getMessaging, Messaging } from 'firebase/messaging';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, type AppCheck } from 'firebase/app-check';
import { Capacitor } from '@capacitor/core';

// Environment variables checks
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Mock data is permitted only in a developer build. A production environment
// variable can never turn payment/order operations into simulated successes.
const mockModeRequested = import.meta.env.VITE_USE_MOCK === 'true';
export const IS_MOCK_MODE = import.meta.env.DEV && mockModeRequested;

if (import.meta.env.PROD && mockModeRequested) {
  console.error('[Firebase] Mock mode was ignored in a production build.');
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let messaging: Messaging | null = null;
let appCheck: AppCheck | null = null;
let firebaseInitializationError: Error | null = null;

if (!IS_MOCK_MODE) {
  const missingFirebaseVariables = Object.entries(firebaseConfig)
    .filter(([key, value]) => key !== 'measurementId' && !value)
    .map(([key]) => key);

  if (missingFirebaseVariables.length > 0) {
    firebaseInitializationError = new Error(
      `Firebase configuration is incomplete: ${missingFirebaseVariables.join(', ')}`
    );
    console.error('[Firebase] Required client configuration is missing.');
  } else try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const appCheckKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_KEY;
    const isNativePlatform = Capacitor.isNativePlatform();
    if (!isNativePlatform && appCheckKey && import.meta.env.DEV && typeof window !== 'undefined') {
      (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    if (!isNativePlatform && appCheckKey) {
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(appCheckKey),
        isTokenAutoRefreshEnabled: true
      });
    } else if (!isNativePlatform && import.meta.env.PROD) {
      console.error('[App Check] VITE_RECAPTCHA_ENTERPRISE_KEY is required for secure checkout.');
    } else if (!isNativePlatform) {
      console.warn('[App Check] Add VITE_RECAPTCHA_ENTERPRISE_KEY to use the Firebase debug provider in development.');
    }
    auth = getAuth(app);
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
    storage = getStorage(app);
    // Messaging may fail if unsupported in the current browser/SSL state
    try {
      messaging = getMessaging(app);
    } catch (e) {
      console.warn('Firebase Messaging not supported:', e);
    }
  } catch (error) {
    firebaseInitializationError = error instanceof Error
      ? error
      : new Error('Firebase initialization failed.');
    console.error('[Firebase] Client initialization failed.');
  }
} else {
  console.log('Operating in explicit local HIGH-FIDELITY MOCK MODE.');
}

export { app, auth, db, storage, messaging };
export { appCheck };
export { firebaseInitializationError };
