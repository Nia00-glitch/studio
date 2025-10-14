
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NIAIcon } from '@/components/icons';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';


export default function LoginPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // The AuthContext now handles anonymous sign-in,
        // so we just wait for a user object and then redirect.
        if (!loading && user) {
            router.replace('/');
        }
    }, [user, loading, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-md relative overflow-hidden shadow-2xl rounded-2xl">
          <CardHeader className="text-center p-8">
            <motion.div 
              className="flex justify-center mb-6"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 150 }}
            >
              <NIAIcon className="w-20 h-20 text-primary" />
            </motion.div>
            <h1 className="font-headline text-4xl font-bold tracking-tight">Welcome to NIA</h1>
            <CardDescription className="text-lg pt-2">
              Your personal safety companion.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex flex-col items-center justify-center p-6 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Signing in securely...</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
