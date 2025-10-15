"use client";

import React, { useEffect } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useEmergencyContext } from '../contexts/EmergencyContext';
import { useToast } from '@/hooks/use-toast';

const VoiceListener = () => {
  const {
    isEmergencyActive,
    isListening, // Get the listening state from context
    setIsListening, // We still need to update the context
    processVoiceCommand,
    isOnline,
    speak,
  } = useEmergencyContext();
  const { toast } = useToast();

  const {
    listening,
    finalTranscript,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // Effect to sync library's listening state with our context's state
  useEffect(() => {
    setIsListening(listening);
  }, [listening, setIsListening]);
  
  // Effect to start or stop listening based on the context state
  useEffect(() => {
    if (!browserSupportsSpeechRecognition) {
      if (isListening) { // Only toast if the user tried to activate it
        toast({
          variant: "destructive",
          title: "Voice Commands Not Supported",
          description: "Your browser does not support this feature.",
        });
        setIsListening(false);
      }
      return;
    }

    if (isListening) {
      // Start listening if the state is true and it's not already listening
      if (!listening) {
        SpeechRecognition.startListening({ continuous: false, language: 'en-IN' }).catch(err => {
          console.error("Error starting listening:", err);
          if (err.name === 'NotAllowedError') {
             toast({
                variant: "destructive",
                title: "Microphone Access Denied",
                description: "Please allow microphone access in your browser settings."
             });
          }
          setIsListening(false); // Reset state on error
        });
      }
    } else {
      // Stop listening if the state is false and it's currently listening
      if (listening) {
        SpeechRecognition.stopListening();
      }
    }
  }, [isListening, listening, browserSupportsSpeechRecognition, toast, setIsListening]);

  // Effect to process the final transcript when listening stops
  useEffect(() => {
    if (finalTranscript) {
      if (!isOnline) {
        speak("You seem to be offline. Please check your connection and try again.");
      } else if (!isEmergencyActive) {
        // The wake word is now implicit since the user tapped the button.
        // We can still check for it as a safety measure if desired.
        if (finalTranscript.toLowerCase().includes('nia')) {
            processVoiceCommand(finalTranscript);
        }
      }
      resetTranscript(); // Reset after processing to be ready for the next command.
    }
  }, [finalTranscript, processVoiceCommand, resetTranscript, isEmergencyActive, isOnline, speak]);

  return null; // This is a listener component, it does not render a UI.
};

export default VoiceListener;
