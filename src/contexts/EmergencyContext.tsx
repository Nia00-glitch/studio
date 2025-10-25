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
  startSOSRecording: () => Promise<void>;
  stopSOSRecording: () => Promise<void>;
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

  // Placeholder states from original file
  const [isOnline, setIsOnline] = useState(true);
  const [settings, setSettings] = useState({ autoSendLocation: true, enableRecording: true, contacts: [] });
  const [isRecording, setIsRecording] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);


  function speak(text: string) {
    try {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "en-US";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch (e) {
      console.warn("TTS not available:", e);
    }
  }

  const toggleListening = useCallback(() => {
    setIsListening(prev => !prev);
  }, []);

  async function startSOSRecording() {
    if (!auth?.currentUser) {
      console.warn("User not signed in; cannot create incident");
      return;
    }
    if (!db || !storage) {
      console.warn("DB or storage not initialized");
      return;
    }
    setIsEmergencyActive(true);
    const userId = auth.currentUser.uid;
    const incRef = doc(db, "incidents", `${userId}-${Date.now()}`);
    incidentIdRef.current = incRef.id;
    await setDoc(incRef, {
      userId,
      status: "recording",
      startTime: serverTimestamp(),
      firstLocation: null, 
      storagePrefix: `incidents/${incRef.id}/`,
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setMediaStream(stream);
      setHasCameraPermission(true);
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus") ? "video/webm;codecs=vp8,opus" :
                   MediaRecorder.isTypeSupported("video/mp4") ? "video/mp4" : "video/webm";
      const mediaRecorder = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = async (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
          const blob = new Blob(chunksRef.current, { type: mime });
          const storagePath = `${incRef.id}/chunk-${Date.now()}.webm`;
          const sRef = storageRef(storage, `incidents/${storagePath}`);
          const uploadTask = uploadBytesResumable(sRef, blob);
          uploadTask.on("state_changed", null, (err) => {
            console.error("Upload failed", err);
          }, async () => {
            const url = await getDownloadURL(sRef);
            await updateDoc(incRef, { lastChunkUrl: url, updatedAt: serverTimestamp() });
            chunksRef.current = [];
          });
        }
      };
      mediaRecorder.start(10_000); // chunk every 10s
      setIsRecording(true);
      speak("Emergency recording started. Help is being notified.");
    } catch (err) {
      console.error("Failed to start recording:", err);
      setHasCameraPermission(false);
      speak("Unable to access camera or microphone. Emergency will be reported without a recording.");
    }
  }

  async function stopSOSRecording() {
    setIsEmergencyActive(false);
    setIsRecording(false);
    const incId = incidentIdRef.current;
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      if (db && incId) {
        const incRef = doc(db, "incidents", incId);
        await updateDoc(incRef, { status: "completed", endTime: serverTimestamp() });
      }
      speak("Emergency recording stopped.");
    } catch (err) {
      console.error(err);
    } finally {
      mediaRecorderRef.current = null;
      chunksRef.current = [];
      incidentIdRef.current = null;
      setMediaStream(null);
    }
  }

  async function processVoiceIntent(payload: any) {
    const { intent } = payload || {};
    if (intent === "SOS_REQUEST") {
      await startSOSRecording();
    } else {
      setVoiceCommandState({ status: 'awaiting_confirmation', lastAction: payload, message: payload.responseText });
      if (payload?.responseText) speak(payload.responseText);
    }
  }

  const triggerEmergency = () => startSOSRecording();
  const deactivateEmergency = () => stopSOSRecording();

  const value: EmergencyContextType = {
    isEmergencyActive, isOnline, settings, isRecording, hasCameraPermission, mediaStream, isListening, setIsListening,
    voiceCommandState, setVoiceCommandState, voiceDialogState, setVoiceDialogState,
    updateSettings: (s: any) => setSettings(prev => ({...prev, ...s})),
    shareLocation: () => {}, // Placeholder
    toggleListening,
    speak,
    processVoiceIntent,
    triggerEmergency,
    deactivateEmergency,
    startSOSRecording,
    stopSOSRecording,
    startRecording: startSOSRecording,
    stopRecording: stopSOSRecording,
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
