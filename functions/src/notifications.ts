import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
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
  snap: functions.firestore.DocumentSnapshot,
  context: functions.EventContext
) => {
  const rideData = snap.data();
  const rideId = context.params.rideId;

  if (!rideData || rideData.status !== 'pending') {
    functions.logger.log(`Ride ${rideId} is not in a valid state for notification, skipping.`);
    return null;
  }

  functions.logger.log(`Processing ride request ${rideId}, finding nearest available driver.`);

  try {
    const declinedBy = rideData.declinedBy || [];
    
    // Base query for available drivers
    let driversQuery: admin.firestore.Query = db.collection('driver_locations');
    
    // --- ✅ RESILIENCY: Exclude drivers who have already declined ---
    if (declinedBy.length > 0) {
        // Firestore's 'not-in' query has a limit of 30 items. For a production system,
        // this is a reasonable limit for an MVP.
        driversQuery = driversQuery.where('driver_id', 'not-in', declinedBy);
    }
    
    const driversSnapshot = await driversQuery.get();

    if (driversSnapshot.empty) {
      await db.collection('rides').doc(rideId).update({ status: 'no_drivers_available', errorMessage: 'No drivers are currently online or available.' });
      return null;
    }

    let nearestDriver: { id: string, distance: number, token: string } | null = null;
    const { latitude: rideLat, longitude: rideLng } = rideData.pickupLocation;

    for (const driverDoc of driversSnapshot.docs) {
      const driverData = driverDoc.data();
      const driverId = driverData.driver_id;

      const distance = getDistance(rideLat, rideLng, driverData.latitude, driverData.longitude);
      
      const userDoc = await db.collection('users').doc(driverId).get();
      if (!userDoc.exists()) continue;
      
      const userData = userDoc.data();
      if (!userData?.fcmToken) continue;
      
      if (nearestDriver === null || distance < nearestDriver.distance) {
        nearestDriver = { id: driverId, distance, token: userData.fcmToken };
      }
    }

    if (!nearestDriver) {
      await db.collection('rides').doc(rideId).update({ status: 'no_drivers_available', errorMessage: 'All nearby drivers have declined.' });
      return null;
    }

    functions.logger.log(`Notifying nearest driver: ${nearestDriver.id} for ride ${rideId}.`);
    
    const message = {
      notification: {
        title: 'New Ride Request!',
        body: `Pickup near you. Est. fare: ₹${rideData.priceEstimate || 'N/A'}.`,
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
        rideId: rideId,
        url: `/driver-home?rideId=${rideId}`, // Pass URL for service worker
      },
    };
    
    try {
        await messaging.send(message);
    } catch (error: any) {
        functions.logger.error(`Error sending notification to ${nearestDriver.id}:`, error);
        if (
          error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered'
        ) {
          functions.logger.log(`Stale FCM token for driver ${nearestDriver.id}. Removing.`);
          await db.collection('users').doc(nearestDriver.id).update({
            fcmToken: FieldValue.delete(),
          });
          // After cleaning the token, immediately re-trigger the logic to find the *next* driver.
          return notifyDriverOnRideRequest(snap, context);
        }
    }

    // Atomically update the ride with the driver we've just notified.
    await db.collection('rides').doc(rideId).update({
      notifiedDriverId: nearestDriver.id,
    });
    
    return { status: 'success', notifiedDriver: nearestDriver.id };

  } catch (error) {
    functions.logger.error(`Failed to process ride request ${rideId}`, error);
    await db.collection('rides').doc(rideId).update({ status: 'error', errorMessage: 'Internal error during driver matching.' });
    return null;
  }
};
