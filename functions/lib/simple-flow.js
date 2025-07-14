"use strict";
'use server';
Object.defineProperty(exports, "__esModule", { value: true });
exports.emergencyFlow = exports.EmergencyDecisionSchema = exports.SimpleInputSchema = void 0;
/**
 * @fileOverview A Genkit flow to determine if a user's voice command is an emergency.
 */
const zod_1 = require("zod");
const common_1 = require("./common"); // Import the shared, modern 'ai' object.
// Input schema for the emergency flow. This must match the frontend payload.
exports.SimpleInputSchema = zod_1.z.object({
    prompt: zod_1.z.string(),
});
// Output schema defining the AI's decision.
exports.EmergencyDecisionSchema = zod_1.z.object({
    activateEmergency: zod_1.z.boolean().describe("A boolean indicating if emergency mode should be activated."),
    responseText: zod_1.z.string().describe("A brief, reassuring response to the user."),
});
// The prompt that instructs the AI model. This is the core logic.
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

    Example 1:
    User input: "NIA help me I'm in trouble"
    Your output: { "activateEmergency": true, "responseText": "Emergency mode activated. I am sending for help." }

    Example 2:
    User input: "what is the time NIA"
    Your output: { "activateEmergency": false, "responseText": "I am here if you need me. Just say the word." }
    
    User Transcript:
    "{{prompt}}"`,
});
// The main flow that executes the prompt.
exports.emergencyFlow = common_1.ai.defineFlow({
    name: 'emergencyFlow',
    inputSchema: exports.SimpleInputSchema,
    outputSchema: exports.EmergencyDecisionSchema,
}, async (prompt) => {
    // The input 'prompt' here is an object { prompt: "the user's words" }
    const { output } = await emergencyPrompt(prompt);
    return output;
});
