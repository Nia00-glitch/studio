
'use server';
/**
 * @fileOverview A simple Genkit flow for text generation.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const SimpleInputSchema = z.string();
export type SimpleInput = z.infer<typeof SimpleInputSchema>;

export const SimpleOutputSchema = z.string();
export type SimpleOutput = z.infer<typeof SimpleOutputSchema>;

const simplePrompt = ai.definePrompt(
  {
    name: 'simplePrompt',
    input: { schema: SimpleInputSchema },
    output: { schema: SimpleOutputSchema },
    prompt: `You are a helpful assistant. Respond to the following prompt: {{{prompt}}}`,
  },
);

const simpleFlow = ai.defineFlow(
  {
    name: 'simpleFlow',
    inputSchema: SimpleInputSchema,
    outputSchema: SimpleOutputSchema,
  },
  async (prompt) => {
    const { output } = await simplePrompt(prompt);
    return output ?? '';
  }
);

export async function simpleGenerate(prompt: SimpleInput): Promise<SimpleOutput> {
  return simpleFlow(prompt);
}
