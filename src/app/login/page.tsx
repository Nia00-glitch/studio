
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
    // This effect ensures reCAPTCHA is only initialized on the client side.
    if (!window.recaptchaVerifier) {
      // It's important that the container is visible, but we can make it tiny.
      const recaptchaContainer = document.getElementById('recaptcha-container');
      if (recaptchaContainer) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainer, {
          'size': 'invisible',
          'callback': (response: any) => {
            // reCAPTCHA solved, allow signInWithPhoneNumber.
          }
        });
        window.recaptchaVerifier.render();
      }
    }
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Basic validation for E.164 format. It should start with a country code and be at least 10 digits long.
    // This regex checks for a string of digits between 10 and 15 characters.
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
      // It's good practice to reset reCAPTCHA on error.
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.render().then(widgetId => {
          // @ts-ignore
          if (window.grecaptcha && typeof window.grecaptcha.reset === 'function') {
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
      // The onAuthStateChanged listener in AuthContext will handle the redirect.
      router.push('/');
    } catch (error: any) {
      console.error("Error verifying OTP:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Invalid OTP. Please try again.' });
    }
    setLoading(false);
  };

  return (
    <>
      {/* This container is essential for reCAPTCHA to function */}
      <div id="recaptcha-container" style={{ position: 'absolute', bottom: 0, right: 0 }}></div>
      <CardContent>
        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <Input
              type="tel"
              placeholder="911234567890"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send OTP
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <Input
              type="text"
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              maxLength={6}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify OTP
            </Button>
            <Button variant="link" onClick={() => setStep('phone')} className="w-full">
              Change phone number
            </Button>
          </form>
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
      <Card className="w-full max-w-sm relative overflow-hidden">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <NIAIcon className="w-16 h-16 text-primary" />
          </div>
          <CardTitle className="text-2xl">Safety Rides Connect</CardTitle>
          <CardDescription>
            Enter your phone number to begin
          </CardDescription>
        </CardHeader>
        {isClient ? <LoginForm /> : (
            <div className="p-6 pt-0 space-y-4">
                <div className="h-10 w-full bg-muted rounded-md animate-pulse"></div>
                <div className="h-10 w-full bg-muted rounded-md animate-pulse"></div>
            </div>
        )}
      </Card>
    </div>
  );
}
