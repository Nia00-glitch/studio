import { onRequest } from 'firebase-functions/v2/https';
import { emergencyFlow } from './simple-flow';

export const simpleGenerate = onRequest({ cors: true }, emergencyFlow);
