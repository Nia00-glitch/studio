
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { NIAIcon } from '@/components/icons';
import { useFirebase } from '@/lib/firebase/provider'; // Use the new central provider

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => void;
  createUserProfile: (profileData: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt' | 'phoneNumber' | 'fcmToken'>) => Promise<void>;
  updateRole: (newRole: 'rider' | 'driver') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { auth, db } = useFirebase(); // Get initialized services from context
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !db) return; // Wait for Firebase to be ready

    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser);
        // User is signed in, now check for their profile in Firestore.
        const userDocRef = doc(db, 'users', authUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserProfile({ uid: authUser.uid, ...userDocSnap.data() } as UserProfile);
        } else {
          // Profile doesn't exist, this might be a new user.
          setUserProfile(null);
        }
        setLoading(false);
      } else {
        // No user is signed in, attempt to sign in anonymously.
        try {
          await signInAnonymously(auth);
          // The onAuthStateChanged listener will be called again with the new anonymous user.
        } catch (error) {
          console.error("Anonymous sign-in failed:", error);
          setLoading(false);
        }
      }
    });

    return () => unsubscribeAuth();
  }, [auth, db]);

  const logout = async () => {
    if (!auth) return;
    await auth.signOut();
    setUser(null);
    setUserProfile(null);
  };

  const createUserProfile = async (profileData: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'>) => {
    if (!user) throw new Error("No user is signed in to create a profile for.");
    if (!db) throw new Error("Database not initialized.");

    const userDocRef = doc(db, 'users', user.uid);
    const newProfile: UserProfile = {
      ...profileData,
      uid: user.uid,
      phoneNumber: user.phoneNumber || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(userDocRef, newProfile);
    setUserProfile(newProfile);
  };

  const updateRole = async (newRole: 'rider' | 'driver') => {
    if (!userProfile || !db) return;
    const userDocRef = doc(db, 'users', userProfile.uid);
    await setDoc(userDocRef, { role: newRole, updatedAt: serverTimestamp() }, { merge: true });
    setUserProfile({ ...userProfile, role: newRole });
  };
  
  const value = { user, userProfile, loading, logout, createUserProfile, updateRole };

  if (loading) {
    return (
       <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <NIAIcon className="w-24 h-24 text-primary animate-pulse" />
        <Loader2 className="mt-8 h-8 w-8 animate-spin" />
        <p className="mt-4 text-muted-foreground">Initializing Session...</p>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
