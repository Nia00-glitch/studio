import * as admin from "firebase-admin";
import * as functions from 'firebase-functions';
import { DocumentSnapshot } from "firebase-admin/firestore";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

/**
 * notifyDriverOnRideRequest runs when a new ride doc is created (status 'pending').
 * It finds nearby online drivers and sends FCM notifications.
 */
export async function notifyDriverOnRideRequest(snapshot: DocumentSnapshot, context?: functions.EventContext) {
  const ride = snapshot.data();
  if (!ride) return;
  if (ride.status !== "pending") return;

  // Query drivers collection for isOnline == true
  const driversSnap = await db.collection("driver_locations").limit(10).get();
  
  const tokens: string[] = [];
  
  const driverDocs = await db.collection("users").where('role', '==', 'driver').get();
  const driverFcmMap: {[key: string]: string} = {};
  driverDocs.forEach(doc => {
    const data = doc.data();
    if(data.fcmToken) {
      driverFcmMap[doc.id] = data.fcmToken;
    }
  });

  driversSnap.forEach(doc => {
    const driverId = doc.id;
    if (driverFcmMap[driverId]) {
      tokens.push(driverFcmMap[driverId]);
    }
  });
  
  if (tokens.length === 0) {
    // No drivers online; update ride to 'no_driver_found' after small delay or leave pending and implement retry logic
    await snapshot.ref.update({ status: "no_drivers_available", errorMessage: "No drivers were found online.", noDriverAt: admin.firestore.FieldValue.serverTimestamp() });
    return;
  }

  const message = {
    notification: {
      title: "New ride request",
      body: `Ride requested near you. Tap to view.`,
    },
    data: {
      rideId: snapshot.id,
      type: "RIDE_REQUEST",
    },
    tokens: tokens,
  };

  try {
    const res = await messaging.sendEachForMulticast(message as any);
    // Log failures
    if (res.failureCount > 0) {
      console.warn("Some pushes failed", res.responses.filter(r => !r.success));
    }
    // Optionally store attempts in Firestore
    await snapshot.ref.update({ lastNotifiedAt: admin.firestore.FieldValue.serverTimestamp(), notifiedCount: res.successCount || 0 });
  } catch (err) {
    console.error("FCM error", err);
  }
}
