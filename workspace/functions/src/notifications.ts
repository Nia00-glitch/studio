
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Calculates the Haversine distance between two points on the Earth.
 * @param lat1 Latitude of the first point.
 * @param lon1 Longitude of the first point.
 * @param lat2 Latitude of the second point.
 * @param lon2 Longitude of the second point.
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

export const notifyDriverOnRideRequest = async (
  snap: functions.firestore.QueryDocumentSnapshot,
  context: functions.EventContext
) => {
  const rideData = snap.data();
  const rideId = context.params.rideId;

  // 1. Ensure this is a new, pending ride request
  if (rideData.status !== 'pending') {
    functions.logger.log(`Ride ${rideId} is not pending, skipping notification.`);
    return null;
  }

  functions.logger.log(`New ride request ${rideId}, finding nearest driver.`);

  try {
    // 2. Fetch all online drivers
    const driversSnapshot = await db.collection('driver_locations').get();
    if (driversSnapshot.empty) {
      functions.logger.warn('No online drivers available.');
      // Optional: Update ride status to 'no_drivers_available'
      await db.collection('rides').doc(rideId).update({ status: 'no_drivers_available' });
      return null;
    }

    let nearestDriver: { id: string, distance: number, token: string } | null = null;
    const { latitude: rideLat, longitude: rideLng } = rideData.pickupLocation;

    // 3. Find the closest driver
    for (const driverDoc of driversSnapshot.docs) {
      const driverData = driverDoc.data();
      const { latitude: driverLat, longitude: driverLng } = driverData;
      const distance = getDistance(rideLat, rideLng, driverLat, driverLng);
      
      // Fetch driver's user data to get FCM token
      const userDoc = await db.collection('users').doc(driverData.driver_id).get();
      if (!userDoc.exists) {
        functions.logger.warn(`User document for driver ${driverData.driver_id} not found.`);
        continue;
      }
      
      const userData = userDoc.data();
      if (!userData?.fcmToken) {
        functions.logger.warn(`FCM token for driver ${driverData.driver_id} is missing.`);
        continue;
      }
      
      if (nearestDriver === null || distance < nearestDriver.distance) {
        nearestDriver = { id: driverData.driver_id, distance, token: userData.fcmToken };
      }
    }

    if (!nearestDriver) {
      functions.logger.warn('Could not find a valid nearest driver with an FCM token.');
      await db.collection('rides').doc(rideId).update({ status: 'no_drivers_available' });
      return null;
    }

    functions.logger.log(`Nearest driver found: ${nearestDriver.id} at ${nearestDriver.distance.toFixed(2)} km.`);

    // 4. Send FCM Notification
    const message = {
      notification: {
        title: 'New Ride Request Nearby',
        body: 'Tap to view and accept the ride.',
      },
      token: nearestDriver.token,
      data: {
        rideId: rideId,
        click_action: 'FLUTTER_NOTIFICATION_CLICK', // Standard for cross-platform compatibility
      }
    };

    await admin.messaging().send(message);
    functions.logger.log(`Successfully sent notification to driver ${nearestDriver.id}.`);

    // 5. Update the ride document with the notified driver's ID
    await db.collection('rides').doc(rideId).update({
      notifiedDriverId: nearestDriver.id,
    });
    
    return { status: 'success', driverId: nearestDriver.id };

  } catch (error) {
    functions.logger.error(`Failed to process ride request ${rideId}`, error);
    // Optional: Update ride status to 'error'
    await db.collection('rides').doc(rideId).update({ status: 'error', errorMessage: 'Failed to notify driver' });
    return null;
  }
};
