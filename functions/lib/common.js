"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ai = void 0;
/**
 * @fileOverview Shared Genkit AI configuration.
 */
const genkit_1 = require("genkit");
const firebase_1 = require("@genkit-ai/firebase");
const googleai_1 = require("@genkit-ai/googleai");
exports.ai = (0, genkit_1.genkit)({
    plugins: [(0, googleai_1.googleAI)(), (0, firebase_1.firebasePlugin)()],
});
