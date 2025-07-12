import { enableFirebaseTelemetry } from '@genkit-ai/firebase';
import {googleAI} from '@genkit-ai/googleai';
import {genkit} from 'genkit';

enableFirebaseTelemetry();

export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: 'v1beta',
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
