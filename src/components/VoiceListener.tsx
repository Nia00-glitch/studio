
"use client";

import 'regenerator-runtime/runtime';
import React, { useEffect } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useEmergencyContext } from '../contexts/EmergencyContext';
import { useToast } from "@/hooks/use-toast";

const VoiceListener = () => {
  const {
    isEmergencyActive,
    setIsListening,
    processVoiceCommand, // The new handler from context
    isOnline,
    speak,
  } = useEmergencyContext();
  const { toast } = useToast();

  const {
    listening,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
    finalTranscript,
    resetTranscript
  } = useSpeechRecognition();

  // Effect to send final transcript to the central command processor in the context
  useEffect(() => {
    if (finalTranscript && !isEmergencyActive) {
        // Only process if a wake word is detected to avoid sending every spoken word.
        if (finalTranscript.toLowerCase().startsWith('nia')) {
            if (!isOnline) {
                speak("You seem to be offline. Please check your connection and try again.");
            } else {
                processVoiceCommand(finalTranscript);
            }
        }
        resetTranscript(); // Reset after processing to be ready for the next command.
    }
  }, [finalTranscript, processVoiceCommand, resetTranscript, isEmergencyActive, isOnline, speak]);


  useEffect(() => {
      setIsListening(listening);
  }, [listening, setIsListening]);


  useEffect(() => {
    if (!browserSupportsSpeechRecognition) {
      toast({
        variant: "destructive",
        title: "Voice Commands Not Supported",
        description: "Your browser does not support the Web Speech API.",
      });
      return;
    }

    // This check is now more robust. We only show the toast once.
    if (!isMicrophoneAvailable) {
        toast({
            variant: "destructive",
            title: "Microphone Access Denied",
            description: "Please enable microphone permissions in your browser settings to use voice commands.",
            duration: Infinity, // Make it persistent until dismissed
        });
        return; // Don't attempt to start listening if mic is not available.
    }

    const startListening = () => {
        const language = 'en-IN'; // Set to Indian English for better Hinglish recognition
        SpeechRecognition.startListening({ continuous: true, language }).catch(err => {
            console.error('Could not start listening:', err);
            if (err.name === 'NotAllowedError') {
                 toast({
                    variant: "destructive",
                    title: "Microphone Access Denied by User",
                    description: "Please enable microphone permissions in your browser settings.",
                    duration: Infinity,
                });
            }
        });
    };
    
    startListening();

    return () => {
      SpeechRecognition.stopListening();
    };
  }, [browserSupportsSpeechRecognition, isMicrophoneAvailable, toast]);

  return null; // This is a listener component, it does not render a UI.
};

export default VoiceListener;

    