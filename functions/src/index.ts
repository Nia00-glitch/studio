import { onRequest } from 'firebase-functions/v2/https';
import { ai } from './common';
import { emergencyFlow } from './simple-flow';

// Note: This switches from an onCall to an onRequest trigger.
// The frontend must use a standard fetch/axios call to this HTTP endpoint, not httpsCallable.
export const simpleGenerate = onRequest({ cors: true }, ai.flow(emergencyFlow));
