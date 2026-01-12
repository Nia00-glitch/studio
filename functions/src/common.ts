
'use server';
/**
 * @fileOverview Shared Genkit AI and Firebase Admin configuration.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import * as admin from 'firebase-admin';

// Initialize firebase-admin SDK.
// This is safe to call multiple times; it returns the existing instance.
if (!admin.apps.length) {
  admin.initializeApp();
}

// Export admin services for use in native Cloud Functions.
export const db = admin.firestore();
export const messaging = admin.messaging();

// Configure Genkit with the Google AI plugin for server-side use.
export const ai = genkit({
  plugins: [googleAI()],
  // You might want to enable this for debugging, but disable for production.
  // logToFirebase: true,
});
