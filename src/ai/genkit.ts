import {firebase} from '@genkit-ai/firebase/plugin';
import {googleAI} from '@genkit-ai/googleai';
import {genkit} from 'genkit';

export const ai = genkit({
  plugins: [
    firebase(),
    googleAI({
      apiVersion: 'v1beta',
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
