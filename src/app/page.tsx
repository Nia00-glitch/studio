
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { NIAIcon } from '@/components/icons';
import HomeClient from '@/components/HomeClient';

export default function Home() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Not logged in, send to login page
        router.replace('/login');
      } else if (!userProfile) {
        // Logged in but no profile, send to profile completion
        router.replace('/complete-profile');
      } else {
        // Logged in with profile, route based on role
        if (userProfile.role === 'driver') {
          router.replace('/driver-home');
        } else {
          router.replace('/rider-home');
        }
      }
    }
  }, [user, userProfile, loading, router]);

  if (loading || user) {
    // Show a loading screen while we check auth and profile status
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <NIAIcon className="w-24 h-24 text-primary animate-pulse" />
        <h1 className="text-4xl mt-4 font-bold">Safety Rides Connect</h1>
        <Loader2 className="mt-8 h-8 w-8 animate-spin" />
        <p className="mt-4 text-muted-foreground">Initializing...</p>
      </div>
    );
  }

  // This part will briefly be visible if the user is not logged in, before the redirect happens.
  // We can return a loader here as well.
  return (
     <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <NIAIcon className="w-24 h-24 text-primary animate-pulse" />
        <h1 className="text-4xl mt-4 font-bold">Safety Rides Connect</h1>
        <Loader2 className="mt-8 h-8 w-8 animate-spin" />
        <p className="mt-4 text-muted-foreground">Redirecting...</p>
      </div>
  );
}
