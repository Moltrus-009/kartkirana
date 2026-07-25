import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kartkirana.customer',
  appName: 'Kart Kirana',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'customer.kartkirana.com',
    allowNavigation: ['*']
  }
};

export default config;
