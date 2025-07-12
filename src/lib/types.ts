import { z } from 'zod';

export interface Contact {
  id: string;
  name: string;
  phone: string;
}

export interface Settings {
  autoSendLocation: boolean;
  enableRecording: boolean;
  contacts: Contact[];
}

// Types for simple-flow
export const SimpleInputSchema = z.string();
export type SimpleInput = z.infer<typeof SimpleInputSchema>;

export const SimpleOutputSchema = z.string();
export type SimpleOutput = z.infer<typeof SimpleOutputSchema>;
