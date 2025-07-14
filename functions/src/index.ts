
import { onCall } from 'firebase-functions/v2/https';
import { emergencyFlow } from './simple-flow';
import { defineSecret } from 'firebase-functions/params';

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

export const simpleGenerate = onCall(
  { secrets: [GEMINI_API_KEY] },
  emergencyFlow
);
