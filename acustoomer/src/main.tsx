import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './privacy.css'
import 'leaflet/dist/leaflet.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { logger } from './core/logger/logger.ts'

// Synchronously normalize legacy hash privacy URLs (e.g., /#/privacy/customer -> /privacy/customer) BEFORE React mounts
if (typeof window !== 'undefined' && window.location.hash.startsWith('#/privacy')) {
  const targetPath = window.location.hash.replace(/^#/, '');
  window.history.replaceState(null, '', targetPath);
}

window.addEventListener('error', event => {
  logger.error('Unhandled browser error', event.error || new Error('Browser runtime error'));
});

window.addEventListener('unhandledrejection', event => {
  logger.error(
    'Unhandled browser promise rejection',
    event.reason instanceof Error ? event.reason : new Error('Browser promise rejection'),
  );
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
