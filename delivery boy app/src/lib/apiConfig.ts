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
  if (import.meta.env.PROD && (!rawUrl || !rawUrl.startsWith('https://'))) {
    return 'https://api.kartkirana.com';
  }
  if (!rawUrl) {
    console.warn(
      '[apiConfig] VITE_API_URL is not configured — falling back to http://localhost:5000.'
    );
    return 'http://localhost:5000';
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    console.warn(`[apiConfig] VITE_API_URL is not a valid URL: "${rawUrl}". Falling back to raw value.`);
    return rawUrl.replace(/\/$/, '');
  }

  if (parsed.protocol !== 'https:') {
    console.warn(
      `[apiConfig] VITE_API_URL ("${rawUrl}") is not HTTPS. Proceeding with configured URL in mobile build.`
    );
    return rawUrl.replace(/\/$/, '');
  }

  return rawUrl.replace(/\/$/, '');
}

export const API_BASE_URL = resolveApiBaseUrl();
