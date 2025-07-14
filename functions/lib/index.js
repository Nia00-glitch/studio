"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simpleGenerate = void 0;
/**
 * @fileOverview Defines and exports a secure Genkit flow as a Firebase Cloud Function.
 *
 * This file contains the primary logic for a text generation AI flow using Gemini.
 * It is wrapped as a secure, callable function with authentication and secret management.
 */
const https_1 = require("firebase-functions/v2/https");
const genkit_1 = require("genkit");
const simple_flow_1 = require("./simple-flow");
const params_1 = require("firebase-functions/params");
const GEMINI_API_KEY = (0, params_1.defineSecret)('GEMINI_API_KEY');
exports.simpleGenerate = (0, https_1.onCall)({ secrets: [GEMINI_API_KEY] }, (0, genkit_1.onCallGenkit)(simple_flow_1.emergencyFlow));
