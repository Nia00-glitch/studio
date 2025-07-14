/**
 * @fileOverview Shared Genkit AI configuration.
 */
import { genkit } from 'genkit';
import { firebase } from '@genkit-ai/firebase';
import { googleAI } from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI(), firebase()],
});
