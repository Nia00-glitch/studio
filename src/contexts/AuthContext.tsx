
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User } from 'firebase/auth';
import type { UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { NIAIcon } from '@/components/icons';

// --- MOCK USER DATA ---
// This is a temporary solution to bypass Firebase project config issues.
const MOCK_USER: User = {
  uid: 'mock-user-uid-12345',
  isAnonymous: true,
  // Add other User properties as needed, but keep them minimal
  email: null,
  emailVerified: false,
  phoneNumber: null,
  photoURL: null,
  displayName: 'Mock User',
  providerId: 'firebase',
  tenantId: null,
  metadata: {},
  providerData: [],
  refreshToken: '',
  delete: () => Promise.resolve(),
  getIdToken: () => Promise.resolve('mock-token'),
  getIdTokenResult: () => Promise.resolve({ token: 'mock-token', expirationTime: '', authTime: '', issuedAtTime: '', signInProvider: null, signInSecondFactor: null, claims: {} }),
  reload: () => Promise.resolve(),
  toJSON: () => ({}),
};

const MOCK_USER_PROFILE: UserProfile = {
  uid: 'mock-user-uid-12345',
  name: 'John Doe (Rider)',
  role: 'rider',
  phoneNumber: '555-1234',
  createdAt: new Date(),
  updatedAt: new Date(),
};


interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => void;
  // These functions will be no-ops in mock mode
  createUserProfile: (profileData: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt' | 'phoneNumber' | 'fcmToken'>) => Promise<void>;
  updateRole: (newRole: 'rider' | 'driver') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // We'll use state to simulate the async nature of auth
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching the user profile
    const timer = setTimeout(() => {
      setUser(MOCK_USER);
      setUserProfile(MOCK_USER_PROFILE);
      setLoading(false);
    }, 1500); // Simulate a network delay

    return () => clearTimeout(timer);
  }, []);


  const logout = () => {
    console.log("Mock logout requested. In a real app, this would clear state and redirect.");
    // In a mock environment, you might want to simulate being logged out
    setLoading(true);
    setUser(null);
    setUserProfile(null);
     setTimeout(() => {
      setUser(MOCK_USER);
      setUserProfile(MOCK_USER_PROFILE);
      setLoading(false);
    }, 1500);
  };

  const createUserProfile = async (profileData: any) => {
    console.log("`createUserProfile` called with:", profileData);
    console.log("This is a no-op in mock mode.");
  };

  const updateRole = async (newRole: 'rider' | 'driver') => {
     console.log(`'updateRole' called with: ${newRole}`);
     if(userProfile){
        setUserProfile({...userProfile, role: newRole});
     }
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
