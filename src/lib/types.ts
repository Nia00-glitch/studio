
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

// User Profile for Firestore
export interface UserProfile {
  uid: string;
  name: string;
  phoneNumber: string;
  role: 'rider' | 'driver';
  emergencyContact?: string;
  vehicleInfo?: string;
  createdAt: any; // Firestore ServerTimestamp
}


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
