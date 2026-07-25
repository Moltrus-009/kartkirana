import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kartkirana.rider',
  appName: 'Kart Kirana Rider',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'rider.kartkirana.com',
    // C-5 fix: explicit allow-list instead of a wildcard. A wildcard let the
    // native WebView load ANY url (malicious deep link, compromised
    // ad/tracking SDK, an open redirect) inside the app's trusted native
    // context — a classic WebView-hijacking/phishing vector on Android.
    // Add a host here only when the app genuinely needs to navigate to it.
    allowNavigation: [
      'rider.kartkirana.com',
      '*.kartkirana.com',
      '*.googleapis.com',
      '*.google.com',
      '*.gstatic.com',
      '*.firebaseapp.com',
      '*.firebaseio.com',
      '*.firebasestorage.app',
      '*.cloudfunctions.net',
      'checkout.razorpay.com',
      '*.razorpay.com'
    ]
  }
};

export default config;
