
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { Settings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { uploadRecordingToFirebase } from '@/lib/storage';

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
  shareLocation: () => {},
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

  const saveBlobLocally = (blob: Blob) => {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      document.body.appendChild(a);
      a.style.display = 'none';
      a.href = url;
      a.download = `NIA-emergency-recording-${new Date().toISOString()}.webm`;
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
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
      if (!settings.enableRecording) {
        console.log("Recording is disabled in settings.");
        toast({ title: "Recording is disabled in settings." });
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setHasCameraPermission(true);
      setMediaStream(stream);

      mediaChunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          mediaChunksRef.current.push(event.data);
        }
      };

      recorder.onstart = () => {
        setIsRecording(true);
        console.log("Context: MediaRecorder started");
        if (!isEmergencyActive) {
            toast({ title: "Recording Started", description: "Hidden recording is now active." });
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(mediaChunksRef.current, { type: 'video/webm' });
        
        if (isOnline) {
          toast({ title: "Uploading recording...", description: "Please wait." });
          const report = await uploadRecordingToFirebase(blob);
          if (report.status === '✅ Upload Successful') {
            toast({ title: "Upload Complete", description: "Your recording has been securely saved." });
          } else {
            toast({ variant: "destructive", title: "Upload Failed", description: "Could not save to cloud. Saved locally." });
            saveBlobLocally(blob);
          }
        } else {
            toast({ title: "Offline Mode", description: "Recording saved locally. Will upload when online." });
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
  }, [isRecording, settings.enableRecording, toast, isOnline, isEmergencyActive]);

  const triggerEmergency = useCallback((options?: { silent: boolean }) => {
    if (!options?.silent) {
        toast({
            title: "Emergency Mode Activated",
            description: "Activating safety protocols.",
        });
    }
    setIsEmergencyActive(true);
  }, [toast]);

  const deactivateEmergency = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
    toast({
      title: "Emergency Mode Deactivated",
      description: "You have manually ended the emergency mode.",
    });
    setIsEmergencyActive(false);
  }, [isRecording, stopRecording, toast]);

  const shareLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "Geolocation is not supported by your browser." });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        const message = `🚨 This is an emergency. I’m in danger. My location: ${mapsLink}`;
        
        toast({ title: "Location Sharing Ready", description: "Opening messaging apps..." });

        settings.contacts.forEach(contact => {
          if (isOnline) {
            const whatsappUrl = `https://wa.me/${contact.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
          }
          const smsUrl = `sms:${contact.phone.replace(/\D/g, '')}?body=${encodeURIComponent(message)}`;
          // This will not work in most desktop browsers but is standard for mobile.
          window.location.href = smsUrl;
        });
      },
      () => {
        toast({ variant: "destructive", title: "Location access denied" });
      }
    );
  }, [settings.contacts, isOnline, toast]);

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
    shareLocation
  };

  return (
    <EmergencyContext.Provider value={value}>
      {children}
    </EmergencyContext.Provider>
  );
};
