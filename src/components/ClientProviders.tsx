
"use client";

import { EmergencyProvider } from '@/contexts/EmergencyContext';
import { Toaster } from '@/components/ui/toaster';
import MicStatusIndicator from '@/components/MicStatusIndicator';
import dynamic from 'next/dynamic';

// Dynamically import the VoiceListener component with SSR turned off because it uses browser-only APIs.
const VoiceListener = dynamic(() => import('@/components/VoiceListener'), {
  ssr: false,
});

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <EmergencyProvider>
      <VoiceListener />
      <MicStatusIndicator />
      {children}
      <Toaster />
    </EmergencyProvider>
  );
}
