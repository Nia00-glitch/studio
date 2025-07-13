
import { onCallGenkit } from '@genkit-ai/firebase/functions';
import { defineSecret } from 'firebase-functions/params';
import { HttpsOptions } from 'firebase-functions/v2/https';

// Import your flows so that they are registered with the Genkit registry.
import './simple-flow';

// Define the GEMINI_API_KEY secret. The value is provided when you deploy.
const geminiApiKey = defineSecret('GEMINI_API_KEY');

// Define options for the Cloud Function
const httpsOptions: HttpsOptions = {
  secrets: [geminiApiKey], // Make the secret available to the function
  enforceAppCheck: true, // Protect from unauthorized clients
};

// Export the Genkit flow wrapper as a callable function
export const niaSafetyAssistant = onCallGenkit(https_Options);
