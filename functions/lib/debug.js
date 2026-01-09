"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugGemini = void 0;
const functions = __importStar(require("firebase-functions"));
const common_1 = require("./common");
exports.debugGemini = functions.https.onRequest(async (req, res) => {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    const status = {
        keyExists: !!apiKey,
        keyPrefix: apiKey ? apiKey.substring(0, 4) + "..." : "NONE",
        connectionTest: "PENDING",
        error: null
    };
    functions.logger.info("DEBUG: Checking API Key Status:", status);
    if (!apiKey) {
        res.status(500).json({
            message: "CRITICAL: GOOGLE_GENAI_API_KEY is missing from environment variables.",
            details: status
        });
        return;
    }
    try {
        // Try a very simple generation using the configured ai object
        const { text } = await common_1.ai.generate({
            model: 'gemini-1.5-flash-latest',
            prompt: "Say 'Hello Driver'",
            config: { temperature: 0.1 }
        });
        status.connectionTest = "SUCCESS";
        res.status(200).json({
            message: "System Healthy: AI is responding.",
            aiResponse: text,
            details: status
        });
    }
    catch (err) {
        functions.logger.error("DEBUG: AI Generation Failed:", err);
        status.connectionTest = "FAILED";
        status.error = err.message || err.toString();
        res.status(500).json({
            message: "API Key exists but Connection Failed.",
            details: status
        });
    }
});
