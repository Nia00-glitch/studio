# Engineering Highlights — NIA Safety Rides

## 1. Concurrency-Safe Atomic Ride Acceptance

In ride-hailing platforms, dispatching rides to nearby drivers can result in race conditions where multiple drivers attempt to accept the same booking simultaneously.

NIA Safety Rides enforces atomic concurrency using Cloud Firestore database transactions:

```typescript
export const acceptRide = onCall(async (request: CallableRequest) => {
  if (!request.auth || request.auth.token.role !== 'driver') {
    throw new HttpsError("permission-denied", "Only verified drivers can accept rides.");
  }

  const driverId = request.auth.uid;
  const { rideId } = request.data;
  const rideRef = db.collection("rides").doc(rideId);

  await db.runTransaction(async (transaction) => {
    const rideDoc = await transaction.get(rideRef);
    if (!rideDoc.exists) throw new HttpsError("not-found", "Ride not found.");

    const rideData = rideDoc.data();
    if (rideData?.status !== "pending") {
      throw new HttpsError("failed-precondition", "This ride has already been accepted.");
    }

    transaction.update(rideRef, {
      status: "accepted",
      driverId: driverId,
      driverName: request.auth?.token.name || "Driver",
      acceptedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  return { success: true, message: "Ride accepted successfully." };
});
```

---

## 2. Resumable Chunked Emergency Evidence Upload

In high-stress emergency situations, mobile devices may lose connectivity or experience sudden app termination. Uploading a single monolithic video file at the end of an emergency is unsafe because any interruption results in total evidence loss.

The emergency recording engine chunks video and audio into discrete 10-second segments that stream directly to Firebase Storage:

```typescript
const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8,opus" });

mediaRecorder.ondataavailable = async (ev) => {
  if (ev.data && ev.data.size > 0 && incidentIdRef.current) {
    const blob = ev.data;
    const chunkId = uuidv4();
    const storagePath = `incidents/${incidentIdRef.current}/${chunkId}.webm`;
    const sRef = storageRef(storage, storagePath);
    
    // Resumable upload task
    const uploadTask = uploadBytesResumable(sRef, blob);
    uploadTask.on("state_changed", null, null, async () => {
      const url = await getDownloadURL(sRef);
      await updateDoc(doc(db, "incidents", incidentIdRef.current), {
        lastChunkUrl: url,
        updatedAt: serverTimestamp()
      });
    });
  }
};
mediaRecorder.start(10000); // 10-second chunks
```

---

## 3. Multi-Intent Structured Natural Language Understanding with Genkit

Using Google Genkit with strict Zod output schemas ensures the AI brain outputs type-safe JSON for downstream business logic:

```typescript
const IntentSchema = z.enum([
  'RIDE_REQUEST', 'SOS_REQUEST', 'CANCEL_RIDE', 
  'CONFIRMATION_YES', 'CONFIRMATION_NO', 'UNKNOWN'
]);

export const NiaActionSchema = z.object({
  intent: IntentSchema,
  entities: z.object({ destination: z.string().optional() }),
  responseText: z.string(),
  prompt: z.string().optional(),
});
```
