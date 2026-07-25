// Centralized backend API origin resolution.
//
// C-4 fix: previously every call site independently did
//   `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}`
// which (a) silently fell back to a hardcoded localhost URL if the env var was
// ever missing at build time, and (b) allowed a committed .env to point
// production builds at a plaintext http:// origin on a private LAN IP,
// meaning Firebase ID tokens / App Check tokens would be sent in cleartext
// and interceptable on-path, and the backend would be unreachable for any
// rider outside that LAN.
//
// This module is the single place that resolves the API origin. It fails
// loudly (throws) instead of silently degrading, so a misconfiguration is a
// build/runtime error you cannot miss, rather than a mysterious "video calls
// don't work for anyone outside the office" production incident.

const rawUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;

function resolveApiBaseUrl(): string {
  if (!rawUrl) {
    if (import.meta.env.DEV) {
      // Local dev fallback only — never used in a production build because
      // VITE_API_URL is required to be set via the CI/CD pipeline for
      // staging/production builds (see .env.example).
      console.warn(
        '[apiConfig] VITE_API_URL is not set — falling back to http://localhost:5000 for local dev only.'
      );
      return 'http://localhost:5000';
    }
    throw new Error(
      '[apiConfig] VITE_API_URL is not configured. Refusing to start: production builds must ' +
      'have a real, HTTPS backend origin injected at build time via the CI/CD pipeline.'
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`[apiConfig] VITE_API_URL is not a valid URL: "${rawUrl}"`);
  }

  if (parsed.protocol !== 'https:') {
    if (import.meta.env.DEV) {
      console.warn(
        `[apiConfig] VITE_API_URL ("${rawUrl}") is not HTTPS. Allowed only in local dev — ` +
        `this will throw in a production build.`
      );
      return rawUrl.replace(/\/$/, '');
    }
    throw new Error(
      `[apiConfig] VITE_API_URL ("${rawUrl}") must be HTTPS in production. Refusing to send ` +
      `auth tokens over plaintext HTTP.`
    );
  }

  return rawUrl.replace(/\/$/, '');
}

export const API_BASE_URL = resolveApiBaseUrl();
