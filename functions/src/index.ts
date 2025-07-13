/**
 * @fileOverview Defines and exports a secure Genkit flow as a Firebase Cloud Function.
 *
 * This file contains the primary logic for a text generation AI flow using Gemini.
 * It is wrapped as a secure, callable function with authentication and secret management.
 *
 * - generateText: The exported callable Cloud Function.
 */
import { onCallGenkit } from '@genkit-ai/firebase/functions';
import type { HttpsOptions } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { z } from 'zod';
import { ai } from './common';
import { EmergencyDecisionSchema, SimpleInputSchema } from './simple-flow';


// Define the GEMINI_API_KEY secret. The value is provided when you deploy.
const geminiApiKey = defineSecret('GEMINI_API_KEY');

// Define options for the Cloud Function
const httpsOptions: HttpsOptions = {
  secrets: [geminiApiKey], // Make the secret available to the function
  enforceAppCheck: true, // Protect from unauthorized clients
};

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

export const emergencyFlow = ai.defineFlow(
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


// Export the Genkit flow wrapper as a callable function
export const simpleGenerate = onCallGenkit(httpsOptions, emergencyFlow);