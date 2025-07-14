
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import dynamic from 'next/dynamic';
import './globals.css';
import { EmergencyProvider } from '@/contexts/EmergencyContext';
import { Toaster } from '@/components/ui/toaster';
import MicStatusIndicator from '@/components/MicStatusIndicator';

const inter = Inter({ subsets: ['latin'] });

// Dynamically import the VoiceListener component with SSR turned off
const VoiceListener = dynamic(() => import('@/components/VoiceListener'), {
  ssr: false,
});

export const metadata: Metadata = {
  title: 'NIA Safety Assistant',
  description: 'Emergency Voice-Activated App',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <EmergencyProvider>
          <VoiceListener />
          <MicStatusIndicator />
          {children}
          <Toaster />
        </EmergencyProvider>
      </body>
    </html>
  );
}
