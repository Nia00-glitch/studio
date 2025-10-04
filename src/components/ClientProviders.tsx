
"use client";

import { EmergencyProvider } from '@/contexts/EmergencyContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import MicStatusIndicator from '@/components/MicStatusIndicator';
import dynamic from 'next/dynamic';
import { APIProvider } from '@vis.gl/react-google-maps';

// Dynamically import the VoiceListener component with SSR turned off because it uses browser-only APIs.
const VoiceListener = dynamic(() => import('@/components/VoiceListener'), {
  ssr: false,
});

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!googleMapsApiKey) {
    console.error("FATAL: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set.");
    // You could render an error message here
    return (
        <div className="flex h-screen items-center justify-center">
            <div className="text-destructive p-4 border border-destructive/50 rounded-lg">
                <h2 className="font-bold">Configuration Error</h2>
                <p>Google Maps API Key is missing. The app cannot load.</p>
                <p className="text-sm text-muted-foreground mt-2">Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file.</p>
            </div>
        </div>
    );
  }

  return (
    <APIProvider apiKey={googleMapsApiKey}>
        <AuthProvider>
          <EmergencyProvider>
            <VoiceListener />
            <MicStatusIndicator />
            {children}
            <Toaster />
          </EmergencyProvider>
        </AuthProvider>
    </APIProvider>
  );
}
