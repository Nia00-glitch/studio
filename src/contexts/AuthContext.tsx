
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, enableIndexedDbPersistence, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { NIAIcon } from '@/components/icons';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => void;
  createUserProfile: (profileData: Omit<UserProfile, 'uid' | 'phoneNumber' | 'createdAt'>) => Promise<void>;
  updateRole: (newRole: 'rider' | 'driver') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const router = useRouter();

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

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setUser(user);
        const userDocRef = doc(db, 'users', user.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setUserProfile(userDocSnap.data() as UserProfile);
          } else {
            setUserProfile(null);
          }
        } catch (error) {
           console.error("Error fetching user profile (might be offline):", error);
           // In an offline scenario, getDoc might throw. The UI will show a loader.
           // When the app comes back online, onAuthStateChanged will re-trigger
           // and this logic will run again.
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isFirebaseReady]);

  const logout = async () => {
    setLoading(true);
    await signOut(auth);
    setUser(null);
    setUserProfile(null);
    router.replace('/login');
    setLoading(false);
  };

  const createUserProfile = async (profileData: Omit<UserProfile, 'uid' | 'phoneNumber' | 'createdAt'>) => {
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

  const updateRole = async (newRole: 'rider' | 'driver') => {
    if (!user) throw new Error("No user logged in to update role for.");
    if (!userProfile) throw new Error("User profile not loaded yet.");

    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, { role: newRole });
    setUserProfile({ ...userProfile, role: newRole });
  };
  
  const value = { user, userProfile, loading, logout, createUserProfile, updateRole };

  // Render a loading screen until Firebase persistence is confirmed,
  // preventing any child components from making premature Firestore calls.
  if (!isFirebaseReady) {
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
