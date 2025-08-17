
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

export interface UserProfile {
  uid: string;
  name:string;
  phoneNumber: string;
  role: 'rider' | 'driver';
  emergencyContact?: string;
  vehicleInfo?: string;
  fcmToken?: string;
  createdAt: any;
  updatedAt?: any;
}

// Legacy Emergency Flow Types
export const SimpleInputSchema = z.object({ prompt: z.string() });
export type SimpleInput = z.infer<typeof SimpleInputSchema>;
export const EmergencyDecisionSchema = z.object({
  activateEmergency: z.boolean(),
  responseText: z.string(),
});
export type EmergencyDecision = z.infer<typeof EmergencyDecisionSchema>;


// Advanced NLU Action Flow Types
const IntentSchema = z.enum(['RIDE_REQUEST', 'SOS_REQUEST', 'CANCEL_RIDE', 'CONFIRMATION_YES', 'CONFIRMATION_NO', 'UNKNOWN']);
const EntitiesSchema = z.object({
  destination: z.string().optional(),
});
export const NiaActionSchema = z.object({
    intent: IntentSchema,
    entities: EntitiesSchema,
    responseText: z.string(),
});
export type NiaAction = z.infer<typeof NiaActionSchema>;


// Ride document structure
export interface Ride {
    id: string;
    riderId: string;
    riderName: string;
    pickupLocation: {
        latitude: number;
        longitude: number;
        address?: string;
    };
    destinationAddress: string;
    status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled' | 'no_drivers_available' | 'error';
    requestedAt: any;
    notifiedDriverId?: string;
    driverId?: string;
    driverName?: string;
    driverLive?: {
        lat: number;
        lng: number;
        heading?: number | null;
        updatedAt: any;
    };
    acceptedAt?: any;
    completedAt?: any;
    errorMessage?: string;
}
