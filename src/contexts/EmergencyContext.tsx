
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { Settings, NiaAction, VoiceDialogState } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { uploadRecordingToFirebase } from '@/lib/storage';
import { httpsCallable } from 'firebase/functions';
import { useFirebase } from '@/lib/firebase/provider'; // Use the new central provider

interface EmergencyContextType {
  isEmergencyActive: boolean;
  triggerEmergency: (options?: { silent: boolean }) => void;
  deactivateEmergency: () => void;
  isOnline: boolean;
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  hasCameraPermission: boolean;
  mediaStream: MediaStream | null;
  shareLocation: () => void;
  isListening: boolean;
  setIsListening: (isListening: boolean) => void;
  processVoiceCommand: (transcript: string) => Promise<void>;
  voiceCommandState: VoiceCommandState;
  setVoiceCommandState: React.Dispatch<React.SetStateAction<VoiceCommandState>>;
  voiceDialogState: VoiceDialogState;
  setVoiceDialogState: React.Dispatch<React.SetStateAction<VoiceDialogState>>;
  speak: (text: string) => void;
}

export type VoiceCommandState = {
    status: 'idle' | 'listening' | 'processing' | 'awaiting_confirmation';
    lastAction?: NiaAction | null;
    message?: string | null;
}

const initialVoiceState: VoiceCommandState = { status: 'idle' };
const initialDialogState: VoiceDialogState = { status: 'IDLE' };

const defaultSettings: Settings = {
  autoSendLocation: true,
  enableRecording: true,
  contacts: [],
};

export const EmergencyContext = createContext<EmergencyContextType>({
  isEmergencyActive: false,
  triggerEmergency: () => {},
  deactivateEmergency: () => {},
  isOnline: true,
  settings: defaultSettings,
  updateSettings: () => {},
  isRecording: false,
  startRecording: async () => {},
  stopRecording: () => {},
  hasCameraPermission: false,
  mediaStream: null,
  shareLocation: () => {},
  isListening: false,
  setIsListening: () => {},
  processVoiceCommand: async () => {},
  voiceCommandState: initialVoiceState,
  setVoiceCommandState: () => {},
  voiceDialogState: initialDialogState,
  setVoiceDialogState: () => {},
  speak: () => {},
});

export const useEmergencyContext = () => {
    const context = useContext(EmergencyContext);
    if (!context) {
        throw new Error('useEmergencyContext must be used within an EmergencyProvider');
    }
    return context;
};

const getSupportedMimeType = () => {
    const mimeTypes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/mp4;codecs=avc1', 'video/webm'];
    for (const mimeType of mimeTypes) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mimeType)) return mimeType;
    }
    return 'video/webm';
};

export const EmergencyProvider = ({ children }: { children: React.ReactNode }) => {
  const { functions } = useFirebase(); // Get initialized functions from context
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [settings, setSettings] = useLocalStorage<Settings>('nia-settings', defaultSettings);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceCommandState, setVoiceCommandState] = useState<VoiceCommandState>(initialVoiceState);
  const [voiceDialogState, setVoiceDialogState] = useState<VoiceDialogState>(initialDialogState);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const triggerEmergency = useCallback((options?: { silent: boolean }) => {
    if (!options?.silent) toast({ title: "Emergency Mode Activated" });
    setIsEmergencyActive(true);
  }, [toast]);

  const speak = useCallback((text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Interrupt any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-IN'; // Prioritize Indian English voice
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn("Browser does not support speech synthesis.");
    }
  }, []);

  const processVoiceCommand = useCallback(async (transcript: string) => {
    if (!functions) return;
    setVoiceCommandState({ status: 'processing', message: 'Thinking...' });
    try {
        const niaAction = httpsCallable<any, NiaAction>(functions, 'niaAction');
        const result = await niaAction({ prompt: transcript });
        const action = result.data;
        
        console.log("NLU Action:", action);
        
        if (action.intent === 'SOS_REQUEST') {
            triggerEmergency({});
            speak(action.responseText);
            setVoiceCommandState({ status: 'idle' });
            return;
        }

        setVoiceCommandState({ status: 'awaiting_confirmation', lastAction: action, message: action.responseText });

    } catch (error) {
        console.error("Error calling NLU function:", error);
        speak("Sorry, I'm having trouble connecting. Please try again.");
        setVoiceCommandState({ status: 'idle', message: 'Connection error.' });
        toast({
          variant: "destructive",
          title: "AI Error",
          description: "Could not connect to the AI assistant."
        });
    }
  }, [speak, toast, triggerEmergency, functions]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveBlobLocally = (blob: Blob) => {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      document.body.appendChild(a); a.style.display = 'none'; a.href = url;
      const fileExtension = blob.type.split('/')[1].split(';')[0];
      a.download = `NIA-emergency-recording-${new Date().toISOString()}.${fileExtension}`;
      a.click();
      window.URL.revokeObjectURL(url); a.remove();
    } catch (e) {
      console.error("Failed to save blob locally", e);
      toast({ variant: 'destructive', title: 'Local Save Failed', description: 'Could not save the file automatically.' });
    }
  }

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (isRecording || !settings.enableRecording) {
      if (!settings.enableRecording) toast({ title: "Recording is disabled in settings." });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setHasCameraPermission(true); setMediaStream(stream);
      mediaChunksRef.current = [];
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size > 0) mediaChunksRef.current.push(event.data); };
      recorder.onstart = () => { setIsRecording(true); if (!isEmergencyActive) toast({ title: "Recording Started" }); };
      recorder.onstop = async () => {
        const blob = new Blob(mediaChunksRef.current, { type: mimeType });
        if (isOnline) {
          toast({ title: "Uploading recording..." });
          const report = await uploadRecordingToFirebase(blob);
          if (report.status === '✅ Upload Successful') toast({ title: "Upload Complete" });
          else { toast({ variant: "destructive", title: "Upload Failed" }); saveBlobLocally(blob); }
        } else { toast({ title: "Offline Mode" }); saveBlobLocally(blob); }
        mediaChunksRef.current = [];
        stream.getTracks().forEach(track => track.stop());
        setMediaStream(null); setIsRecording(false);
      };
      recorder.start();
    } catch (error) {
      setHasCameraPermission(false);
      toast({ variant: 'destructive', title: 'Camera/Mic Access Denied' });
    }
  }, [isRecording, settings.enableRecording, toast, isOnline, isEmergencyActive]);

  const deactivateEmergency = useCallback(() => {
    if (isRecording) stopRecording();
    toast({ title: "Emergency Mode Deactivated" });
    setIsEmergencyActive(false);
  }, [isRecording, stopRecording, toast]);

  const shareLocation = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        const message = `🚨 This is an emergency. I’m in danger. My location: ${mapsLink}`;
        toast({ title: "Location Sharing Ready" });
        settings.contacts.forEach(contact => {
          if (isOnline) window.open(`https://wa.me/${contact.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
          window.location.href = `sms:${contact.phone.replace(/\D/g, '')}?body=${encodeURIComponent(message)}`;
        });
      }, () => toast({ variant: "destructive", title: "Location access denied" })
    );
  }, [settings.contacts, isOnline, toast]);

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const value = {
    isEmergencyActive, triggerEmergency, deactivateEmergency, isOnline, settings, updateSettings,
    isRecording, startRecording, stopRecording, hasCameraPermission, mediaStream, shareLocation,
    isListening, setIsListening,
    processVoiceCommand, voiceCommandState, setVoiceCommandState, speak,
    voiceDialogState, setVoiceDialogState,
  };

  return <EmergencyContext.Provider value={value}>{children}</EmergencyContext.Provider>;
};
