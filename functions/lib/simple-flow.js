"use strict";
'use server';
Object.defineProperty(exports, "__esModule", { value: true });
exports.niaActionFlow = exports.NiaActionSchema = exports.emergencyFlow = exports.EmergencyDecisionSchema = exports.SimpleInputSchema = void 0;
/**
 * @fileOverview Genkit flows for the NIA Safety Assistant.
 * 1.  emergencyFlow: A simple keyword-based emergency detector.
 * 2.  niaActionFlow: A sophisticated NLU flow to understand user intents and entities for actions like ride booking.
 */
const zod_1 = require("zod");
const common_1 = require("./common");
// --- Shared Schemas ---
exports.SimpleInputSchema = zod_1.z.object({
    prompt: zod_1.z.string(),
});
// --- 1. Legacy Emergency Flow ---
exports.EmergencyDecisionSchema = zod_1.z.object({
    activateEmergency: zod_1.z.boolean().describe("A boolean indicating if emergency mode should be activated."),
    responseText: zod_1.z.string().describe("A brief, reassuring response to the user."),
});
const emergencyPrompt = common_1.ai.definePrompt({
    name: 'emergencyPrompt',
    input: { schema: exports.SimpleInputSchema },
    output: { schema: exports.EmergencyDecisionSchema },
    prompt: `You are NIA, a voice-activated AI safety assistant. Your primary function is to determine if a user's voice command constitutes a genuine emergency.
    Analyze the user's transcript for keywords indicating distress or a request for help.
    Keywords to look for (in English or Hindi): 'help', 'emergency', 'danger', 'bachao', 'madad', 'help me', 'problem'.
    Your Task:
    1. If the transcript contains clear and urgent emergency keywords, set 'activateEmergency' to true.
    2. If the user's intent is unclear or does not seem like an emergency, set 'activateEmergency' to false.
    3. Provide a brief, reassuring 'responseText' for the user. If activating, confirm it. If not, state that you are on standby.
    User Transcript: "{{prompt}}"`,
});
exports.emergencyFlow = common_1.ai.defineFlow({
    name: 'emergencyFlow',
    inputSchema: exports.SimpleInputSchema,
    outputSchema: exports.EmergencyDecisionSchema,
}, async (prompt) => {
    const { output } = await emergencyPrompt(prompt);
    return output;
});
// --- 2. Advanced NLU Action Flow ---
const IntentSchema = zod_1.z.enum(['RIDE_REQUEST', 'SOS_REQUEST', 'CANCEL_RIDE', 'CONFIRMATION_YES', 'CONFIRMATION_NO', 'UNKNOWN']);
const EntitiesSchema = zod_1.z.object({
    destination: zod_1.z.string().optional().describe("The user's desired destination, if mentioned."),
});
exports.NiaActionSchema = zod_1.z.object({
    intent: IntentSchema.describe("The user's classified intent."),
    entities: EntitiesSchema.describe("Any specific information extracted from the prompt."),
    responseText: zod_1.z.string().describe("A natural language response to speak back to the user for confirmation or clarification."),
    prompt: zod_1.z.string().optional().describe("The original user prompt, passed through for context."),
});
const niaActionPrompt = common_1.ai.definePrompt({
    name: 'niaActionPrompt',
    input: { schema: exports.SimpleInputSchema },
    output: { schema: exports.NiaActionSchema },
    prompt: `You are NIA, a voice-activated AI ride assistant. Your job is to understand user commands and convert them into structured data.

    Analyze the user's transcript and determine their intent.

    Intents:
    - RIDE_REQUEST: User wants to book a ride. Extract the destination.
    - SOS_REQUEST: User is in an emergency. Keywords: help, danger, problem, bachao, madad.
    - CANCEL_RIDE: User wants to cancel their current ride.
    - CONFIRMATION_YES: User is confirming a previous action. Keywords: yes, yeah, haan, confirm, okay, please proceed, theek hai, kar do.
    - CONFIRMATION_NO: User is rejecting a previous action. Keywords: no, nope, nahi, cancel, ruko.
    - UNKNOWN: The intent is unclear or conversational.

    Your Task:
    1.  Classify the user's 'prompt' into one of the defined intents.
    2.  If the intent is RIDE_REQUEST, extract the destination into the 'entities.destination' field.
    3.  Generate a concise 'responseText' to confirm the action or ask for clarification. For ride requests, ask for confirmation. For SOS, confirm you're getting help. For unknown, say you're on standby.
    4.  Include the original user prompt in the output.

    Examples:
    - User: "NIA book a ride to DLF Cyberhub" -> { "intent": "RIDE_REQUEST", "entities": { "destination": "DLF Cyberhub" }, "responseText": "Booking a ride to D L F Cyberhub. Is that correct?", "prompt": "NIA book a ride to DLF Cyberhub" }
    - User: "NIA mujhe Huda City Center jana hai" -> { "intent": "RIDE_REQUEST", "entities": { "destination": "Huda City Center" }, "responseText": "Booking a ride to Huda City Center. Is that correct?", "prompt": "NIA mujhe Huda City Center jana hai" }
    - User: "NIA help me" -> { "intent": "SOS_REQUEST", "entities": {}, "responseText": "Emergency detected. Activating safety protocols.", "prompt": "NIA help me" }
    - User: "yes confirm" -> { "intent": "CONFIRMATION_YES", "entities": {}, "responseText": "Confirmed.", "prompt": "yes confirm" }
    - User: "what's the weather like" -> { "intent": "UNKNOWN", "entities": {}, "responseText": "I am here for your safety and ride requests. How can I help?", "prompt": "what's the weather like" }

    User Transcript:
    "{{prompt}}"
    `,
});
exports.niaActionFlow = common_1.ai.defineFlow({
    name: 'niaActionFlow',
    inputSchema: exports.SimpleInputSchema,
    outputSchema: exports.NiaActionSchema,
}, async (input) => {
    const { output } = await niaActionPrompt(input);
    // Pass through the original prompt
    if (output) {
        output.prompt = input.prompt;
    }
    return output;
});
