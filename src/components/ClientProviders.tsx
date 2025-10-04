
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
  // Directly use the provided API key here.
  // For production, this should come from an environment variable.
  const googleMapsApiKey = "AQ.Ab8RN6I5iACyg8COQc0S03MCgyqM0DcuZpnQdlb8p4UbA47JpQ";

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
