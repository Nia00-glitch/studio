
"use client";

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import type { FareEstimates } from './types';

interface FareQuoteInput {
    pickup: { lat: number; lng: number };
    drop: { lat: number; lng: number };
}

// This interface must match the backend response for both success and structured errors
interface FareQuoteResponse {
    ok: boolean;
    distanceKm?: number;
    durationMin?: number;
    estimates?: {
        cab: number;
        auto: number;
        bike: number;
    };
    code?: 'DIRECTIONS_FAILED' | 'BAD_INPUT' | 'GOOGLE_API_ERROR';
    message?: string;
}

/**
 * Calls the `estimateFare` Firebase Cloud Function to get fare quotes.
 * @param pickup - The pickup coordinates.
 * @param drop - The drop-off coordinates.
 * @returns A promise that resolves to the fare estimates, or null if a structured error occurred.
 * @throws An error for fundamental connectivity issues (e.g., Firebase call fails).
 */
export async function getFareQuote(
    pickup: { lat: number; lng: number }, 
    drop: { lat: number; lng: number }
): Promise<FareEstimates | null> {
    const functions = getFunctions(app);
    const estimateFare = httpsCallable<FareQuoteInput, FareQuoteResponse>(functions, 'estimateFare');

    try {
        const result = await estimateFare({ pickup, drop });
        const data = result.data;

        if (data.ok && data.estimates) {
            return {
                distanceKm: data.distanceKm!,
                durationMin: data.durationMin!,
                estimates: data.estimates,
            };
        } else {
            // This is a structured error from our backend (e.g., no route found)
            console.error(`Fare estimation failed with code: ${data.code} - ${data.message}`);
            // We can throw a more specific error for the UI to catch and handle
            const error = new Error(data.message || 'Failed to get fare estimates.');
            (error as any).code = data.code;
            throw error;
        }

    } catch (error) {
        // This is likely a network or Firebase-level error
        console.error("Error calling estimateFare function:", error);
        // Re-throw to be handled by the UI's top-level try-catch
        throw new Error("Could not connect to the fare estimation service.");
    }
}
