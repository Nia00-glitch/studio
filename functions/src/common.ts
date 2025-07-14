/**
 * @fileOverview Shared Genkit AI configuration.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// This is the modern way to initialize Genkit, creating a reusable 'ai' object.
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY, // Use the secret managed by Firebase.
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
