import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installMerchantViewport } from './lib/merchantViewport'

const stopViewport = installMerchantViewport();
if (import.meta.hot) import.meta.hot.dispose(stopViewport);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
