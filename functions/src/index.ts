import * as functions from 'firebase-functions';
import { onCallGenkit } from '@genkit-ai/firebase';
import { emergencyFlow, niaActionFlow } from './simple-flow';
import { estimateFare as estimateFareV1 } from './estimateFare';
import { notifyDriverOnRideRequest } from './notifications';
import { acceptRide as acceptRideV1 } from './rideHandlers';

// Genkit-powered Cloud Functions
export const simpleGenerate = onCallGenkit({}, emergencyFlow);
export const niaAction = onCallGenkit({}, niaActionFlow);

// Standard HTTPS Callable Cloud Functions
export const estimateFare = estimateFareV1;
export const acceptRide = acceptRideV1;

// --- Firestore Triggers for Ride Matching ---

// Triggered when a new ride is created with status 'pending'.
export const onRideCreated = functions.firestore
  .document('rides/{rideId}')
  .onCreate(notifyDriverOnRideRequest);

// Triggered when a ride is updated, used for the retry mechanism.
export const onRideUpdated = functions.firestore
    .document('rides/{rideId}')
    .onUpdate((change, context) => {
        const newData = change.after.data();
        const oldData = change.before.data();
        
        // Check if the update is a driver declining the ride.
        const oldDeclinedByCount = oldData.declinedBy?.length || 0;
        const newDeclinedByCount = newData.declinedBy?.length || 0;

        if (newData.status === 'pending' && newDeclinedByCount > oldDeclinedByCount) {
             functions.logger.log(`Ride ${context.params.rideId} was declined. Re-triggering driver search.`);
             // We pass the after snapshot to the notification function to find a new driver.
             return notifyDriverOnRideRequest(change.after, context);
        }
        
        return null;
    });
