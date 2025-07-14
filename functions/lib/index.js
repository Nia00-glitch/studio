"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simpleGenerate = void 0;
/**
 * @fileOverview Defines and exports a secure Genkit flow as a Firebase Cloud Function.
 *
 * This file contains the primary logic for a text generation AI flow using Gemini.
 * It is wrapped as a secure, callable function with authentication and secret management.
 */
const functions_1 = require("@genkit-ai/firebase/functions");
const params_1 = require("firebase-functions/params");
const simple_flow_1 = require("./simple-flow");
// Define the GEMINI_API_KEY secret. The value is provided when you deploy.
const geminiApiKey = (0, params_1.defineSecret)('GEMINI_API_KEY');
// Define options for the Cloud Function. This is the production-ready way.
const httpsOptions = {
    secrets: [geminiApiKey], // Make the secret available to the function
    enforceAppCheck: false, // In a real app, set this to true for security.
};
// Export the Genkit flow wrapper as a callable function using the modern signature.
exports.simpleGenerate = (0, functions_1.onCallGenkit)(httpsOptions, simple_flow_1.emergencyFlow);
