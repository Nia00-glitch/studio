
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, enableIndexedDbPersistence, updateDoc, onSnapshot } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { auth, db, app } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { NIAIcon } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => void;
  createUserProfile: (profileData: Omit<UserProfile, 'uid' | 'phoneNumber' | 'createdAt' | 'fcmToken'>) => Promise<void>;
  updateRole: (newRole: 'rider' | 'driver') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to handle FCM token logic
const setupFCM = async (user: User, toast: (options: any) => void) => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log("FCM not supported in this environment.");
    return;
  }
  try {
    const messaging = getMessaging(app);

    // 1. Request permission
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      
      // 2. Get token
      const fcmToken = await getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY });
      
      if (fcmToken) {
        console.log('FCM Token:', fcmToken);
        
        // 3. Persist token to Firestore
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
          fcmToken: fcmToken,
          updatedAt: serverTimestamp()
        });
        console.log('FCM token saved to Firestore.');
      } else {
        console.warn('No registration token available. Request permission to generate one.');
      }
    } else {
      console.warn('Notification permission denied.');
    }
    
    // 4. Handle foreground messages
    onMessage(messaging, (payload) => {
      console.log('Foreground message received. ', payload);
      toast({
        title: payload.notification?.title || "New Notification",
        description: payload.notification?.body || "",
      });
    });

  } catch (error) {
    console.error('An error occurred while setting up FCM.', error);
  }
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // This effect runs once on mount to ensure Firestore persistence is enabled
  // before any other operations can take place. This is the key to fixing the
  // "client is offline" error permanently.
  useEffect(() => {
    const enablePersistence = async () => {
      try {
        await enableIndexedDbPersistence(db);
        console.log('✅ Firestore offline persistence enabled.');
      } catch (err: any) {
        if (err.code === 'failed-precondition') {
          console.warn(
            '⚠️ Firestore offline persistence could not be enabled: Multiple tabs open?'
          );
        } else if (err.code === 'unimplemented') {
          console.warn(
            '⚠️ Firestore offline persistence is not available in this browser.'
          );
        }
      } finally {
        setIsFirebaseReady(true);
      }
    };

    enablePersistence();
  }, []);

  useEffect(() => {
    // This effect will not run until firebase is ready.
    if (!isFirebaseReady) return;
    
    // PERF: Start timing for auth check
    const authCheckStart = performance.now();

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        
        // Setup FCM for the logged-in user
        setupFCM(user, toast);
        
        const userDocRef = doc(db, 'users', user.uid);
        
        // PERF: Use onSnapshot for real-time profile updates (like role changes)
        // This also helps keep the local state in sync without manual refetches.
        const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          const authCheckEnd = performance.now();
          console.log(`🚀 AuthProvider: Auth check & profile fetch took ${(authCheckEnd - authCheckStart).toFixed(2)}ms`);

          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            setUserProfile(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user profile (might be offline):", error);
          setLoading(false);
        });

        // Return the profile listener's unsubscribe function to be called on cleanup
        return () => unsubscribeProfile();
      } else {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [isFirebaseReady, toast]);

  const logout = async () => {
    setLoading(true);
    await signOut(auth);
    setUser(null);
    setUserProfile(null);
    router.replace('/login');
    setLoading(false);
  };

  const createUserProfile = async (profileData: Omit<UserProfile, 'uid' | 'phoneNumber' | 'createdAt' | 'fcmToken'>) => {
    if (!user) throw new Error("No user logged in to create a profile for.");
    
    setLoading(true);
    const userDocRef = doc(db, 'users', user.uid);
    const newUserProfile: UserProfile = {
      ...profileData,
      uid: user.uid,
      phoneNumber: user.phoneNumber || '',
      createdAt: serverTimestamp(),
    };
    await setDoc(userDocRef, newUserProfile);
    setUserProfile(newUserProfile);
    setLoading(false);
  };
  
  // PERF FIX: Implement Optimistic UI for role switching.
  // This function now updates local state immediately for a snappy user experience,
  // while the database write happens in the background.
  const updateRole = async (newRole: 'rider' | 'driver') => {
    if (!user || !userProfile) throw new Error("User or profile not available for role update.");
    if (userProfile.role === newRole) return; // No change needed

    const userDocRef = doc(db, 'users', user.uid);
    const oldRole = userProfile.role;

    // 1. Optimistic Update: Change local state immediately.
    setUserProfile(prevProfile => ({ ...prevProfile!, role: newRole }));
    
    // 2. Perform the async database write in the background.
    try {
        await updateDoc(userDocRef, { role: newRole });
        // The onSnapshot listener will handle the final state reconciliation automatically.
    } catch (error) {
        console.error("Failed to update role in Firestore:", error);
        // 3. Rollback on error: Revert local state if the write fails.
        setUserProfile(prevProfile => ({ ...prevProfile!, role: oldRole }));
        // Optionally, show an error toast to the user.
        throw error; // Re-throw for the calling component to handle.
    }
  };
  
  const value = { user, userProfile, loading, logout, createUserProfile, updateRole };

  // Render a loading screen until Firebase persistence is confirmed,
  // preventing any child components from making premature Firestore calls.
  if (loading || !isFirebaseReady) {
    return (
       <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <NIAIcon className="w-24 h-24 text-primary animate-pulse" />
        <h1 className="text-4xl mt-4 font-bold">Safety Rides Connect</h1>
        <Loader2 className="mt-8 h-8 w-8 animate-spin" />
        <p className="mt-4 text-muted-foreground">Initializing secure connection...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
