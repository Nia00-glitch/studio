
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
    if (!window.recaptchaVerifier) {
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

    const phoneRegex = /^\d{10,15}$/;
    if (!phoneRegex.test(phoneNumber)) {
        toast({
            variant: 'destructive',
            title: 'Invalid Phone Number',
            description: 'Please enter a valid number including country code (e.g., 911234567890).',
        });
        setLoading(false);
        return;
    }

    if (!window.recaptchaVerifier) {
        toast({ variant: 'destructive', title: 'Error', description: 'reCAPTCHA not initialized. Please refresh.' });
        setLoading(false);
        return;
    }

    try {
      const confirmationResult = await signInWithPhoneNumber(auth, `+${phoneNumber}`, window.recaptchaVerifier);
      window.confirmationResult = confirmationResult;
      setStep('otp');
      toast({ title: 'OTP Sent', description: 'Please check your phone.' });
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      toast({ variant: 'destructive', title: 'Error sending OTP', description: 'Please check the phone number and try again.' });
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.render().then(widgetId => {
          // @ts-ignore
          if (window.grecaptcha && typeof window.grecaptcha.reset === 'function') {
            // @ts-ignore
            window.grecaptcha.reset(widgetId);
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
        toast({ variant: 'destructive', title: 'Error', description: 'Verification session expired. Please try again.' });
        setStep('phone');
        setLoading(false);
        return;
    }

    try {
      await window.confirmationResult.confirm(otp);
      toast({ title: 'Success', description: 'Phone number verified!' });
      router.push('/');
    } catch (error: any) {
      console.error("Error verifying OTP:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Invalid OTP. Please try again.' });
    }
    setLoading(false);
  };

  return (
    <>
      <div id="recaptcha-container" style={{ position: 'absolute', bottom: 0, right: 0 }}></div>
      <CardContent>
        {step === 'phone' ? (
          <motion.form 
            key="phone-form"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleSendOtp} 
            className="space-y-6"
          >
            <Input
              type="tel"
              placeholder="e.g., 911234567890"
              className="h-14 text-lg"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
            <Button type="submit" size="lg" className="w-full h-14 text-lg" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Send OTP
            </Button>
          </motion.form>
        ) : (
          <motion.form 
            key="otp-form"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleVerifyOtp} 
            className="space-y-6"
          >
            <Input
              type="text"
              placeholder="Enter 6-digit OTP"
              className="h-14 text-lg text-center tracking-[0.5em]"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              maxLength={6}
            />
            <Button type="submit" size="lg" className="w-full h-14 text-lg" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Verify & Proceed
            </Button>
            <Button variant="link" onClick={() => setStep('phone')} className="w-full">
              Use a different number
            </Button>
          </motion.form>
        )}
      </CardContent>
    </>
  );
}

export default function LoginPage() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
          {isClient ? <LoginForm /> : (
              <div className="p-6 pt-0 space-y-4">
                  <div className="h-14 w-full bg-muted rounded-lg animate-pulse"></div>
                  <div className="h-14 w-full bg-muted rounded-lg animate-pulse"></div>
              </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
