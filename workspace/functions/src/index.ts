
'use server';
import { onCallGenkit } from '@genkit-ai/firebase';
import { emergencyFlow } from './simple-flow';
import { defineSecret } from 'firebase-functions/params';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { notifyDriverOnRideRequest } from './notifications';

admin.initializeApp();

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

export const simpleGenerate = onCallGenkit(
  { secrets: [GEMINI_API_KEY] },
  emergencyFlow
);

// Export the new notification function
export const onRideRequest = functions.firestore
  .document('rides/{rideId}')
  .onCreate(notifyDriverOnRideRequest);
