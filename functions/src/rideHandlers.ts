import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

export const acceptRide = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in to accept a ride.");
  }
  
  // In a real app, we'd verify this with custom claims.
  // const isDriver = context.auth.token.role === 'driver';
  // if (!isDriver) {
  //   throw new functions.https.HttpsError("permission-denied", "Only verified drivers can accept rides.");
  // }
  
  const driverId = context.auth.uid;
  const { rideId } = data;

  if (!rideId) {
    throw new functions.https.HttpsError("invalid-argument", "The function must be called with a 'rideId'.");
  }

  const rideRef = db.collection("rides").doc(rideId);

  try {
    await db.runTransaction(async (transaction) => {
      const rideDoc = await transaction.get(rideRef);
      if (!rideDoc.exists) {
        throw new functions.https.HttpsError("not-found", "This ride could not be found.");
      }

      const rideData = rideDoc.data();
      // Check if the ride is still available to be accepted.
      if (rideData?.status !== "pending" || rideData?.driverId) {
        throw new functions.https.HttpsError("failed-precondition", "This ride has already been accepted by another driver.");
      }

      // Atomically accept the ride.
      transaction.update(rideRef, { 
        status: "accepted", 
        driverId: driverId,
        // driverName can be fetched from the driver's profile
        acceptedAt: admin.firestore.FieldValue.serverTimestamp() 
      });
    });

    return { success: true, message: "Ride accepted successfully." };

  } catch (error) {
    console.error(`Error accepting ride ${rideId} for driver ${driverId}:`, error);

    // Re-throw specific errors to be handled by the client.
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    // Throw a generic internal error for anything else.
    throw new functions.https.HttpsError("internal", "An unexpected error occurred while trying to accept the ride.");
  }
});
