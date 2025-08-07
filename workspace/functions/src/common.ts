
/**
 * @fileOverview Shared Genkit AI and Firebase Admin configuration.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import * as admin from 'firebase-admin';

// Initialize firebase-admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

// Export admin services for use in native Cloud Functions
export const db = admin.firestore();
export const messaging = admin.messaging();

// Configure Genkit with the Google AI plugin
// Note: We are removing the client-side '@genkit-ai/firebase' plugin as it's not suitable for this backend environment.
export const ai = genkit({
  plugins: [googleAI()],
});
