
"use client";

import 'regenerator-runtime/runtime';
import React, { useEffect, useCallback } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useEmergencyContext } from '../contexts/EmergencyContext';
import { useToast } from "@/hooks/use-toast";
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase'; // Correctly import the initialized Firebase app
import type { EmergencyDecision } from '@/lib/types'; // Correctly import the shared type


const VoiceListener = () => {
  const { 
    triggerEmergency, 
    startRecording, 
    stopRecording, 
    isEmergencyActive,
    setIsListening
  } = useEmergencyContext();
  const { toast } = useToast();
  
  const speak = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      // You could add language selection here in the future
      // utterance.lang = 'en-IN'; 
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn("Browser does not support speech synthesis.");
    }
  };

  const emergencyCallback = useCallback(async (spokenPhrase: string) => {
    if (!isEmergencyActive && spokenPhrase) {
      console.log('Passing to AI:', spokenPhrase);
      try {
        const functions = getFunctions(app);
        const simpleGenerate = httpsCallable< { prompt: string }, EmergencyDecision >(functions, 'simpleGenerate');
        
        const result = await simpleGenerate({ prompt: spokenPhrase });
        const aiResponse = result.data;
        
        console.log("AI Response:", aiResponse);
        speak(aiResponse.responseText);

        if (aiResponse.activateEmergency) {
          triggerEmergency({ silent: true }); // Trigger silently as AI provides spoken feedback
        }
      } catch (error) {
        console.error("Error calling httpsCallable function:", error);
        toast({
          variant: "destructive",
          title: "AI Error",
          description: "Could not connect to the AI assistant."
        });
      }
    }
  }, [isEmergencyActive, triggerEmergency, toast]);

  const startRecordingCallback = useCallback(() => {
      startRecording();
      speak("Recording started.");
  }, [startRecording]);

  const stopRecordingCallback = useCallback(() => {
      stopRecording();
      speak("Recording stopped.");
  }, [stopRecording]);

  // Specific commands that are not ambiguous are kept.
  // Ambiguous commands like "help" are sent to the AI.
  const commands = [
      {
        command: ['NIA start recording', 'NIA recording start karo', 'start recording'],
        callback: startRecordingCallback,
        isFuzzyMatch: true,
        fuzzyMatchingThreshold: 0.8
      },
      {
        command: ['NIA stop recording', 'NIA recording band karo', 'stop recording'],
        callback: stopRecordingCallback,
        isFuzzyMatch: true,
        fuzzyMatchingThreshold: 0.8
      }
    ];

  const {
    listening,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
    finalTranscript,
    resetTranscript
  } = useSpeechRecognition({ commands });

  // Effect to send final transcript to AI for analysis
  useEffect(() => {
    if (finalTranscript) {
        emergencyCallback(finalTranscript);
        resetTranscript(); // Reset after processing
    }
  }, [finalTranscript, emergencyCallback, resetTranscript]);


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

    if (!isMicrophoneAvailable) {
        toast({
            variant: "destructive",
            title: "Microphone Access Denied",
            description: "Please enable microphone permissions to use voice commands.",
        });
    }

    const startListening = () => {
        // Here you could add logic to switch language, e.g., from a settings context
        const language = 'en-IN';
        SpeechRecognition.startListening({ continuous: true, language }).catch(err => {
            console.error('Could not start listening:', err);
            if (err.name === 'NotAllowedError') {
                 toast({
                    variant: "destructive",
                    title: "Microphone Access Denied",
                    description: "Please enable microphone permissions to use voice commands.",
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
