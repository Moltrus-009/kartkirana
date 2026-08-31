import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, indexedDBLocalPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { Capacitor } from '@capacitor/core';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Treat Firebase as available only when every required public client setting is
// present. This prevents a half-initialized Auth instance from trapping the
// login screen in a retry loop.
const hasValidConfig = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.storageBucket,
  firebaseConfig.messagingSenderId,
  firebaseConfig.appId
].every((value) => typeof value === 'string' && value.trim().length > 0);

let app: any;
let auth: ReturnType<typeof getAuth> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;
let storage: any = null;
let appCheck: any = null;

try {
  if (hasValidConfig) {
    const g = window as any;
    
    if (!g.firebaseApp) {
      g.firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    }
    app = g.firebaseApp;

    // Initialize App Check
    try {
      const isNativePlatform = Capacitor.isNativePlatform();
      if (!isNativePlatform && import.meta.env.DEV && typeof window !== 'undefined') {
        (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      }
      if (!isNativePlatform && !import.meta.env.DEV) {
        const appCheckKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_KEY;
        if (!appCheckKey) throw new Error('VITE_RECAPTCHA_ENTERPRISE_KEY is required in production.');
        appCheck = initializeAppCheck(app, {
          provider: new ReCaptchaEnterpriseProvider(appCheckKey),
          isTokenAutoRefreshEnabled: true
        });
        console.log('[App Check] Initialized successfully in Rider web app');
      }
    } catch (appCheckErr) {
      console.warn('[App Check] Initialization failed in Rider App:', appCheckErr);
    }

    if (!g.firebaseAuth) {
      try {
        g.firebaseAuth = initializeAuth(app, {
          persistence: [indexedDBLocalPersistence, browserLocalPersistence]
        });
      } catch (authInitErr) {
        g.firebaseAuth = getAuth(app);
      }
    }
    auth = g.firebaseAuth;

    if (!g.firebaseDb) {
      try {
        g.firebaseDb = initializeFirestore(app, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
          })
        });
      } catch (cacheErr) {
        g.firebaseDb = getFirestore(app);
      }
    }
    db = g.firebaseDb;

    if (!g.firebaseStorage) {
      g.firebaseStorage = getStorage(app);
    }
    storage = g.firebaseStorage;

    if (import.meta.env.DEV) {
      console.log("[Firebase Config] Successfully connected to project:", firebaseConfig.projectId);
    }
  } else {
    console.warn("[Firebase Config] Running in offline Local Mock Sandbox database mode.");
  }
} catch (error) {
  console.error("Failed to initialize Firebase:", error);
}

export const isMockBypassMode = () => {
  // HARD GATE: import.meta.env.DEV is a build-time constant inlined by Vite.
  // In a production build (`vite build`) this whole function body is dead-code
  // eliminated down to `return false`, so no client-controlled state
  // (localStorage, phone digits, etc.) can ever flip the app into mock mode
  // in a distributed build. This is the fix for C-1/C-2/C-3.
  if (!import.meta.env.DEV) return false;

  if (localStorage.getItem('hs_bypass_active') === 'true') return true;
  const cachedUser = localStorage.getItem('hs_logged_in_user') || localStorage.getItem('hs_user');
  if (cachedUser) {
    try {
      const u = JSON.parse(cachedUser);
      if (u && (u.uid === 'dev-rider-uid' || (u.phone && (u.phone.endsWith('99999') || u.phone.endsWith('11111') || u.phone.endsWith('88888') || u.phone === '9999999999')))) {
        return true;
      }
    } catch (e) {}
  }
  return false;
};

export const isFirebaseActive = () => {
  return hasValidConfig && db && !isMockBypassMode();
};

export { app, auth, db, storage, appCheck, hasValidConfig };
