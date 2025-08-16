
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
  createUserProfile: (profileData: Omit<UserProfile, 'uid' | 'phoneNumber' | 'createdAt' | 'fcmToken' | 'updatedAt'>) => Promise<void>;
  updateRole: (newRole: 'rider' | 'driver') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to handle FCM token logic
const setupFCM = async (user: User, toast: (options: any) => void) => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY) {
    console.warn("FCM not supported or VAPID key is missing.");
    return;
  }
  
  try {
    const messaging = getMessaging(app);
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied.');
      return;
    }
    
    const fcmToken = await getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY });
    
    if (fcmToken) {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { fcmToken, updatedAt: serverTimestamp() });
      console.log('FCM token refreshed and saved to Firestore.');
    }
    
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

  useEffect(() => {
    const enablePersistence = async () => {
      try {
        await enableIndexedDbPersistence(db);
      } catch (err: any) {
        if (err.code === 'failed-precondition') {
          console.warn('Firestore offline persistence could not be enabled: Multiple tabs open?');
        }
      } finally {
        setIsFirebaseReady(true);
      }
    };
    enablePersistence();
  }, []);

  useEffect(() => {
    if (!isFirebaseReady) return;
    
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        await setupFCM(user, toast);
        
        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          setUserProfile(docSnap.exists() ? docSnap.data() as UserProfile : null);
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user profile:", error);
          setLoading(false);
        });
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

  const createUserProfile = async (profileData: Omit<UserProfile, 'uid' | 'phoneNumber' | 'createdAt' | 'fcmToken' | 'updatedAt'>) => {
    if (!user) throw new Error("No user logged in.");
    
    const userDocRef = doc(db, 'users', user.uid);
    const newUserProfile: Omit<UserProfile, 'fcmToken'> = {
      ...profileData,
      uid: user.uid,
      phoneNumber: user.phoneNumber || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(userDocRef, newUserProfile);
    setUserProfile(newUserProfile as UserProfile);
  };
  
  const updateRole = async (newRole: 'rider' | 'driver') => {
    if (!user || !userProfile || userProfile.role === newRole) return;

    const userDocRef = doc(db, 'users', user.uid);
    const oldRole = userProfile.role;

    setUserProfile(prev => ({ ...prev!, role: newRole }));
    
    try {
        await updateDoc(userDocRef, { role: newRole, updatedAt: serverTimestamp() });
    } catch (error) {
        console.error("Failed to update role in Firestore:", error);
        setUserProfile(prev => ({ ...prev!, role: oldRole }));
        throw error;
    }
  };
  
  const value = { user, userProfile, loading, logout, createUserProfile, updateRole };

  if (loading || !isFirebaseReady) {
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
