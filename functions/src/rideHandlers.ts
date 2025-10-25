import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

export const acceptRide = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be signed in.");
  const driverId = context.auth.uid;
  const rideId = data.rideId;
  if (!rideId) throw new functions.https.HttpsError("invalid-argument", "Missing rideId");

  const rideRef = db.collection("rides").doc(rideId);

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(rideRef);
      if (!snap.exists) throw new functions.https.HttpsError("not-found", "Ride not found");
      const ride = snap.data();
      if (ride?.status !== "pending" || ride?.driverId) {
        throw new functions.https.HttpsError("failed-precondition", "Ride already taken");
      }
      tx.update(rideRef, { driverId, status: "accepted", acceptedAt: admin.firestore.FieldValue.serverTimestamp() });
    });
    return { success: true };
  } catch (err) {
    // Rethrow HttpsError if it's one
    if (err instanceof functions.https.HttpsError) throw err;
    console.error("acceptRide err", err);
    throw new functions.https.HttpsError("internal", "Could not accept ride");
  }
});
