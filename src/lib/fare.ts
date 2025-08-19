
"use client";

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';

interface FareQuoteInput {
    pickup: { lat: number; lng: number };
    drop: { lat: number; lng: number };
}

interface FareQuoteResponse {
    success: boolean;
    fare?: number;
    distanceKm?: number;
    durationMin?: number;
    code?: 'DIRECTIONS_FAILED' | 'BAD_INPUT';
    message?: string;
}

/**
 * Calls the `estimateFare` Firebase Cloud Function to get a fare quote.
 * @param pickup - The pickup coordinates.
 * @param drop - The drop-off coordinates.
 * @returns A promise that resolves to the fare details.
 * @throws An error if the call fails or returns an error response.
 */
export async function getFareQuote(pickup: { lat: number; lng: number }, drop: { lat: number; lng: number }): Promise<FareQuoteResponse> {
    const functions = getFunctions(app);
    const estimateFareCallable = httpsCallable<FareQuoteInput, FareQuoteResponse>(functions, 'estimateFare');

    try {
        const result = await estimateFareCallable({ pickup, drop });
        const data = result.data;

        if (!data.success) {
            throw new Error(data.message || 'Failed to get fare estimates.');
        }

        return data;

    } catch (error) {
        console.error("Error calling estimateFare function:", error);
        throw new Error("Could not connect to the fare estimation service.");
    }
}
