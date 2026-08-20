
import * as functions from 'firebase-functions';
import { db, messaging } from './common';
import { FieldValue } from 'firebase-admin/firestore';
import { DocumentSnapshot } from 'firebase-functions/v2/firestore';

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

export const notifyDriverOnRideRequest = async (event: { data: DocumentSnapshot, params: { rideId: string } }) => {
    const rideId = event.params.rideId;
    const rideData = event.data.data();

    if (!rideData || rideData.status !== 'pending') {
        functions.logger.log(`Ride ${rideId} is not in a valid state for notification, skipping.`);
        return null;
    }

    functions.logger.log(`Processing ride request ${rideId}, finding nearest available driver.`);

    try {
        const declinedBy = rideData.declinedBy || [];

        let driversQuery = db.collection('driver_locations').where('isOnline', '==', true);

        if (declinedBy.length > 0) {
            driversQuery = driversQuery.where('driver_id', 'not-in', declinedBy.slice(0, 10));
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
            const userDoc = await db.collection('users').doc(driverId).get();
            if (!userDoc.exists) continue;

            const userData = userDoc.data();
            if (!userData?.fcmToken) continue;

            const distance = getDistance(rideLat, rideLng, driverData.latitude, driverData.longitude);

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
                notification: { icon: '/icons/icon-192x192.png', badge: '/icons/badge.png' },
                fcm_options: { link: `/driver-home?rideId=${rideId}` },
            },
            data: { rideId: rideId, url: `/driver-home?rideId=${rideId}` },
        };

        try {
            await messaging.send(message);
        } catch (error: any) {
            functions.logger.error(`Error sending notification to ${nearestDriver.id}:`, error);
            if (error.code === 'messaging/registration-token-not-registered') {
                await db.collection('users').doc(nearestDriver.id).update({ fcmToken: FieldValue.delete() });
                await db.collection('rides').doc(rideId).update({ declinedBy: FieldValue.arrayUnion(nearestDriver.id) });
                // Re-triggering the logic is handled by the onUpdate trigger
            }
            return null;
        }

        await db.collection('rides').doc(rideId).update({ notifiedDriverId: nearestDriver.id });
        return { status: 'success', notifiedDriver: nearestDriver.id };

    } catch (error) {
        functions.logger.error(`Failed to process ride request ${rideId}`, error);
        await db.collection('rides').doc(rideId).update({ status: 'error', errorMessage: 'Internal error during driver matching.' });
        return null;
    }
};
