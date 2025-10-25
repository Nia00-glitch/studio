
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { DocumentSnapshot } from "firebase-admin/firestore";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Calculates the Haversine distance between two points on the Earth.
 * @returns The distance in kilometers.
 */
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}


export async function notifyDriverOnRideRequest(snapshot: DocumentSnapshot, context: functions.EventContext) {
  const rideData = snapshot.data();
  if (!rideData || rideData.status !== 'pending') {
    functions.logger.log(`Ride ${snapshot.id} is not in 'pending' state, skipping.`);
    return null;
  }

  const declinedBy = rideData.declinedBy || [];

  // Query for online drivers who have not already declined this ride.
  // NOTE: 'not-in' queries are limited to 30 values. For a larger scale,
  // a more sophisticated driver matching service would be needed.
  let driversQuery: admin.firestore.Query = db.collection('driver_locations').where('isOnline', '==', true);
  if (declinedBy.length > 0) {
      driversQuery = driversQuery.where('driver_id', 'not-in', declinedBy.slice(0, 30));
  }
  
  const driversSnapshot = await driversQuery.get();

  if (driversSnapshot.empty) {
    functions.logger.warn(`No available drivers for ride ${snapshot.id}.`);
    return snapshot.ref.update({ status: 'no_drivers_available', errorMessage: 'No drivers are currently available.' });
  }

  const { latitude: rideLat, longitude: rideLng } = rideData.pickupLocation;
  let nearestDriver: { id: string, distance: number, token: string } | null = null;

  // Find the closest driver from the available pool.
  for (const driverDoc of driversSnapshot.docs) {
    const driverData = driverDoc.data();
    const distance = getDistance(rideLat, rideLng, driverData.latitude, driverData.longitude);
    
    // We need to fetch the user document to get the FCM token.
    // This could be optimized by storing the FCM token on the driver_location doc.
    const userDoc = await db.collection('users').doc(driverData.driver_id).get();
    const fcmToken = userDoc.data()?.fcmToken;

    if (fcmToken && (nearestDriver === null || distance < nearestDriver.distance)) {
      nearestDriver = { id: driverData.driver_id, distance, token: fcmToken };
    }
  }

  if (!nearestDriver) {
    functions.logger.warn(`No available drivers with FCM tokens for ride ${snapshot.id}.`);
    return snapshot.ref.update({ status: 'no_drivers_available', errorMessage: 'Could not find any drivers to notify.' });
  }

  functions.logger.log(`Notifying nearest driver ${nearestDriver.id} for ride ${snapshot.id}.`);

  const message = {
    token: nearestDriver.token,
    notification: {
      title: "New Ride Request!",
      body: `A rider is nearby. Estimated fare: ₹${rideData.priceEstimate || 'N/A'}.`,
    },
    webpush: {
      fcm_options: { link: `/driver-home?rideId=${snapshot.id}` },
    },
    data: { rideId: snapshot.id },
  };

  try {
    await messaging.send(message);
    // Mark the ride so we know which driver was notified.
    return snapshot.ref.update({ notifiedDriverId: nearestDriver.id, lastNotifiedAt: admin.firestore.FieldValue.serverTimestamp() });
  } catch (error) {
    functions.logger.error(`Failed to send notification to driver ${nearestDriver.id}:`, error);
    // TODO: Handle stale tokens by removing them from the user profile.
    // TODO: Trigger a retry to find the *next* nearest driver.
    return null;
  }
}
