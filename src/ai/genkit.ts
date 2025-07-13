
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';
import {googleAI} from '@genkit-ai/googleai';
import {genkit} from 'genkit';

enableFirebaseTelemetry();

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
      apiVersion: 'v1beta',
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
