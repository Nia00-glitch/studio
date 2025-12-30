"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFirebase } from '@/lib/firebase/provider';
import { GoogleAuthProvider, signInWithPopup, signInAnonymously } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NIAIcon } from '@/components/icons';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const { auth } = useFirebase();
  const router = useRouter();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  const handleGoogleLogin = async () => {
    if (!auth) return;
    setIsLoggingIn(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // AuthContext will detect the change and redirect
    } catch (err: any) {
      console.error("Login Error:", err);
      setError(err.message || "Failed to sign in with Google.");
      setIsLoggingIn(false);
    }
  };

  const handleGuestLogin = async () => {
    if (!auth) return;
    setIsLoggingIn(true);
    setError(null);
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      console.error("Guest Login Error:", err);
      setError(err.message || "Failed to sign in as Guest.");
      setIsLoggingIn(false);
    }
  };

  if (loading) {
     return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
     )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md border-2 border-primary/20">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <NIAIcon className="w-16 h-16 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Safety Rides Connect</CardTitle>
          <CardDescription>Secure login for Riders and Drivers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            className="w-full h-12 text-lg" 
            onClick={handleGoogleLogin} 
            disabled={isLoggingIn}
          >
            {isLoggingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign in with Google"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or for Testing</span>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleGuestLogin}
            disabled={isLoggingIn}
          >
            Continue as Guest (Dev Mode)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
