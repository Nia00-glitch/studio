
import { onCall } from 'firebase-functions/v2/https';
import { emergencyFlow, niaActionFlow } from './simple-flow';
import { estimateFare } from './estimateFare';
import { onDocumentCreated, onDocumentUpdated, FirestoreEvent, Change, QueryDocumentSnapshot } from 'firebase-functions/v2/firestore';
import { notifyDriverOnRideRequest } from './notifications';
import { acceptRide } from './rideHandlers';
import * as functions from 'firebase-functions';
import { debugGemini as debugGeminiHandler } from './debug';

// Genkit-powered Cloud Functions
// Manually wrapping Genkit flows with Firebase v2 onCall to avoid import issues
export const simpleGenerate = onCall(async (request) => {
    return await emergencyFlow(request.data);
});

export const niaAction = onCall(async (request) => {
    return await niaActionFlow(request.data);
});

// Standard HTTPS Callable Cloud Functions
export const rideEstimate = estimateFare;
export const rideAccept = acceptRide;
export const debugGemini = debugGeminiHandler;

// --- Firestore Triggers for Ride Matching ---

// Triggered when a new ride is created with status 'pending'.
export const onRideRequest = onDocumentCreated("rides/{rideId}", async (event) => {
    if (!event.data) return null;
    return notifyDriverOnRideRequest(event as any);
});

// Triggered when a ride is updated, used for the retry mechanism.
export const onRideUpdate = onDocumentUpdated('rides/{rideId}', async (event) => {
  const change = event.data;
  if (!change) return null;

  const newData = change.after.data();
  const oldData = change.before.data();

  // Check if the update is a driver declining the ride.
  const oldDeclinedByCount = oldData.declinedBy?.length || 0;
  const newDeclinedByCount = newData.declinedBy?.length || 0;

  if (newData.status === 'pending' && newDeclinedByCount > oldDeclinedByCount) {
    functions.logger.log(`Ride ${event.params.rideId} was declined. Re-triggering driver search.`);
    // We pass the after snapshot to the notification function to find a new driver.
    // Construct a pseudo-event to reuse the logic
    const pseudoEvent = {
        data: change.after,
        params: event.params
    };
    await notifyDriverOnRideRequest(pseudoEvent);
  }

  return null;
});
