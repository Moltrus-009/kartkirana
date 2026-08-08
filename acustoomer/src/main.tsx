import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './privacy.css'
import 'leaflet/dist/leaflet.css'
import App from './App.tsx'

// Synchronously normalize legacy hash privacy URLs (e.g., /#/privacy/customer -> /privacy/customer) BEFORE React mounts
if (typeof window !== 'undefined' && window.location.hash.startsWith('#/privacy')) {
  const targetPath = window.location.hash.replace(/^#/, '');
  window.history.replaceState(null, '', targetPath);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
