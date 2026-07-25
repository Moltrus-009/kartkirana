const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const fs = require('fs');
const path = require('path');
const env = require('./env');
const mockDb = require('../repositories/mockDb');

let dbInstance = null;
let authInstance = null;
let useMock = false;

const explicitMock = env.USE_MOCK_DB;

// Pre-emptive credentials presence check
const keyPath = path.join(__dirname, '..', 'serviceAccountKey.json');
const hasKeyEnv = !!env.FIREBASE_SERVICE_ACCOUNT_KEY;
const hasKeyFile = fs.existsSync(keyPath);
const hasAdcEnv = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;

const hasCredentials = hasKeyEnv || hasKeyFile || hasAdcEnv;

if (explicitMock) {
  console.log('[FIREBASE] Explicit USE_MOCK_DB=true detected. Booting in high-fidelity mock database mode.');
  useMock = true;
  
  // Even in mock mode, attempt to initialize Firebase Admin app with projectId for real ID token verification support
  try {
    if (getApps().length === 0) {
      if (hasKeyEnv) {
        let serviceAccount = typeof env.FIREBASE_SERVICE_ACCOUNT_KEY === 'string' && env.FIREBASE_SERVICE_ACCOUNT_KEY.trim().startsWith('{')
          ? JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY)
          : require(env.FIREBASE_SERVICE_ACCOUNT_KEY);
        initializeApp({ credential: cert(serviceAccount) });
      } else if (hasKeyFile) {
        const serviceAccount = require(keyPath);
        initializeApp({ credential: cert(serviceAccount) });
      } else {
        initializeApp({ projectId: env.FIREBASE_PROJECT_ID });
      }
    }
    if (getApps().length > 0) {
      authInstance = getAuth();
    }
  } catch (error) {
    console.warn('[FIREBASE WARNING] Auth verification service initialization failed in mock mode:', error.message);
  }
} else {
  console.log('[FIREBASE] Running in standard database mode. Attempting connection to live Firestore...');
  
  if (!hasCredentials) {
    console.error('========================================================================');
    console.error('[FATAL FIREBASE ERROR] Connection to live Firestore failed.');
    console.error('No Administrative credentials detected.');
    console.error('Please configure one of the following:');
    console.error(' 1) Place a serviceAccountKey.json file inside the server/ directory.');
    console.error(' 2) Set the FIREBASE_SERVICE_ACCOUNT_KEY environment variable.');
    console.error(' 3) Set the GOOGLE_APPLICATION_CREDENTIALS environment variable.');
    console.error('To run locally in mock database fallback, start the server with USE_MOCK_DB=true.');
    console.error('========================================================================');
    process.exit(1);
  }

  try {
    if (getApps().length === 0) {
      if (hasKeyEnv) {
        let serviceAccount;
        try {
          serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY);
        } catch (e) {
          serviceAccount = require(env.FIREBASE_SERVICE_ACCOUNT_KEY);
        }
        initializeApp({
          credential: cert(serviceAccount)
        });
        console.log('[FIREBASE] Initialized with Service Account Key from env');
      } else if (hasKeyFile) {
        const serviceAccount = require(keyPath);
        initializeApp({
          credential: cert(serviceAccount)
        });
        console.log('[FIREBASE] Initialized using local serviceAccountKey.json');
      } else {
        initializeApp({
          projectId: env.FIREBASE_PROJECT_ID
        });
        console.log(`[FIREBASE] Initialized with Application Default Credentials for project: ${env.FIREBASE_PROJECT_ID}`);
      }
    }

    if (getApps().length > 0) {
      dbInstance = getFirestore();
      dbInstance.settings({ ignoreUndefinedProperties: true });
      authInstance = getAuth();
      console.log('[FIREBASE] Connection to live Firestore database established successfully.');
      console.log('Firestore connected');
    }
  } catch (error) {
    console.error('========================================================================');
    console.error('[FATAL FIREBASE ERROR] Failed to initialize Firebase Admin SDK for live Firestore connection:');
    console.error(error.message);
    console.error('========================================================================');
    process.exit(1);
  }
}

const db = new Proxy({}, {
  get(target, prop) {
    if (useMock) {
      return mockDb[prop];
    }
    if (!dbInstance) {
      throw new Error('[FIREBASE ERROR] Firestore is not initialized.');
    }
    return dbInstance[prop];
  }
});

const auth = new Proxy({}, {
  get(target, prop) {
    if (prop === 'verifyIdToken') {
      return async (token) => {
        if (token.startsWith('mock_token_') && (env.USE_MOCK_DB === 'true' || env.USE_MOCK_DB === true)) {
          const uid = token.replace('mock_token_', '');
          return { uid, email: `${uid}@mock.com`, role: uid === 'admin' ? 'admin' : 'customer' };
        }
        
        if (!authInstance) {
          throw new Error('[FIREBASE ERROR] Firebase Auth service is not initialized.');
        }
        return authInstance.verifyIdToken(token);
      };
    }
    
    return authInstance ? authInstance[prop] : undefined;
  }
});

module.exports = { db, auth };
