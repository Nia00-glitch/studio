
'use server';
import { onCallGenkit } from '@genkit-ai/firebase';
import { emergencyFlow } from './simple-flow';
import { defineSecret } from 'firebase-functions/params';

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

export const simpleGenerate = onCallGenkit(
  { secrets: [GEMINI_API_KEY] },
  emergencyFlow
);
