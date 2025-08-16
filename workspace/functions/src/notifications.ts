
import * as functions from 'firebase-functions';
import { db, messaging } from './common'; // Use shared admin instance
import { FieldValue } from 'firebase-admin/firestore';

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

export const notifyDriverOnRideRequest = async (
  snap: functions.firestore.QueryDocumentSnapshot,
  context: functions.EventContext
) => {
  const rideData = snap.data();
  const rideId = context.params.rideId;

  if (rideData.status !== 'pending') {
    functions.logger.log(`Ride ${rideId} is not pending, skipping.`);
    return null;
  }

  functions.logger.log(`New ride request ${rideId}, finding nearest driver.`);

  try {
    const driversSnapshot = await db.collection('driver_locations').get();
    if (driversSnapshot.empty) {
      await db.collection('rides').doc(rideId).update({ status: 'no_drivers_available' });
      return null;
    }

    let nearestDriver: { id: string, distance: number, token: string } | null = null;
    const { latitude: rideLat, longitude: rideLng } = rideData.pickupLocation;

    for (const driverDoc of driversSnapshot.docs) {
      const driverData = driverDoc.data();
      const distance = getDistance(rideLat, rideLng, driverData.latitude, driverData.longitude);
      
      const userDoc = await db.collection('users').doc(driverData.driver_id).get();
      if (!userDoc.exists()) continue;
      
      const userData = userDoc.data();
      if (!userData?.fcmToken) continue;
      
      if (nearestDriver === null || distance < nearestDriver.distance) {
        nearestDriver = { id: driverData.driver_id, distance, token: userData.fcmToken };
      }
    }

    if (!nearestDriver) {
      await db.collection('rides').doc(rideId).update({ status: 'no_drivers_available' });
      return null;
    }

    functions.logger.log(`Notifying nearest driver: ${nearestDriver.id}.`);
    
    // --- 🚀 PERFORMANCE & RELIABILITY OPTIMIZATION ---
    // The webpush.fcm_options.link is crucial for PWA/web notifications
    const message = {
      notification: {
        title: 'New Ride Request!',
        body: 'A rider is waiting nearby. Tap to accept.',
      },
      token: nearestDriver.token,
      webpush: {
        notification: {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge.png'
        },
        fcm_options: {
          link: `/driver-home?rideId=${rideId}` // Deep-link
        },
      },
      data: {
        url: `/driver-home?rideId=${rideId}`, // Pass URL for service worker
      },
    };
    
    try {
        await messaging.send(message);
    } catch (error: any) {
        functions.logger.error(`Error sending notification to ${nearestDriver.id}:`, error);
        // --- 🚀 RELIABILITY OPTIMIZATION: Clean up stale tokens ---
        if (
          error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered'
        ) {
          functions.logger.log(`Stale FCM token for driver ${nearestDriver.id}. Removing.`);
          await db.collection('users').doc(nearestDriver.id).update({
            fcmToken: FieldValue.delete(),
          });
        }
        // We might want to try notifying the *next* nearest driver here in a real-world scenario.
    }

    await db.collection('rides').doc(rideId).update({
      notifiedDriverId: nearestDriver.id,
    });
    
    return { status: 'success', driverId: nearestDriver.id };

  } catch (error) {
    functions.logger.error(`Failed to process ride request ${rideId}`, error);
    await db.collection('rides').doc(rideId).update({ status: 'error', errorMessage: 'Failed to find and notify a driver' });
    return null;
  }
};
