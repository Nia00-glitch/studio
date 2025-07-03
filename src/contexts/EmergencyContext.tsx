"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { Settings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { uploadRecordingToFirebase } from '@/lib/storage';

interface EmergencyContextType {
  isEmergencyActive: boolean;
  triggerEmergency: () => void;
  deactivateEmergency: () => void;
  isOnline: boolean;
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  hasCameraPermission: boolean;
  mediaStream: MediaStream | null;
}

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
});

export const useEmergencyContext = () => {
    const context = useContext(EmergencyContext);
    if (!context) {
        throw new Error('useEmergencyContext must be used within an EmergencyProvider');
    }
    return context;
};

export const EmergencyProvider = ({ children }: { children: React.ReactNode }) => {
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [settings, setSettings] = useLocalStorage<Settings>('nia-settings', defaultSettings);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== 'undefined') {
        setIsOnline(navigator.onLine);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
    }
    
    return () => {
        if (typeof window !== 'undefined') {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        }
    };
  }, []);

  const triggerEmergency = useCallback(() => {
    setIsEmergencyActive(true);
  }, []);

  const deactivateEmergency = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
    setIsEmergencyActive(false);
  }, [isRecording]); // eslint-disable-line react-hooks/exhaustive-deps

  const startRecording = useCallback(async () => {
    if (isRecording || !settings.enableRecording) {
      if (!settings.enableRecording) console.log("Recording is disabled in settings.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setHasCameraPermission(true);
      setMediaStream(stream);

      mediaChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          mediaChunksRef.current.push(event.data);
        }
      };

      recorder.onstart = () => {
        setIsRecording(true);
        console.log("Context: MediaRecorder started");
        toast({ title: "Recording Started", description: "Hidden recording is now active." });
      };

      recorder.onstop = async () => {
        const blob = new Blob(mediaChunksRef.current, { type: 'video/webm' });
        
        if (isOnline) {
          toast({ title: "Uploading recording...", description: "Please wait." });
          const report = await uploadRecordingToFirebase(blob);
          if (report.status === '✅ Upload Successful') {
            toast({ title: "Upload Complete", description: "Your recording has been securely saved." });
          } else {
            toast({ variant: "destructive", title: "Upload Failed", description: "Could not save recording to cloud. Saved locally." });
            saveBlobLocally(blob);
          }
        } else {
            toast({ title: "Offline Mode", description: "Recording saved locally. It will be uploaded when you're back online." });
            saveBlobLocally(blob);
        }
        
        mediaChunksRef.current = [];
        stream.getTracks().forEach(track => track.stop());
        setMediaStream(null);
        setIsRecording(false);
        console.log("Context: MediaRecorder stopped.");
      };

      recorder.start();

    } catch (error) {
      console.error('Error accessing camera/mic:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Camera/Mic Access Denied',
        description: 'Please enable permissions in your browser settings to use recording.',
      });
    }
  }, [isRecording, settings.enableRecording, toast, isOnline]);

  const saveBlobLocally = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NIA-emergency-recording-${new Date().toISOString()}.webm`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  }

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const value = {
    isEmergencyActive,
    triggerEmergency,
    deactivateEmergency,
    isOnline,
    settings,
    updateSettings,
    isRecording,
    startRecording,
    stopRecording,
    hasCameraPermission,
    mediaStream,
  };

  return (
    <EmergencyContext.Provider value={value}>
      {children}
    </EmergencyContext.Provider>
  );
};
