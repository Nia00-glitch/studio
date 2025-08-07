
'use server';
import { onCallGenkit } from '@genkit-ai/firebase';
import { emergencyFlow } from './simple-flow';
import { defineSecret } from 'firebase-functions/params';
import * as functions from 'firebase-functions';
import { notifyDriverOnRideRequest } from './notifications';

// Note: admin.initializeApp() is now handled in common.ts to avoid multiple initializations.

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

// Genkit onCall function for emergency analysis
export const simpleGenerate = onCallGenkit(
  { secrets: [GEMINI_API_KEY] },
  emergencyFlow
);

// Native Firestore-triggered function for ride requests
export const onRideRequest = functions.firestore
  .document('rides/{rideId}')
  .onCreate(notifyDriverOnRideRequest);
