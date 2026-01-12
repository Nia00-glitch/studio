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
exports.onRideUpdate = exports.onRideRequest = exports.debugGemini = exports.rideAccept = exports.rideEstimate = exports.niaAction = exports.simpleGenerate = void 0;
const firebase_1 = require("@genkit-ai/firebase");
const simple_flow_1 = require("./simple-flow");
const estimateFare_1 = require("./estimateFare");
const firestore_1 = require("firebase-functions/v2/firestore");
const notifications_1 = require("./notifications");
const rideHandlers_1 = require("./rideHandlers");
const functions = __importStar(require("firebase-functions"));
const debug_1 = require("./debug");
// Genkit-powered Cloud Functions
exports.simpleGenerate = (0, firebase_1.onCallGenkit)({}, simple_flow_1.emergencyFlow);
exports.niaAction = (0, firebase_1.onCallGenkit)({}, simple_flow_1.niaActionFlow);
// Standard HTTPS Callable Cloud Functions
exports.rideEstimate = estimateFare_1.estimateFare;
exports.rideAccept = rideHandlers_1.acceptRide;
exports.debugGemini = exports.debugGemini;
// --- Firestore Triggers for Ride Matching ---
// Triggered when a new ride is created with status 'pending'.
exports.onRideRequest = (0, firestore_1.onDocumentCreated)("rides/{rideId}", notifications_1.notifyDriverOnRideRequest);
// Triggered when a ride is updated, used for the retry mechanism.
exports.onRideUpdate = (0, firestore_1.onDocumentUpdated)('rides/{rideId}', async (event) => {
    const change = event.data;
    if (!change)
        return;
    const newData = change.after.data();
    const oldData = change.before.data();
    // Check if the update is a driver declining the ride.
    const oldDeclinedByCount = oldData.declinedBy?.length || 0;
    const newDeclinedByCount = newData.declinedBy?.length || 0;
    if (newData.status === 'pending' && newDeclinedByCount > oldDeclinedByCount) {
        functions.logger.log(`Ride ${event.params.rideId} was declined. Re-triggering driver search.`);
        // We pass the after snapshot to the notification function to find a new driver.
        await (0, notifications_1.notifyDriverOnRideRequest)(event);
    }
    return null;
});
