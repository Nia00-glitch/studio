
import type {NextConfig} from 'next';

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // Inject firebase config into service worker
  pwaExcludes: [/^(?!.*firebase-messaging-sw\.js$).*/],
  firebaseMessagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
});

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // This option correctly tells Next.js to ignore file changes in the functions directory.
  watchOptions: {
    ignored: ['**/functions/**', '**/workspace/**'],
  },
  // Add modern security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Set-Cookie',
            value: 'SameSite=Strict; Secure',
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
