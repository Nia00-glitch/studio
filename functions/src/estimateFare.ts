import * as functions from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { DirectionsRequest, Client as MapsClient, TravelMode } from "@googlemaps/google-maps-services-js";

// Define secrets for API keys
// Read from .env (process.env) instead of functions.config() to avoid "undefined" errors in emulator
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

if (!GOOGLE_MAPS_API_KEY) {
  console.warn("⚠️ WARNING: GOOGLE_MAPS_API_KEY is missing in functions/.env. Fare estimation will fail. Set GOOGLE_MAPS_API_KEY to your Maps API key.");
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

// --- Fare Calculation Constants (Configurable) ---
const FARE_CONFIG = {
  cab: { base: 50, perKm: 12, perMin: 2 },
  auto: { base: 30, perKm: 8, perMin: 1.5 },
  bike: { base: 20, perKm: 6, perMin: 1 },
};

/**
 * A secure, authenticated, and validated HTTPS Callable function to estimate ride fares.
 */
export const estimateFare = onCall(async (request) => {
  // 1. Authentication Check
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in to request a fare estimate.");
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
  const directionsRequest: DirectionsRequest = {
    params: {
      origin: { lat: pickup.lat, lng: pickup.lng },
      destination: { lat: drop.lat, lng: drop.lng },
      mode: TravelMode.driving,
      key: GOOGLE_MAPS_API_KEY!,
    },
  };

  let distanceMeters: number;
  let durationSeconds: number;

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
  } catch (error: any) {
    console.error("Google Directions API call failed:", error);
    // This indicates a more fundamental API issue (e.g., bad key, quota exceeded).
    throw new HttpsError("internal", "Could not calculate the route due to a server error.", { code: "GOOGLE_API_ERROR" });
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
