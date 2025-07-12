"use client";

import React, { useEffect, useRef } from 'react';
import { useEmergencyContext } from '../contexts/EmergencyContext';
import { useToast } from "@/hooks/use-toast";

const VoiceListener = () => {
  const { triggerEmergency, startRecording, stopRecording, shareLocation, isEmergencyActive } = useEmergencyContext();
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error('SpeechRecognition not supported in this browser.');
      // Fallback to manual button is implicit as voice commands won't work.
      // We can notify the user that voice commands are unavailable.
      toast({
        variant: "destructive",
        title: "Voice Commands Not Supported",
        description: "Your browser does not support the Web Speech API. Please use manual controls.",
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    // Let browser detect language for better flexibility with Hindi/English
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
      console.log('Heard:', transcript);

      // Only process commands that start with "nia"
      if (!transcript.startsWith('nia')) return;

      if (transcript.includes('help') || transcript.includes('bachao') || transcript === 'nia') {
        if (!isEmergencyActive) {
            console.log('Emergency triggered by voice');
            triggerEmergency({ silent: true }); // Activate silently
        }
      } else if (transcript.includes('start recording') || transcript.includes('recording chalu karo')) {
        console.log('Starting recording by voice');
        startRecording();
      } else if (transcript.includes('stop recording') || transcript.includes('recording band karo')) {
        console.log('Stopping recording by voice');
        stopRecording();
      } else if (transcript.includes('share location')) {
        console.log('Sharing location by voice');
        shareLocation();
      }
    };

    recognition.onerror = (event) => {
      const ignoredErrors = ['aborted', 'no-speech', 'network'];
      if (!ignoredErrors.includes(event.error)) {
        console.error('Speech recognition error:', event.error);
        // On critical errors like 'not-allowed', the listener will stop.
        // The user will see a permission prompt or will have to use manual controls.
      }
    };
    
    // Auto-restart the recognition service on end.
    recognition.onend = () => {
      try {
        if (recognitionRef.current) { // Check if it hasn't been stopped manually
          recognitionRef.current.start();
        }
      } catch(e) {
        console.error("Could not restart speech recognition.", e)
      }
    };

    // Prompt for microphone permission on start
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(() => {
        try {
          recognition.start();
          console.log('Voice listener started');
        } catch (e) {
          console.log('Recognition could not be started, likely already running.');
        }
      })
      .catch((err) => {
        console.error('Microphone permission error:', err);
        toast({
          variant: "destructive",
          title: "Microphone Access Denied",
          description: "Please enable microphone permissions to use voice commands.",
        });
      });

    return () => {
      if (recognitionRef.current) {
        // Explicitly stop and clear the reference to prevent onend restart
        recognitionRef.current.onend = null; 
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, [triggerEmergency, startRecording, stopRecording, shareLocation, isEmergencyActive, toast]);

  return null; // This is a background component and does not render anything.
};

export default VoiceListener;
