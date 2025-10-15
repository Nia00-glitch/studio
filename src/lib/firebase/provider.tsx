
"use client";

import React, { createContext, useContext, useMemo } from 'react';
import { initializeApp, getApp, getApps, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getFunctions, type Functions } from 'firebase/functions';

// Define the shape of our Firebase context
interface FirebaseContextType {
  auth: Auth | null;
  db: Firestore | null;
  storage: FirebaseStorage | null;
  functions: Functions | null;
}

// Create the context with a default null value
const FirebaseContext = createContext<FirebaseContextType>({
  auth: null,
  db: null,
storage: null,
  functions: null,
});

// The provider component that will wrap our app
export const FirebaseProvider = ({ children }: { children: React.ReactNode }) => {
  const firebaseConfig: FirebaseOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const services = useMemo(() => {
    // Ensure this runs only on the client
    if (typeof window === 'undefined') {
      return { auth: null, db: null, storage: null, functions: null };
    }

    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    
    return {
      auth: getAuth(app),
      db: getFirestore(app),
      storage: getStorage(app),
      functions: getFunctions(app),
    };
  }, [firebaseConfig]);

  return (
    <FirebaseContext.Provider value={services}>
      {children}
    </FirebaseContext.Provider>
  );
};

// Custom hook to easily access the Firebase services
export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};
