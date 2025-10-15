
"use client";

import 'regenerator-runtime/runtime'; // Import the polyfill here, at the top level.
import { EmergencyProvider } from '@/contexts/EmergencyContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import MicStatusIndicator from '@/components/MicStatusIndicator';
import dynamic from 'next/dynamic';
import { APIProvider } from '@vis.gl/react-google-maps';
import { FirebaseProvider } from '@/lib/firebase/provider'; // Import the new provider

// Dynamically import the VoiceListener component with SSR turned off because it uses browser-only APIs.
const VoiceListener = dynamic(() => import('@/components/VoiceListener'), {
  ssr: false,
});

function MissingApiKeyError({ service }: { service: string }) {
  const isMaps = service === 'Google Maps';
  const envVar = isMaps ? 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY' : 'NEXT_PUBLIC_FIREBASE_API_KEY';
  const steps = isMaps ? 
    <>
      <li>Ensure you have a valid Google Maps API key with the <strong>Maps JavaScript API, Places API, and Directions API</strong> enabled.</li>
      <li>Create a file named <code className="bg-muted px-1 py-0.5 rounded">.env.local</code> in the root of your project.</li>
    </> :
    <>
      <li>Go to your Firebase project settings, find your web app config, and copy the values.</li>
      <li>Create a file named <code className="bg-muted px-1 py-0.5 rounded">.env.local</code> in the root of your project.</li>
    </>;
  
  return (
    <div className="flex h-screen items-center justify-center bg-background p-4">
        <div className="max-w-2xl text-destructive p-6 border border-destructive/50 rounded-2xl bg-card shadow-lg">
            <h2 className="font-bold text-2xl mb-2">Configuration Error</h2>
            <p className="text-lg">The {service} API Key is missing or invalid.</p>
            <div className="mt-4 pt-4 border-t border-destructive/30 text-foreground text-base">
              <p className="font-semibold">To fix this:</p>
              <ol className="list-decimal list-inside mt-2 space-y-2">
                {steps}
                <li>Add your key(s) to the file like this:
                  <pre className="bg-muted p-2 rounded-md mt-2 text-sm"><code>{envVar}=YOUR_API_KEY_HERE</code></pre>
                </li>
                 <li>Restart your development server.</li>
              </ol>
            </div>
        </div>
    </div>
  );
}

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!firebaseApiKey) {
    return <MissingApiKeyError service="Firebase" />;
  }
  
  if (!googleMapsApiKey) {
    return <MissingApiKeyError service="Google Maps" />;
  }

  return (
    <FirebaseProvider>
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
    </FirebaseProvider>
  );
}
