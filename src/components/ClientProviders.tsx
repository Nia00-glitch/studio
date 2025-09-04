
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
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
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
