import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'leaflet/dist/leaflet.css'
import App from './App.tsx'

// Early Instrumentation & Global Error Traps
console.log('[Rider App] Initializing main.tsx in WebView...');

const renderEmergencyErrorUI = (title: string, message: string) => {
  const root = document.getElementById('root');
  if (root && (!root.innerHTML || root.innerHTML.trim() === '')) {
    root.innerHTML = `
      <div style="padding: 24px; background-color: #0f172a; color: #ffffff; font-family: sans-serif; min-height: 100vh; display: flex; flex-direction: column; justify-content: center;">
        <div style="background-color: #1e293b; padding: 20px; border-radius: 16px; border: 1px solid #334155;">
          <h2 style="color: #ef4444; font-size: 16px; font-weight: 800; text-transform: uppercase; margin: 0 0 8px 0;">${title}</h2>
          <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0 0 12px 0;">${message}</p>
          <button onclick="window.location.reload()" style="width: 100%; padding: 12px; background-color: #10b981; color: #000000; font-weight: 800; text-transform: uppercase; border: none; border-radius: 12px; cursor: pointer;">Reload Console</button>
        </div>
      </div>
    `;
  }
};

window.addEventListener('error', (event) => {
  console.error('[Rider App Uncaught Global Error]:', event.error || event.message);
  renderEmergencyErrorUI('Rider App Launch Exception', event.error?.message || event.message || 'An unexpected launch error occurred.');
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Rider App Unhandled Rejection]:', event.reason);
  const msg = typeof event.reason === 'object' ? event.reason?.message : String(event.reason);
  renderEmergencyErrorUI('Rider App Async Startup Exception', msg || 'An unhandled promise rejection occurred.');
});

try {
  const container = document.getElementById('root');
  if (!container) {
    throw new Error("Root DOM container '#root' was not found in index.html");
  }
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (err: any) {
  console.error('[Rider App Mount Error]:', err);
  renderEmergencyErrorUI('Rider App Render Mount Failure', err?.message || 'Failed mounting React application root.');
}
