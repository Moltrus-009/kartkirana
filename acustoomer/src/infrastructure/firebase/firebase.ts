import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getMessaging, Messaging } from 'firebase/messaging';

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

// Check if explicit mock mode is requested via environment variable
export const IS_MOCK_MODE = import.meta.env.VITE_USE_MOCK === 'true';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let messaging: Messaging | null = null;

if (!IS_MOCK_MODE) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
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
    console.error('Firebase initialization failed, falling back to mock mode:', error);
    (window as any).IS_MOCK_MODE = true;
  }
} else {
  console.log('Firebase credentials missing. Operating in local HIGH-FIDELITY MOCK MODE.');
}

export const appCheck = null;
export { app, auth, db, storage, messaging };
