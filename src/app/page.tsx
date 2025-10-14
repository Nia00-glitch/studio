
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { NIAIcon } from '@/components/icons';

export default function Home() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      // Still waiting for auth state to resolve, do nothing.
      return;
    }

    if (!user) {
      // If there is no user for any reason, send to login to re-initiate.
      router.replace('/login');
    } else {
      // User is logged in (anonymously or otherwise). Now check for profile.
      if (userProfile) {
        // Profile exists, redirect based on role.
        if (userProfile.role === 'driver') {
          router.replace('/driver-home');
        } else {
          router.replace('/rider-home');
        }
      } else {
        // No profile exists for this authenticated user, redirect to create one.
        router.replace('/complete-profile');
      }
    }
  }, [user, userProfile, loading, router]);

  // Show a loading screen while we determine where to go.
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <NIAIcon className="w-24 h-24 text-primary animate-pulse" />
      <h1 className="text-4xl mt-4 font-bold">Safety Rides Connect</h1>
      <Loader2 className="mt-8 h-8 w-8 animate-spin" />
      <p className="mt-4 text-muted-foreground">Initializing...</p>
    </div>
  );
}
