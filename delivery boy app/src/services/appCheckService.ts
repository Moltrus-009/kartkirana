import { FirebaseAppCheck } from '@capacitor-firebase/app-check';
import { Capacitor } from '@capacitor/core';
import { getToken as getWebAppCheckToken } from 'firebase/app-check';
import { appCheck } from '../lib/firebase';

let nativeInitialization: Promise<void> | null = null;

const initializeNativeAppCheck = (): Promise<void> => {
  if (!nativeInitialization) {
    nativeInitialization = FirebaseAppCheck.initialize({
      isTokenAutoRefreshEnabled: true,
      debugToken: import.meta.env.VITE_NATIVE_APPCHECK_DEBUG === 'true'
    });
  }
  return nativeInitialization;
};

export const getSecureAppCheckToken = async (forceRefresh = false): Promise<string> => {
  if (Capacitor.isNativePlatform()) {
    await initializeNativeAppCheck();
    const result = await FirebaseAppCheck.getToken({ forceRefresh });
    if (!result.token) throw new Error('Native App Check returned an empty token.');
    return result.token;
  }

  if (!appCheck) throw new Error('Web App Check is not configured for this build.');
  const result = await getWebAppCheckToken(appCheck, forceRefresh);
  return result.token;
};
