/**
 * @fileOverview Defines and exports a secure Genkit flow as a Firebase Cloud Function.
 *
 * This file contains the primary logic for a text generation AI flow using Gemini.
 * It is wrapped as a secure, callable function with authentication and secret management.
 */
import { onCall } from 'firebase-functions/v2/https';
import { onCallGenkit } from 'genkit';
import { emergencyFlow } from './simple-flow';
import { defineSecret } from 'firebase-functions/params';

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

export const simpleGenerate = onCall(
  { secrets: [GEMINI_API_KEY] },
  onCallGenkit(emergencyFlow)
);
