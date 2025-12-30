"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { NIAIcon } from '@/components/icons';
import { useFirebase } from '@/lib/firebase/provider';

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
  const { auth, db } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !db) return;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        const profileRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
          } else {
            setUserProfile(null); // User is authenticated but has no profile
          }
          setLoading(false);
        });
        return () => unsubscribeProfile(); // Cleanup profile listener on user change
      } else {
        // No user is signed in
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe(); // Cleanup auth listener on component unmount
  }, [auth, db]);

  const logout = async () => {
    if (!auth) return;
    await auth.signOut();
    // No need to set user/profile to null here, onAuthStateChanged will handle it
    window.location.href = '/login';
  };

  const createUserProfile = async (profileData: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt' | 'fcmToken' | 'phoneNumber'>) => {
    if (!user || !db) throw new Error("No user is signed in or Firebase is not available.");
    
    const userDocRef = doc(db, 'users', user.uid);
    const newProfile: Omit<UserProfile, 'uid'> = {
      ...profileData,
      phoneNumber: user.phoneNumber || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    await setDoc(userDocRef, newProfile);
  };

  const updateRole = async (newRole: 'rider' | 'driver') => {
    if (!user || !db) return;
    
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, { role: newRole, updatedAt: serverTimestamp() }, { merge: true });
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
