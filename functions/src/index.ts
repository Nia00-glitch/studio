/**
 * @fileOverview Defines and exports a secure Genkit flow as a Firebase Cloud Function.
 *
 * This file contains the primary logic for a text generation AI flow using Gemini.
 * It is wrapped as a secure, callable function with authentication and secret management.
 *
 * - simpleGenerate: The exported callable Cloud Function.
 */
import { onCallGenkit } from '@genkit-ai/firebase/functions';
import type { HttpsOptions } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { emergencyFlow } from './simple-flow';


// Define the GEMINI_API_KEY secret. The value is provided when you deploy.
const geminiApiKey = defineSecret('GEMINI_API_KEY');

// Define options for the Cloud Function
const httpsOptions: HttpsOptions = {
  secrets: [geminiApiKey], // Make the secret available to the function
  enforceAppCheck: true, // Protect from unauthorized clients
};

// Export the Genkit flow wrapper as a callable function
export const simpleGenerate = onCallGenkit(httpsOptions, emergencyFlow);
