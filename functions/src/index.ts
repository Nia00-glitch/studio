
import { onCallGenkit } from '@genkit-ai/firebase';
import { emergencyFlow, niaActionFlow } from './simple-flow';
import { estimateFare } from './estimateFare';

// Genkit-powered Cloud Functions
export const simpleGenerate = onCallGenkit({}, emergencyFlow);
export const niaAction = onCallGenkit({}, niaActionFlow);

// Standard HTTPS Callable Cloud Function
export { estimateFare };
