
"use client";

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import type { FareEstimates } from './types';

interface FareQuoteInput {
    pickup: { lat: number; lng: number };
    drop: { lat: number; lng: number };
}

interface FareQuoteResponse {
    ok: boolean;
    distanceKm?: number;
    durationMin?: number;
    estimates?: {
        cab: number;
        auto: number;
        bike: number;
    };
    code?: 'DIRECTIONS_FAILED' | 'BAD_INPUT';
    message?: string;
}

/**
 * Calls the `estimateFare` Firebase Cloud Function to get fare quotes.
 * @param pickup - The pickup coordinates.
 * @param drop - The drop-off coordinates.
 * @returns A promise that resolves to the fare estimates.
 * @throws An error if the call fails or returns an error response.
 */
export async function getFareQuote(pickup: { lat: number; lng: number }, drop: { lat: number; lng: number }): Promise<FareEstimates> {
    const functions = getFunctions(app);
    const estimateFare = httpsCallable<FareQuoteInput, FareQuoteResponse>(functions, 'estimateFare');

    try {
        const result = await estimateFare({ pickup, drop });
        const data = result.data;

        if (!data.ok || !data.estimates) {
            throw new Error(data.message || 'Failed to get fare estimates.');
        }

        return {
            distanceKm: data.distanceKm!,
            durationMin: data.durationMin!,
            estimates: data.estimates,
        };

    } catch (error) {
        console.error("Error calling estimateFare function:", error);
        throw new Error("Could not connect to the fare estimation service.");
    }
}
