"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyDriverOnRideRequest = void 0;
const functions = __importStar(require("firebase-functions"));
const common_1 = require("./common");
const firestore_1 = require("firebase-admin/firestore");
/**
 * Calculates the Haversine distance between two points on the Earth.
 * @returns The distance in kilometers.
 */
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
const notifyDriverOnRideRequest = async (event) => {
    const rideId = event.params.rideId;
    const rideData = event.data.data();
    if (!rideData || rideData.status !== 'pending') {
        functions.logger.log(`Ride ${rideId} is not in a valid state for notification, skipping.`);
        return null;
    }
    functions.logger.log(`Processing ride request ${rideId}, finding nearest available driver.`);
    try {
        const declinedBy = rideData.declinedBy || [];
        let driversQuery = common_1.db.collection('driver_locations').where('isOnline', '==', true);
        if (declinedBy.length > 0) {
            driversQuery = driversQuery.where('driver_id', 'not-in', declinedBy.slice(0, 10));
        }
        const driversSnapshot = await driversQuery.get();
        if (driversSnapshot.empty) {
            await common_1.db.collection('rides').doc(rideId).update({ status: 'no_drivers_available', errorMessage: 'No drivers are currently online or available.' });
            return null;
        }
        let nearestDriver = null;
        const { latitude: rideLat, longitude: rideLng } = rideData.pickupLocation;
        for (const driverDoc of driversSnapshot.docs) {
            const driverData = driverDoc.data();
            const driverId = driverData.driver_id;
            const userDoc = await common_1.db.collection('users').doc(driverId).get();
            if (!userDoc.exists())
                continue;
            const userData = userDoc.data();
            if (!userData?.fcmToken)
                continue;
            const distance = getDistance(rideLat, rideLng, driverData.latitude, driverData.longitude);
            if (nearestDriver === null || distance < nearestDriver.distance) {
                nearestDriver = { id: driverId, distance, token: userData.fcmToken };
            }
        }
        if (!nearestDriver) {
            await common_1.db.collection('rides').doc(rideId).update({ status: 'no_drivers_available', errorMessage: 'All nearby drivers have declined.' });
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
            await common_1.messaging.send(message);
        }
        catch (error) {
            functions.logger.error(`Error sending notification to ${nearestDriver.id}:`, error);
            if (error.code === 'messaging/registration-token-not-registered') {
                await common_1.db.collection('users').doc(nearestDriver.id).update({ fcmToken: firestore_1.FieldValue.delete() });
                await common_1.db.collection('rides').doc(rideId).update({ declinedBy: firestore_1.FieldValue.arrayUnion(nearestDriver.id) });
                // Re-triggering the logic is handled by the onUpdate trigger
            }
            return null;
        }
        await common_1.db.collection('rides').doc(rideId).update({ notifiedDriverId: nearestDriver.id });
        return { status: 'success', notifiedDriver: nearestDriver.id };
    }
    catch (error) {
        functions.logger.error(`Failed to process ride request ${rideId}`, error);
        await common_1.db.collection('rides').doc(rideId).update({ status: 'error', errorMessage: 'Internal error during driver matching.' });
        return null;
    }
};
exports.notifyDriverOnRideRequest = notifyDriverOnRideRequest;
