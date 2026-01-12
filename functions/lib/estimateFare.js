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
exports.estimateFare = void 0;
const functions = __importStar(require("firebase-functions"));
const https_1 = require("firebase-functions/v2/https");
const zod_1 = require("zod");
const google_maps_services_js_1 = require("@googlemaps/google-maps-services-js");
// Define secrets for API keys
const GOOGLE_MAPS_API_KEY = functions.config().google.maps_api_key ?? process.env.GOOGLE_MAPS_API_KEY;
if (!GOOGLE_MAPS_API_KEY) {
    console.error("FATAL ERROR: GOOGLE_MAPS_API_KEY is not set in environment variables or functions config.");
}
const mapsClient = new google_maps_services_js_1.Client({});
// --- Zod Schemas for Input Validation ---
const LatLngSchema = zod_1.z.object({
    lat: zod_1.z.number().min(-90).max(90),
    lng: zod_1.z.number().min(-180).max(180),
});
const FareRequestSchema = zod_1.z.object({
    pickup: LatLngSchema,
    drop: LatLngSchema,
});
// --- Fare Calculation Constants (Configurable) ---
const FARE_CONFIG = {
    cab: { base: 50, perKm: 12, perMin: 2 },
    auto: { base: 30, perKm: 8, perMin: 1.5 },
    bike: { base: 20, perKm: 6, perMin: 1 },
};
/**
 * A secure, authenticated, and validated HTTPS Callable function to estimate ride fares.
 */
exports.estimateFare = (0, https_1.onCall)(async (request) => {
    // 1. Authentication Check
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be logged in to request a fare estimate.");
    }
    // 2. Input Validation
    const validation = FareRequestSchema.safeParse(request.data);
    if (!validation.success) {
        console.error("Invalid input for estimateFare:", validation.error.issues);
        // Return a structured error for the client to handle
        return { ok: false, code: "BAD_INPUT", message: "Invalid location data provided." };
    }
    const { pickup, drop } = validation.data;
    // 3. Call Google Directions API
    const directionsRequest = {
        params: {
            origin: { lat: pickup.lat, lng: pickup.lng },
            destination: { lat: drop.lat, lng: drop.lng },
            mode: "driving",
            key: GOOGLE_MAPS_API_KEY,
        },
    };
    let distanceMeters;
    let durationSeconds;
    try {
        const response = await mapsClient.directions(directionsRequest);
        const route = response.data.routes[0];
        if (!route || !route.legs[0] || !route.legs[0].distance || !route.legs[0].duration) {
            // This is a valid response, but no route was found.
            return { ok: false, code: "DIRECTIONS_FAILED", message: "No valid route could be found between the locations." };
        }
        const leg = route.legs[0];
        distanceMeters = leg.distance.value;
        durationSeconds = leg.duration.value;
    }
    catch (error) {
        console.error("Google Directions API call failed:", error);
        // This indicates a more fundamental API issue (e.g., bad key, quota exceeded).
        throw new https_1.HttpsError("internal", "Could not calculate the route due to a server error.", { code: "GOOGLE_API_ERROR" });
    }
    // 4. Calculate Fares
    const distanceKm = distanceMeters / 1000;
    const durationMin = durationSeconds / 60;
    const calculate = (mode) => {
        const config = FARE_CONFIG[mode];
        const fare = config.base + (distanceKm * config.perKm) + (durationMin * config.perMin);
        return Math.round(fare); // Return a clean integer
    };
    const estimates = {
        cab: calculate("cab"),
        auto: calculate("auto"),
        bike: calculate("bike"),
    };
    // 5. Return Successful Response
    return {
        ok: true,
        distanceKm: parseFloat(distanceKm.toFixed(2)),
        durationMin: Math.round(durationMin),
        estimates,
    };
});
