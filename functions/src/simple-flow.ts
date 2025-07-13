'use server';
/**
 * @fileOverview A simple Genkit flow for text generation.
 */
import { z } from 'zod';
import { emergencyFlow } from './index';

// Types for simple-flow
export const SimpleInputSchema = z.object({
  prompt: z.string(),
});
export type SimpleInput = z.infer<typeof SimpleInputSchema>;

export const EmergencyDecisionSchema = z.object({
  activateEmergency: z.boolean().describe("A boolean indicating if emergency mode should be activated."),
  responseText: z.string().describe("A brief, reassuring response to the user."),
});
export type EmergencyDecision = z.infer<typeof EmergencyDecisionSchema>;

export async function simpleGenerate(prompt: SimpleInput): Promise<z.infer<typeof EmergencyDecisionSchema>> {
  return emergencyFlow(prompt);
}
