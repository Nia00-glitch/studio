
// This file is DEPRECATED and will be removed.
// Please use `useFirebase` from `src/lib/firebase/provider.tsx` instead.

import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, onMessage } from 'firebase/messaging';
import { getFunctions } from 'firebase/functions';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function initializeFirebaseApp(config: FirebaseOptions) {
    if (getApps().length > 0) {
        return getApp();
    }

    if (!config?.apiKey) {
        console.warn("Firebase configuration is missing or incomplete. The app may not function correctly.");
        return initializeApp({}); // Initialize with empty config to avoid crash
    }
    
    return initializeApp(config);
}


const app = initializeFirebaseApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);
const db = getFirestore(app);
const functions = getFunctions(app);

let messaging;
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY) {
  try {
    messaging = getMessaging(app);
    onMessage(messaging, (payload) => {
      console.log('Foreground message received. ', payload);
    });
  } catch (error) {
    console.error("Could not initialize Firebase Messaging:", error);
  }
}

export { app, auth, storage, db, functions, messaging };
