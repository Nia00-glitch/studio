
'use server';
/**
 * @fileOverview A simple Genkit flow for text generation.
 */
import { ai } from '@/ai/genkit';
import { EmergencyDecisionSchema, SimpleInputSchema, type SimpleInput } from '@/lib/types';
import { z } from 'zod';

const emergencyPrompt = ai.definePrompt(
  {
    name: 'emergencyPrompt',
    input: { schema: SimpleInputSchema },
    output: { schema: EmergencyDecisionSchema },
    prompt: `You are NIA, a voice-activated AI safety assistant. Your primary function is to determine if a user's voice command constitutes a genuine emergency.

    Analyze the user's transcript for keywords indicating distress or a request for help.
    
    Keywords to look for (in English or Hindi): 'help', 'emergency', 'danger', 'bachao', 'madad', 'help me', 'problem'.

    Your Task:
    1. If the transcript contains clear and urgent emergency keywords, set 'activateEmergency' to true.
    2. If the user's intent is unclear or does not seem like an emergency, set 'activateEmergency' to false.
    3. Provide a brief, reassuring 'responseText' for the user. If activating, confirm it. If not, state that you are on standby.

    Example 1:
    User input: "NIA help me I'm in trouble"
    Your output: { "activateEmergency": true, "responseText": "Emergency mode activated. I am sending for help." }

    Example 2:
    User input: "what is the time NIA"
    Your output: { "activateEmergency": false, "responseText": "I am here if you need me. Just say the word." }
    
    User Transcript:
    "{{prompt}}"`,
  },
);

const emergencyFlow = ai.defineFlow(
  {
    name: 'emergencyFlow',
    inputSchema: SimpleInputSchema,
    outputSchema: EmergencyDecisionSchema,
  },
  async (prompt) => {
    const { output } = await emergencyPrompt({ prompt });
    return output!;
  }
);

export async function simpleGenerate(prompt: SimpleInput): Promise<z.infer<typeof EmergencyDecisionSchema>> {
  return emergencyFlow(prompt);
}
