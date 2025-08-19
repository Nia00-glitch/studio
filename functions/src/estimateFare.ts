
import * as functions from "firebase-functions";
import { HttpsError } from "firebase-functions/v2/https";
import * as z from "zod";
import fetch from "node-fetch";

const apiKey = functions.config().google.maps_api_key;

const FareRequestSchema = z.object({
  pickup: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  drop: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
});

export const estimateFare = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in to request a fare estimate.");
  }

  const validation = FareRequestSchema.safeParse(data);
  if (!validation.success) {
    throw new HttpsError("invalid-argument", "The data provided is not in the correct format.");
  }

  const { pickup, drop } = validation.data;
  const origin = `${pickup.lat},${pickup.lng}`;
  const destination = `${drop.lat},${drop.lng}`;

  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const jsonResponse = await response.json();

    if (jsonResponse.status !== "OK" || !jsonResponse.routes || jsonResponse.routes.length === 0) {
      console.error("Directions API Error:", jsonResponse.error_message || jsonResponse.status);
      throw new HttpsError("not-found", "Could not calculate a route for the given locations.", { code: "DIRECTIONS_FAILED" });
    }

    const route = jsonResponse.routes[0].legs[0];
    const distanceMeters = route.distance.value;
    const durationSeconds = route.duration.value;

    const distanceKm = distanceMeters / 1000;
    const durationMin = durationSeconds / 60;

    // Fare Formula: baseFare (30) + (12 × km) + (2 × minutes)
    const fare = Math.round(30 + (12 * distanceKm) + (2 * durationMin));

    return {
      success: true,
      fare,
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      durationMin: Math.round(durationMin),
    };
  } catch (error) {
    console.error("Error calling Google Directions API:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "An unexpected error occurred while estimating the fare.");
  }
});
