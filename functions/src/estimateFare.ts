
import * as functions from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { DirectionsRequest, Client as MapsClient } from "@googlemaps/google-maps-services-js";

// It's recommended to set the API key via secrets or environment variables
// For example, using Firebase function secrets: `firebase functions:secrets:set GOOGLE_MAPS_API_KEY`
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

if (!GOOGLE_MAPS_API_KEY) {
  console.error("FATAL ERROR: GOOGLE_MAPS_API_KEY is not set as a secret or environment variable.");
}

const mapsClient = new MapsClient({});

// --- Zod Schemas for Input Validation ---
const LatLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const FareRequestSchema = z.object({
  pickup: LatLngSchema,
  drop: LatLngSchema,
});

// --- Fare Calculation Constants (could be moved to Firestore for dynamic config) ---
const FARE_CONFIG = {
  cab: { base: 40, perKm: 15, perMin: 2 },
  auto: { base: 25, perKm: 11, perMin: 1.5 },
  bike: { base: 15, perKm: 8, perMin: 1 },
};

/**
 * A secure, authenticated, and validated HTTPS Callable function to estimate ride fares.
 */
export const estimateFare = onCall({ secrets: ["GOOGLE_MAPS_API_KEY"] }, async (request) => {
  // 1. Authentication Check
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in to request a fare estimate.");
  }

  // 2. Input Validation
  const validation = FareRequestSchema.safeParse(request.data);
  if (!validation.success) {
    console.error("Invalid input for estimateFare:", validation.error.issues);
    throw new HttpsError("invalid-argument", "The data provided is not in the correct format.", validation.error.format());
  }
  const { pickup, drop } = validation.data;

  // 3. Call Google Directions API
  const directionsRequest: DirectionsRequest = {
    params: {
      origin: { lat: pickup.lat, lng: pickup.lng },
      destination: { lat: drop.lat, lng: drop.lng },
      mode: "driving",
      key: GOOGLE_MAPS_API_KEY!,
    },
  };

  let distanceMeters: number;
  let durationSeconds: number;

  try {
    const response = await mapsClient.directions(directionsRequest);
    const route = response.data.routes[0];
    if (!route || !route.legs[0]) {
      throw new Error("No valid route found.");
    }
    const leg = route.legs[0];
    distanceMeters = leg.distance?.value || 0;
    durationSeconds = leg.duration?.value || 0;
  } catch (error) {
    console.error("Google Directions API call failed:", error);
    throw new HttpsError("internal", "Could not calculate the route.", { code: "DIRECTIONS_FAILED" });
  }

  // 4. Calculate Fares
  const distanceKm = distanceMeters / 1000;
  const durationMin = durationSeconds / 60;

  const calculate = (mode: keyof typeof FARE_CONFIG) => {
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
