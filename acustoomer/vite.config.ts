import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const configuredApiTarget = String(
    env.VITE_API_BASE_URL || env.VITE_API_URL || ''
  ).trim().replace(/\/$/, '')
  const apiTarget = configuredApiTarget || 'http://127.0.0.1:5000'

  return {
    base: '/',
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      host: '127.0.0.1',
      port: 12004,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          headers: { Origin: 'https://customer.kartkirana.com' },
        },
        '/v1': {
          target: apiTarget,
          changeOrigin: true,
          headers: { Origin: 'https://customer.kartkirana.com' },
        },
        '/health': {
          target: apiTarget,
          changeOrigin: true,
          headers: { Origin: 'https://customer.kartkirana.com' },
        },
      }
    },
  }
})
