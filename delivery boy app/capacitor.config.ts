import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kartkirana.rider',
  appName: 'Kart Kirana Rider',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'rider.kartkirana.com'
  }
};

export default config;
