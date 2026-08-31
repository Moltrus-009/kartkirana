import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kartkirana.partner',
  appName: 'Kart Kirana Partner',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'partner.kartkirana.com'
  }
};

export default config;
