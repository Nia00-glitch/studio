

import { onCallGenkit } from '@genkit-ai/firebase';
import { emergencyFlow, niaActionFlow } from './simple-flow';
import { estimateFare } from './estimateFare';
import * as functions from 'firebase-functions';
import { notifyDriverOnRideRequest } from './notifications';

// Note: admin.initializeApp() is now handled in common.ts to avoid multiple initializations.

export const simpleGenerate = onCallGenkit({}, emergencyFlow);
export const niaAction = onCallGenkit({}, niaActionFlow);
export { estimateFare };


// Native Firestore-triggered function for ride requests
export const onRideRequest = functions.firestore
  .document('rides/{rideId}')
  .onCreate(notifyDriverOnRideRequest);
