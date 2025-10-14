
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, signOut, User, signInAnonymously } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, onSnapshot, updateDoc } from 'firebase/firestore';
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
  createUserProfile: (profileData: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt' | 'phoneNumber' | 'fcmToken'>) => Promise<void>;
  updateRole: (newRole: 'rider' | 'driver') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser);
        // User is authenticated, now check for their profile in Firestore.
        const userDocRef = doc(db, 'users', authUser.uid);
        const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            // This case is handled by the main page redirecting to /complete-profile
            setUserProfile(null);
          }
          setLoading(false);
        });
        return () => unsubscribeProfile();
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
  }, []);

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserProfile(null);
    router.push('/login');
  };

  const createUserProfile = async (profileData: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt' | 'phoneNumber' | 'fcmToken'>) => {
    if (!user) throw new Error("No user logged in.");
    
    const userDocRef = doc(db, 'users', user.uid);
    const newUserProfile: Omit<UserProfile, 'fcmToken'> = {
      ...profileData,
      uid: user.uid,
      phoneNumber: user.phoneNumber || 'anonymous', // Handle anonymous user
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(userDocRef, newUserProfile);
    // The onSnapshot listener will automatically update the userProfile state.
  };

  const updateRole = async (newRole: 'rider' | 'driver') => {
    if (!user || !userProfile) throw new Error("User or profile not available for role update.");
    if (userProfile.role === newRole) return;

    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, { role: newRole, updatedAt: serverTimestamp() });
    // The onSnapshot listener will update the state.
  };
  
  const value = { user, userProfile, loading, logout, createUserProfile, updateRole };

  if (loading) {
    return (
       <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <NIAIcon className="w-24 h-24 text-primary animate-pulse" />
        <Loader2 className="mt-8 h-8 w-8 animate-spin" />
        <p className="mt-4 text-muted-foreground">Initializing...</p>
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
