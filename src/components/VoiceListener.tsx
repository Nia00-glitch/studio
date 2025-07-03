"use client";

import React, { useEffect, useRef } from 'react';
import { useEmergencyContext } from '../contexts/EmergencyContext';
import { useToast } from "@/hooks/use-toast";

const VoiceListener = () => {
  const { triggerEmergency, startRecording, stopRecording, isEmergencyActive } = useEmergencyContext();
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error('SpeechRecognition not supported in this browser.');
      toast({
        variant: "destructive",
        title: "Voice Commands Not Supported",
        description: "Your browser does not support the Web Speech API.",
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    // By not setting `recognition.lang`, we allow the browser to use its default
    // language, which provides better support for non-English phrases.
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
      console.log('Heard:', transcript);

      if (!transcript.includes('nia')) return;

      if (transcript.includes('help') || transcript.includes('bachao') || transcript.includes('emergency')) {
        console.log('Emergency triggered by voice');
        if (!isEmergencyActive) triggerEmergency();
      } else if (transcript.includes('recording start') || transcript.includes('recording chalu karo')) {
        console.log('Starting recording by voice');
        startRecording();
      } else if (transcript.includes('recording stop') || transcript.includes('recording band karo')) {
        console.log('Stopping recording by voice');
        stopRecording();
      }
    };

    recognition.onerror = (event) => {
      const ignoredErrors = ['aborted', 'no-speech', 'network'];
      // "aborted", "no-speech", and "network" are common non-critical errors.
      // The listener will attempt to restart automatically on these.
      if (!ignoredErrors.includes(event.error)) {
        console.error('Speech recognition error:', event.error);
      }
    };
    
    // Auto-restart the recognition service.
    recognition.onend = () => {
      try {
        if (recognitionRef.current) { // Check if it hasn't been stopped manually
          recognitionRef.current.start();
        }
      } catch(e) {
        console.error("Could not restart speech recognition.", e)
      }
    };

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(() => {
        try {
          recognition.start();
          console.log('Voice listener started');
        } catch (e) {
          // This can happen if it's already started.
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
  }, [triggerEmergency, startRecording, stopRecording, isEmergencyActive, toast]);

  return null; // This is a background listener
};

export default VoiceListener;
