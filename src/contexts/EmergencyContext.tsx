"use client";

import React, { createContext, useContext, useState, useRef, useCallback, ReactNode } from "react";
import { useFirebase } from "@/lib/firebase/provider";
import { doc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import type { NiaAction, VoiceDialogState } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';

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

export function EmergencyProvider({ children }: { children: ReactNode }) {
  const { db, storage, auth } = useFirebase();
  const { toast } = useToast();

  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const incidentIdRef = useRef<string | null>(null);

  const [isListening, setIsListening] = useState(false);
  const [voiceCommandState, setVoiceCommandState] = useState<VoiceCommandState>({ status: 'idle' });
  const [voiceDialogState, setVoiceDialogState] = useState<VoiceDialogState>({ status: 'IDLE' });

  const [isOnline, setIsOnline] = useState(true);
  const [settings, setSettings] = useState({ autoSendLocation: true, enableRecording: true, contacts: [] });
  const [isRecording, setIsRecording] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const speak = useCallback((text: string) => {
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = "en-IN"; // Use Indian English voice
        window.speechSynthesis.cancel(); // Clear queue
        window.speechSynthesis.speak(utter);
      }
    } catch (e) {
      console.warn("Speech Synthesis not available:", e);
    }
  }, []);

  const toggleListening = useCallback(() => {
    setIsListening(prev => !prev);
  }, []);

  const startRecording = useCallback(async () => {
    if (!auth?.currentUser || !db || !storage) {
      speak("Cannot start recording. System is not ready.");
      toast({ variant: 'destructive', title: "Recording Error", description: "Firebase is not initialized." });
      return;
    }
    
    setIsEmergencyActive(true); // Always activate emergency screen on recording start
    setIsRecording(true);

    const userId = auth.currentUser.uid;
    const newIncidentId = `${userId}-${Date.now()}`;
    incidentIdRef.current = newIncidentId;
    const incidentDocRef = doc(db, "incidents", newIncidentId);
    
    await setDoc(incidentDocRef, {
      userId,
      status: "recording",
      startTime: serverTimestamp(),
      storagePrefix: `incidents/${newIncidentId}/`,
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
          const chunkId = uuidv4();
          const storagePath = `incidents/${incidentIdRef.current}/${chunkId}.webm`;
          const sRef = storageRef(storage, storagePath);
          const uploadTask = uploadBytesResumable(sRef, blob);

          uploadTask.on("state_changed", null, 
            (err) => {
              console.error("Upload chunk failed:", err);
              toast({ variant: "destructive", title: "Upload Failed", description: "Could not save recording chunk."})
            },
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
      toast({ variant: "destructive", title: "Media Error", description: "Could not access camera/microphone." });
    }
  }, [auth, db, storage, speak, toast]);

  const stopRecording = useCallback(() => {
    setIsEmergencyActive(false);
    setIsRecording(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaStream?.getTracks().forEach(track => track.stop());

    if (db && incidentIdRef.current) {
      updateDoc(doc(db, "incidents", incidentIdRef.current), { status: "completed", endTime: serverTimestamp() });
    }
    
    speak("Emergency mode deactivated.");
    
    // Reset refs
    mediaRecorderRef.current = null;
    incidentIdRef.current = null;
    setMediaStream(null);
  }, [db, speak, mediaStream]);

  const processVoiceIntent = useCallback(async (payload: any) => {
    const { intent, responseText } = payload || {};
    setVoiceCommandState({ status: 'awaiting_confirmation', lastAction: payload, message: responseText });
    
    if (intent === "SOS_REQUEST") {
      await startRecording();
    }
    
    if (responseText) {
      speak(responseText);
    }
  }, [startRecording, speak]);

  const shareLocation = useCallback(() => {
    // Placeholder for location sharing logic
    toast({ title: "Sharing Location", description: "Location sent to emergency contacts." });
  }, [toast]);

  const value: EmergencyContextType = {
    isEmergencyActive, isOnline, settings, isRecording, hasCameraPermission, mediaStream, isListening, setIsListening,
    voiceCommandState, setVoiceCommandState, voiceDialogState, setVoiceDialogState,
    updateSettings: (s: any) => setSettings(prev => ({...prev, ...s})),
    shareLocation,
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
