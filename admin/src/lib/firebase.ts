import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const requiredConfigKeys = ['apiKey', 'authDomain', 'projectId', 'appId'] as const;
const hasValidConfig = requiredConfigKeys.every((key) => Boolean(firebaseConfig[key]));
const appCheckSiteKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_KEY?.trim();

let app: any;
let auth: ReturnType<typeof getAuth> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;
let storage: ReturnType<typeof getStorage> | null = null;
let appCheck: ReturnType<typeof initializeAppCheck> | null = null;

try {
  if (hasValidConfig && typeof window !== 'undefined') {
    const g = window as any;
    
    if (!g.firebaseApp) {
      g.firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    }
    app = g.firebaseApp;

    // A missing Enterprise site key is an intentional "not configured" state.
    // Never initialize App Check with a placeholder: Firebase rejects it with 403s.
    if (appCheckSiteKey) {
      try {
        appCheck = initializeAppCheck(app, {
          provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
          isTokenAutoRefreshEnabled: true
        });
      } catch (appCheckErr) {
        console.warn('[App Check] Initialization failed in Admin App:', appCheckErr);
      }
    }

    if (!g.firebaseAuth) {
      g.firebaseAuth = getAuth(app);
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
  }
} catch (error) {
  console.error("Failed to initialize Firebase App in admin:", error);
}

export { auth, db, storage, appCheck, hasValidConfig };
