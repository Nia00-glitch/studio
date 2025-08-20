
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
    prompt: z.string().optional(), // Pass through original prompt for context
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
    notifiedDriverId?: string | null;
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
    mode?: 'cab' | 'auto' | 'bike';
    priceEstimate?: number;
    declinedBy?: string[];
}

// Types for Fare Estimation
export interface FareEstimates {
    distanceKm: number;
    durationMin: number;
    estimates: {
        cab: number;
        auto: number;
        bike: number;
    };
}

// Types for Rider Voice Dialog State Machine
export type VoiceDialogState = 
    | { status: 'IDLE' }
    | { status: 'LISTENING' }
    | { status: 'PARSING' }
    | { 
        status: 'AWAITING_MODE_CONFIRMATION'; 
        destination: string;
        fares: FareEstimates;
        pickup: { lat: number; lng: number };
      }
    | { 
        status: 'AWAITING_FINAL_CONFIRMATION';
        destination: string;
        pickup: { lat: number; lng: number };
        fares: FareEstimates;
        mode: 'cab' | 'auto' | 'bike';
        priceEstimate: number;
    }
    | { status: 'EXECUTING' }
    | { status: 'ERROR'; message: string };

// Types for Driver Voice Dialog State Machine
export type DriverVoiceState =
    | "IDLE"
    | "ANNOUNCING"
    | "LISTENING_DECISION"
    | "UPDATING_RIDE"
    | "DONE"
    | "FAILED";

export type VoiceDecision = "ACCEPT" | "DECLINE";
