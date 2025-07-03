# **App Name**: NIA Safety Assistant

## Core Features:

- Voice Wake Trigger: Opens a full-screen emergency interface on voice commands like 'NIA,' 'NIA, help me,' or 'NIA, bachao'.
- Emergency Broadcast: Sends live location via SMS and WhatsApp to pre-saved contacts when triggered. Message: '🚨 This is an emergency. I’m in danger. My location: [Google Maps link]'
- Hidden Recording: Starts hidden voice + video recording using the mic & camera when triggered with 'NIA, recording start karo'. Saves locally and uploads to Firebase Storage when online; use 'NIA, recording band karo' to stop. The recording feature acts as a tool because the LLM will decide whether there's sufficient connectivity to begin streaming and saving the videos and sounds to the cloud.
- Emergency Alert: Detects the user’s location, finds the nearest police station and hospital, and sends an alert with user info and location.
- Offline Support: Saves recordings and messages locally and auto-sends when online. Uses GPS to track location, even offline.
- UI/UX Design: Minimalist Gen-Z UI, rounded corners, clean modern layout, large accessible voice buttons, full Hindi + English support, optional dark mode.
- Settings Page: Page to add/update emergency contacts, toggle auto-send location ON/OFF, enable/disable recording feature, and test emergency simulation.

## Style Guidelines:

- Saturated, attention-getting red (#FF4136), fitting for an emergency safety app; in HSL space, the color is appropriate because it balances maximum emotional impact with the need for clear visual communication in stressful situations.
- Light grayish-red (#F9E7E6). Desaturated for comfortable contrast in either light or dark mode.
- Analogous orange (#FF851B). Warmer to provide gentle contrast from the red primary; suitable for calls to action and highlights.
- Inter sans-serif. Inter offers clarity and modern style for effective communication of safety information.
- Simple, clear icons that are universally recognizable. Icons related to safety, location, and emergency services.
- Clean and intuitive layout, prioritizing ease of use in stressful situations. Voice buttons are large and easily accessible. Gen-Z minimalist aesthetic with rounded corners.
- Subtle animations to provide feedback and guide users, without being distracting. Smooth transitions to avoid overwhelming the user.