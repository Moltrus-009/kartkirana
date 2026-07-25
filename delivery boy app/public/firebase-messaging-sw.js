/* eslint-disable no-undef */
// H-2 fix: background push handler. Runs in the browser/WebView's service
// worker process, independent of whether the app's page is open, so a new
// order request can wake a notification even if the rider's app was killed
// or backgrounded.
//
// This file MUST live at the web root (served as /firebase-messaging-sw.js)
// and cannot import bundler-processed modules, so the Firebase config is
// duplicated here via the compat/CDN scripts rather than importing from
// src/lib/firebase.ts. If the Firebase project config ever changes, update
// both places.

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBrhUJZy2sSL4JVii31RiUtZrp3k9gqFpo',
  authDomain: 'kartkirana-3cd12.firebaseapp.com',
  projectId: 'kartkirana-3cd12',
  storageBucket: 'kartkirana-3cd12.firebasestorage.app',
  messagingSenderId: '555627629169',
  appId: '1:555627629169:android:db85a6c0d64787b17869d0'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'New delivery request';
  const options = {
    body: payload.notification?.body || 'You have a new order — open the app to accept.',
    icon: '/icons.svg',
    data: payload.data || {},
    tag: 'kartkirana-order',
    renotify: true
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      if (clients.length > 0) {
        return clients[0].focus();
      }
      return self.clients.openWindow('/');
    })
  );
});
