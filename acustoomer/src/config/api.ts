import { Capacitor } from '@capacitor/core';

const configuredApiUrl = String(
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || ''
).trim().replace(/\/$/, '');

const configuredHttpsUrl = configuredApiUrl.startsWith('https://')
  ? configuredApiUrl
  : '';

export const getApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (import.meta.env.PROD) {
    if (!configuredHttpsUrl) {
      throw new Error('The production API URL is not configured securely.');
    }
    return `${configuredHttpsUrl}${normalizedPath}`;
  }

  if (Capacitor.isNativePlatform()) {
    return `${configuredApiUrl || 'http://10.0.2.2:5000'}${normalizedPath}`;
  }

  // Vite proxies /v1 and /api to the local Express server during web development.
  return normalizedPath;
};
