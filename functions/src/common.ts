/**
 * @fileOverview Shared Genkit AI configuration.
 */
import { genkit } from 'genkit';
import { firebasePlugin } from '@genkit-ai/firebase';
import { googleAI } from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI(), firebasePlugin()],
});
