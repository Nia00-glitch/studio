
// This file must be in the public folder.

// Give the service worker access to the Firebase Messaging SDK.
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker with the same config as your app.
// Note: It's safe to expose this config.
const firebaseConfig = {
  apiKey: self.location.search.split('apiKey=')[1].split('&')[0],
  authDomain: self.location.search.split('authDomain=')[1].split('&')[0],
  projectId: self.location.search.split('projectId=')[1].split('&')[0],
  storageBucket: self.location.search.split('storageBucket=')[1].split('&')[0],
  messagingSenderId: self.location.search.split('messagingSenderId=')[1].split('&')[0],
  appId: self.location.search.split('appId=')[1].split('&')[0],
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    '[firebase-messaging-sw.js] Received background message ',
    payload
  );

  // Customize notification here
  const notificationTitle = payload.notification.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification.body || 'Something happened',
    icon: '/nia-icon-192.png' // Optional: Add an icon in the public folder
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
