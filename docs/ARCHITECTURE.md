# Architecture Documentation — NIA Safety Rides

## 1. System Overview

**NIA Safety Rides** is built on a serverless, event-driven cloud architecture combining Next.js 15 App Router, Firebase v2 Cloud Functions, Google Genkit NLU pipelines, and Cloud Firestore.

```mermaid
sequenceDiagram
    autonumber
    actor Rider
    participant Browser as Client PWA (Next.js)
    participant STT as Web Speech API
    participant Functions as Cloud Functions v2
    participant Genkit as Genkit / Gemini 1.5
    participant Maps as Google Maps Directions API
    participant Firestore as Cloud Firestore
    actor Driver

    Rider->>Browser: Speaks "NIA book a ride to Cyberhub"
    Browser->>STT: Captures & Transcribes Speech
    STT->>Functions: Calls niaActionFlow({ prompt })
    Functions->>Genkit: Evaluates NiaActionPrompt
    Genkit->>Functions: Returns { intent: "RIDE_REQUEST", destination: "Cyberhub" }
    Functions->>Maps: Request Route Calculation (Origin, Destination)
    Maps->>Functions: Returns Distance (km) & Duration (min)
    Functions->>Browser: Returns Cab/Auto/Bike Pricing
    Browser->>Rider: Synthesizes Speech: "Cab is 150 rs, Auto is 90..."
    Rider->>Browser: Speaks "Cab confirm"
    Browser->>Firestore: Creates Document in `rides/{rideId}` ('pending')
    Firestore->>Functions: Triggers onRideRequest Event
    Functions->>Firestore: Queries Nearest Driver via Haversine Distance
    Functions->>Driver: Sends Real-time Incoming Ride Notification
    Driver->>Functions: Calls acceptRide({ rideId }) inside Transaction
    Functions->>Firestore: Atomic Status Update ('accepted')
    Firestore->>Browser: Real-time Snapshot Updates Map with Driver Marker
```

---

## 2. Conversational Voice Dialog State Machine

The client manages a multi-stage voice state machine in `HomeClient.tsx`:

```mermaid
stateDiagram-v2
    [*] --> IDLE
    IDLE --> LISTENING: Mic Button / Wake Word
    LISTENING --> PARSING: Speech Captured
    PARSING --> AWAITING_MODE_CONFIRMATION: Intent = RIDE_REQUEST
    PARSING --> IDLE: Intent = UNKNOWN / Error
    AWAITING_MODE_CONFIRMATION --> AWAITING_FINAL_CONFIRMATION: Mode Selected ('cab'/'auto'/'bike')
    AWAITING_FINAL_CONFIRMATION --> EXECUTING: Intent = CONFIRMATION_YES
    AWAITING_FINAL_CONFIRMATION --> IDLE: Intent = CONFIRMATION_NO / CANCEL_RIDE
    EXECUTING --> IDLE: Ride Document Created
```

---

## 3. Reactive Dispatch & Concurrency Control

### Event-Driven Matching (`onRideRequest`)
1. A new ride document is written to `rides/{rideId}` with `status: 'pending'`.
2. The `onDocumentCreated("rides/{rideId}")` trigger activates `notifyDriverOnRideRequest()`.
3. The function calculates the Haversine spherical distance between `pickupLocation` and all drivers with `isOnline == true` in `driver_locations`.
4. The closest driver is marked in `notifiedDriverId` and receives a push notification.

### Retry & Fallback Loop (`onRideUpdate`)
1. If the notified driver declines, their UID is added to the `declinedBy` array in Firestore.
2. The `onDocumentUpdated("rides/{rideId}")` trigger detects the decline and re-executes `notifyDriverOnRideRequest()`, excluding all drivers in `declinedBy` to dispatch the next nearest driver.

### Atomic Concurrency Protection (`acceptRide`)
When a driver accepts a ride, the Callable Cloud Function executes a Firestore transaction (`db.runTransaction`). It verifies that `status == 'pending'` before writing `status: 'accepted'`, preventing two drivers from simultaneously accepting the same request.

---

## 4. Continuous Emergency Media Streaming Pipeline

```mermaid
flowchart LR
    A[Microphone & Camera Stream] --> B[MediaRecorder API]
    B -->|Every 10 Seconds| C[Blob Event ondataavailable]
    C -->|UploadBytesResumable| D[Firebase Storage: incidents/id/chunk.webm]
    D -->|GetDownloadURL| E[Firestore Incident Doc Update: lastChunkUrl]
```
