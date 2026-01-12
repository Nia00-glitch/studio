import * as functions from "firebase-functions";
import { ai } from './common';

export const debugGemini = functions.https.onRequest(async (req, res) => {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;

  const status = {
    keyExists: !!apiKey,
    keyPrefix: apiKey ? apiKey.substring(0, 4) + "..." : "NONE",
    connectionTest: "PENDING",
    error: null as any
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
    const { text } = await ai.generate({
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
  } catch (err: any) {
    functions.logger.error("DEBUG: AI Generation Failed:", err);
    status.connectionTest = "FAILED";
    status.error = err.message || err.toString();
    
    res.status(500).json({ 
        message: "API Key exists but Connection Failed.", 
        details: status 
    });
  }
});
