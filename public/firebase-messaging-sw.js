// DO NOT MODIFY - This file is essential for background push notifications.
// It must be in the public directory.

// Import the Firebase scripts for the compatibility libraries
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

// Initialize the Firebase app in the service worker with your project's configuration
// IMPORTANT: Replace this with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id",
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Customize the notification here
  const notificationTitle = payload.notification.title || 'New Message';
  const notificationOptions = {
    body: payload.notification.body || 'You have a new message.',
    icon: '/nia-icon-192.png' // Optional: Add a default icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Optional: Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  // TODO: Add logic to open a specific URL or focus the app window
  event.waitUntil(
    clients.openWindow('/')
  );
});
