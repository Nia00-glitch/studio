
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
    prompt: `If user says 'NIA help karo', 'Madad karo', 'Emergency' or 'Help me', trigger emergency mode, start hidden video recording, and share live location via WhatsApp and SMS. Respond with: 'Emergency Mode Activated'.`,
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
