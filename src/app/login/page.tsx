"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { NIAIcon } from '@/components/icons';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  console.log("Page Rendered: Login (/login)");
  console.log("Current Auth State:", { 
    loading, 
    user: user ? user.uid : 'null',
  });

  useEffect(() => {
    // With mock auth, we just wait for the user object to be loaded
    // and then redirect immediately.
    if (!loading && user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  // This page now serves as a loading screen during the initial "sign in"
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col items-center justify-center">
            <NIAIcon className="w-24 h-24 text-primary animate-pulse" />
            <Loader2 className="mt-8 h-8 w-8 animate-spin" />
            <p className="mt-4 text-muted-foreground">Loading Mock Session...</p>
        </div>
      </motion.div>
    </div>
  );
}
