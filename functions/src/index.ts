import { onRequest } from 'firebase-functions/v2/https';
import { emergencyFlow } from './simple-flow';

// This exports a standard HTTPS function that internally runs the Genkit flow.
export const simpleGenerate = onRequest({ cors: true }, async (req, res) => {
  // Ensure the request is a POST, as expected from the client SDK.
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    // The client SDK sends data in `req.body.data`.
    const input = req.body.data;

    // Validate the input to be safe.
    if (!input || typeof input.prompt !== 'string') {
      res.status(400).send('Bad Request: Missing or invalid prompt data.');
      return;
    }

    // Execute the flow with the validated input.
    const flowResponse = await emergencyFlow(input);

    // The callable function format expects the result to be nested in a 'data' object.
    res.status(200).json({ data: flowResponse });
  } catch (err) {
    console.error('Error executing flow:', err);
    // Properly format the error for the client to handle.
    const error = err as Error;
    res.status(500).json({
      error: {
        code: 'internal',
        message: error.message || 'An internal error occurred.',
      },
    });
  }
});
