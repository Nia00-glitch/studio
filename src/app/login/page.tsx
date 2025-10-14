
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { NIAIcon } from '@/components/icons';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

function LoginForm() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined' && !window.recaptchaVerifier) {
      const recaptchaContainer = document.getElementById('recaptcha-container');
      if (recaptchaContainer) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainer, {
          'size': 'invisible',
          'callback': (response: any) => {},
        });
        window.recaptchaVerifier.render();
      }
    }
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
        toast({
            variant: 'destructive',
            title: 'Invalid Phone Number',
            description: 'Please enter a valid number including country code (e.g., +911234567890).',
        });
        setLoading(false);
        return;
    }

    if (!window.recaptchaVerifier) {
        toast({ variant: 'destructive', title: 'Error', description: 'reCAPTCHA not ready. Please wait a moment and try again.' });
        setLoading(false);
        return;
    }

    try {
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
      window.confirmationResult = confirmationResult;
      setStep('otp');
      toast({ title: 'OTP Sent', description: 'Please check your phone.' });
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      toast({ 
        variant: 'destructive', 
        title: 'Error Sending OTP', 
        description: error.message.includes('auth/missing-recaptcha-token') 
          ? 'Could not verify. Please refresh and try again.'
          : 'Please check the phone number and try again.'
      });
      // Reset reCAPTCHA on error
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.render().then(widgetId => {
          if ((window as any).grecaptcha) {
            (window as any).grecaptcha.reset(widgetId);
          }
        });
      }
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (!window.confirmationResult) {
        toast({ variant: 'destructive', title: 'Error', description: 'Verification session expired. Please request a new OTP.' });
        setStep('phone');
        setLoading(false);
        return;
    }

    try {
      await window.confirmationResult.confirm(otp);
      toast({ title: 'Success!', description: 'You are now signed in.' });
      router.replace('/');
    } catch (error: any) {
      console.error("Error verifying OTP:", error);
      toast({ variant: 'destructive', title: 'Invalid OTP', description: 'The code you entered is incorrect. Please try again.' });
    }
    setLoading(false);
  };

  return (
    <>
      <div id="recaptcha-container" style={{ position: 'fixed', bottom: 0, right: 0, zIndex: -1 }}></div>
      <CardContent>
        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
             <div className="space-y-2">
                <label htmlFor="phone-number" className="text-sm font-medium text-muted-foreground">Phone Number</label>
                <Input
                id="phone-number"
                type="tel"
                placeholder="+91 123 456 7890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send OTP
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
             <div className="space-y-2">
                <label htmlFor="otp" className="text-sm font-medium text-muted-foreground">Verification Code</label>
                <Input
                id="otp"
                type="text"
                inputMode="numeric"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength={6}
                />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify & Sign In
            </Button>
            <Button variant="link" size="sm" onClick={() => setStep('phone')} className="w-full text-muted-foreground">
              Back to phone number
            </Button>
          </form>
        )}
      </CardContent>
    </>
  );
}

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  if (loading || user) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
            <NIAIcon className="w-24 h-24 text-primary animate-pulse" />
            <Loader2 className="mt-8 h-8 w-8 animate-spin" />
            <p className="mt-4 text-muted-foreground">Signing in...</p>
        </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-sm relative overflow-hidden shadow-2xl rounded-2xl">
          <CardHeader className="text-center p-8">
            <motion.div 
              className="flex justify-center mb-6"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 150 }}
            >
              <NIAIcon className="w-20 h-20 text-primary" />
            </motion.div>
            <h1 className="font-headline text-4xl font-bold tracking-tight">Welcome</h1>
            <CardDescription className="text-lg pt-2">
              Sign in with your phone number to continue.
            </CardDescription>
          </CardHeader>
          <LoginForm />
        </Card>
      </motion.div>
    </div>
  );
}
