
import { onCallGenkit } from '@genkit-ai/firebase';
import { emergencyFlow, niaActionFlow } from './simple-flow';

export const simpleGenerate = onCallGenkit({}, emergencyFlow);
export const niaAction = onCallGenkit({}, niaActionFlow);
