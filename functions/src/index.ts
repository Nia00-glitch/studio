import { onCallGenkit } from '@genkit-ai/firebase';
import { emergencyFlow, niaActionFlow } from './simple-flow';
import { estimateFare } from './estimateFare';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { notifyDriverOnRideRequest } from './notifications';
import { acceptRide } from './rideHandlers';
import * as functions from 'firebase-functions';

// Genkit-powered Cloud Functions
export const simpleGenerate = onCallGenkit({}, emergencyFlow);
export const niaAction = onCallGenkit({}, niaActionFlow);

// Standard HTTPS Callable Cloud Functions
export const rideEstimate = estimateFare;
export const rideAccept = acceptRide;

// --- Firestore Triggers for Ride Matching ---

// Triggered when a new ride is created with status 'pending'.
export const onRideRequest = onDocumentCreated("rides/{rideId}", notifyDriverOnRideRequest);

// Triggered when a ride is updated, used for the retry mechanism.
export const onRideUpdate = onDocumentUpdated('rides/{rideId}', async (event) => {
  const change = event.data;
  if (!change) return;

  const newData = change.after.data();
  const oldData = change.before.data();

  // Check if the update is a driver declining the ride.
  const oldDeclinedByCount = oldData.declinedBy?.length || 0;
  const newDeclinedByCount = newData.declinedBy?.length || 0;

  if (newData.status === 'pending' && newDeclinedByCount > oldDeclinedByCount) {
    functions.logger.log(`Ride ${event.params.rideId} was declined. Re-triggering driver search.`);
    // We pass the after snapshot to the notification function to find a new driver.
    await notifyDriverOnRideRequest(event);
  }

  return null;
});
