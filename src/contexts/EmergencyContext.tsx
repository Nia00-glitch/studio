"use client";

import React, { createContext, useContext, useState, useRef, useCallback } from "react";
import { useFirebase } from "@/lib/firebase/provider";
import { doc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import type { NiaAction, VoiceDialogState } from "@/lib/types";

export type VoiceCommandState = {
    status: 'idle' | 'listening' | 'processing' | 'awaiting_confirmation';
    lastAction?: NiaAction | null;
    message?: string | null;
}

type EmergencyContextType = {
  isEmergencyActive: boolean;
  isOnline: boolean;
  settings: any; // Simplified for now
  updateSettings: (newSettings: any) => void;
  isRecording: boolean;
  hasCameraPermission: boolean;
  mediaStream: MediaStream | null;
  shareLocation: () => void;
  isListening: boolean;
  setIsListening: React.Dispatch<React.SetStateAction<boolean>>;
  toggleListening: () => void;
  voiceCommandState: VoiceCommandState;
  setVoiceCommandState: React.Dispatch<React.SetStateAction<VoiceCommandState>>;
  voiceDialogState: VoiceDialogState;
  setVoiceDialogState: React.Dispatch<React.SetStateAction<VoiceDialogState>>;
  speak: (text: string) => void;
  processVoiceIntent: (payload: any) => Promise<void>;
  triggerEmergency: (options?: { silent: boolean }) => void;
  deactivateEmergency: () => void;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
};

const EmergencyContext = createContext<EmergencyContextType | undefined>(undefined);

export function EmergencyProvider({ children }: { children: React.ReactNode }) {
  const { db, storage, auth } = useFirebase();
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const incidentIdRef = useRef<string | null>(null);

  const [isListening, setIsListening] = useState(false);
  const [voiceCommandState, setVoiceCommandState] = useState<VoiceCommandState>({ status: 'idle' });
  const [voiceDialogState, setVoiceDialogState] = useState<VoiceDialogState>({ status: 'IDLE' });

  // Placeholder states
  const [isOnline, setIsOnline] = useState(true); // Assume online by default
  const [settings, setSettings] = useState({ autoSendLocation: true, enableRecording: true, contacts: [] });
  const [isRecording, setIsRecording] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const speak = useCallback((text: string) => {
    try {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "en-IN";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch (e) {
      console.warn("TTS not available:", e);
    }
  }, []);

  const toggleListening = useCallback(() => {
    setIsListening(prev => !prev);
  }, []);

  const startRecording = useCallback(async () => {
    if (!auth?.currentUser || !db || !storage) {
      console.warn("Firebase not ready; cannot start recording.");
      speak("Cannot start recording. System is not ready.");
      return;
    }
    
    setIsEmergencyActive(true); // Activate emergency screen
    setIsRecording(true);
    const userId = auth.currentUser.uid;
    const incRef = doc(db, "incidents", `${userId}-${Date.now()}`);
    incidentIdRef.current = incRef.id;
    
    await setDoc(incRef, {
      userId,
      status: "recording",
      startTime: serverTimestamp(),
      storagePrefix: `incidents/${incRef.id}/`,
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setMediaStream(stream);
      setHasCameraPermission(true);

      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus") ? "video/webm;codecs=vp8,opus" : "video/webm";
      const mediaRecorder = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (ev) => {
        if (ev.data && ev.data.size > 0 && incidentIdRef.current) {
          const blob = ev.data;
          const storagePath = `incidents/${incidentIdRef.current}/chunk-${Date.now()}.webm`;
          const sRef = storageRef(storage, storagePath);
          const uploadTask = uploadBytesResumable(sRef, blob);

          uploadTask.on("state_changed", null, 
            (err) => console.error("Upload chunk failed", err),
            async () => {
              const url = await getDownloadURL(sRef);
              if (db && incidentIdRef.current) {
                await updateDoc(doc(db, "incidents", incidentIdRef.current), { lastChunkUrl: url, updatedAt: serverTimestamp() });
              }
            }
          );
        }
      };
      mediaRecorder.start(10000); // Create a chunk every 10 seconds
      speak("Emergency recording started.");

    } catch (err) {
      console.error("Failed to start recording:", err);
      setHasCameraPermission(false);
      speak("Unable to access camera or microphone.");
      setIsEmergencyActive(false); // Deactivate if we can't record
      setIsRecording(false);
    }
  }, [auth, db, storage, speak]);

  const stopRecording = useCallback(() => {
    setIsEmergencyActive(false);
    setIsRecording(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    if (db && incidentIdRef.current) {
      updateDoc(doc(db, "incidents", incidentIdRef.current), { status: "completed", endTime: serverTimestamp() });
    }
    
    speak("Emergency mode deactivated.");
    
    // Reset refs
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    incidentIdRef.current = null;
    setMediaStream(null);
  }, [db, speak]);

  const processVoiceIntent = useCallback(async (payload: any) => {
    const { intent } = payload || {};
    setVoiceCommandState({ status: 'awaiting_confirmation', lastAction: payload, message: payload.responseText });
    
    if (intent === "SOS_REQUEST") {
      await startRecording();
    } else if (payload?.responseText) {
      speak(payload.responseText);
    }
  }, [startRecording, speak]);

  const value: EmergencyContextType = {
    isEmergencyActive, isOnline, settings, isRecording, hasCameraPermission, mediaStream, isListening, setIsListening,
    voiceCommandState, setVoiceCommandState, voiceDialogState, setVoiceDialogState,
    updateSettings: (s: any) => setSettings(prev => ({...prev, ...s})),
    shareLocation: () => {}, // Placeholder for location sharing logic
    toggleListening,
    speak,
    processVoiceIntent,
    triggerEmergency: startRecording,
    deactivateEmergency: stopRecording,
    startRecording,
    stopRecording,
  };

  return (
    <EmergencyContext.Provider value={value}>
      {children}
    </EmergencyContext.Provider>
  );
}

export function useEmergencyContext() {
  const ctx = useContext(EmergencyContext);
  if (!ctx) throw new Error("useEmergencyContext must be used inside EmergencyProvider");
  return ctx;
}
