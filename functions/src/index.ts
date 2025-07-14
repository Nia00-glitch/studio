
import { onCallGenkit } from '@genkit-ai/firebase';
import { emergencyFlow } from './simple-flow';

export const simpleGenerate = onCallGenkit({}, emergencyFlow);
