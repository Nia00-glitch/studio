"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { User } from 'firebase/auth'; // Keep type for structure
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
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

// --- MOCK USER DATA ---
const MOCK_USER: User = {
  uid: 'mock-user-uid-12345',
  isAnonymous: true,
  // Add other properties as needed by your app, with mock values
  displayName: 'Mock User',
  email: null,
  phoneNumber: null,
  photoURL: null,
  providerId: 'firebase',
  emailVerified: false,
  metadata: {},
  providerData: [],
  refreshToken: '',
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => '',
  getIdTokenResult: async () => ({} as any),
  reload: async () => {},
  toJSON: () => ({}),
};

// Start with a null profile, so the user is forced to the complete-profile page first.
const MOCK_INITIAL_PROFILE: UserProfile | null = null;


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { db } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // --- MOCK AUTHENTICATION ---
    // Instead of listening to onAuthStateChanged, we just set a mock user.
    // This completely bypasses the need to call signInAnonymously.
    setTimeout(() => {
      setUser(MOCK_USER);
      
      // Check local storage to see if a mock profile was already created
      const storedProfile = localStorage.getItem('mock-user-profile');
      if (storedProfile) {
        setUserProfile(JSON.parse(storedProfile));
      } else {
        setUserProfile(MOCK_INITIAL_PROFILE);
      }
      setLoading(false);
    }, 1000); // Simulate a short loading delay
  }, []);

  const logout = async () => {
    // In mock mode, logout clears the local storage and state.
    localStorage.removeItem('mock-user-profile');
    setUser(null);
    setUserProfile(null);
    // In a real app, you'd also redirect to /login.
    window.location.href = '/login';
  };

  const createUserProfile = async (profileData: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt' | 'phoneNumber' | 'fcmToken'>) => {
    if (!user) throw new Error("No mock user is signed in.");
    
    const newProfile: UserProfile = {
      ...profileData,
      uid: user.uid,
      phoneNumber: user.phoneNumber || '',
      createdAt: new Date(), // Use JS Date in mock mode
      updatedAt: new Date(),
    };
    
    // Store in local storage to persist the session across reloads
    localStorage.setItem('mock-user-profile', JSON.stringify(newProfile));
    setUserProfile(newProfile);
  };

  const updateRole = async (newRole: 'rider' | 'driver') => {
    if (!userProfile) return;
    
    const updatedProfile = { ...userProfile, role: newRole };
    localStorage.setItem('mock-user-profile', JSON.stringify(updatedProfile));
    setUserProfile(updatedProfile);
  };
  
  const value = { user, userProfile, loading, logout, createUserProfile, updateRole };

  if (loading) {
    return (
       <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <NIAIcon className="w-24 h-24 text-primary animate-pulse" />
        <Loader2 className="mt-8 h-8 w-8 animate-spin" />
        <p className="mt-4 text-muted-foreground">Initializing Mock Session...</p>
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
