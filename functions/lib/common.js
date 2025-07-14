"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ai = void 0;
/**
 * @fileOverview Shared Genkit AI configuration.
 */
const genkit_1 = require("genkit");
const googleai_1 = require("@genkit-ai/googleai");
// This is the modern way to initialize Genkit, creating a reusable 'ai' object.
exports.ai = (0, genkit_1.genkit)({
    plugins: [
        (0, googleai_1.googleAI)({
            apiKey: process.env.GEMINI_API_KEY, // Use the secret managed by Firebase.
        }),
    ],
    logLevel: 'debug',
    enableTracingAndMetrics: true,
});
