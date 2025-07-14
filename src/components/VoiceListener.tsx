
"use client";

import 'regenerator-runtime/runtime';
import React, { useEffect, useCallback } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useEmergencyContext } from '../contexts/EmergencyContext';
import { useToast } from "@/hooks/use-toast";
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import type { EmergencyDecision } from '@/lib/types';


const VoiceListener = () => {
  const { 
    triggerEmergency, 
    startRecording, 
    stopRecording, 
    shareLocation, 
    deactivateEmergency, 
    isEmergencyActive,
    setIsListening
  } = useEmergencyContext();
  const { toast } = useToast();
  
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn("Browser does not support speech synthesis.");
    }
  };

  const emergencyCallback = useCallback(async (spokenPhrase: string) => {
    if (!isEmergencyActive) {
      console.log('Passing to AI:', spokenPhrase);
      try {
        const functions = getFunctions(app);
        const simpleGenerate = httpsCallable(functions, 'simpleGenerate');
        // The data must be wrapped in an object that matches the flow's input schema
        const result = await simpleGenerate({ prompt: spokenPhrase });
        const aiResponse = result.data as EmergencyDecision;
        
        console.log("AI Response:", aiResponse);
        speak(aiResponse.responseText);

        if (aiResponse.activateEmergency) {
          triggerEmergency({ silent: true });
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


  const startRecordingCallback = useCallback(async () => {
      await startRecording();
      speak("Recording started.");
  }, [startRecording]);

  const stopRecordingCallback = useCallback(async () => {
      stopRecording();
      speak("Recording stopped.");
  }, [stopRecording]);

  const shareLocationCallback = useCallback(async () => {
      shareLocation();
      speak("Sharing your location.");
  }, [shareLocation]);
  
  const deactivateEmergencyCallback = useCallback(async () => {
      deactivateEmergency();
      speak("Emergency mode deactivated.");
  }, [deactivateEmergency]);

  const commands = [
      {
        command: [
            'NIA',
            'NIA help',
            'NIA help me',
            'help me',
            'NIA bachao',
            'NIA emergency',
            'NIA emergency mode',
            'NIA madad karo',
            'madad karo',
            'emergency',
            'NIA alert',
            'activate safety mode',
            'send for help',
        ],
        callback: (command: string, spokenPhrase: string) => 
            emergencyCallback(spokenPhrase),
        matchInterim: true,
        isFuzzyMatch: true,
        fuzzyMatchingThreshold: 0.7,
      },
      {
        command: [
            'NIA start recording',
            'NIA recording start',
            'NIA recording chalu karo',
            'start recording',
            'NIA record',
            'record',
            'chalu karo recording',
        ],
        callback: () => startRecordingCallback(),
        isFuzzyMatch: true,
        fuzzyMatchingThreshold: 0.7,
      },
      {
        command: ['NIA stop recording', 'NIA recording stop', 'NIA recording band karo'],
        callback: () => stopRecordingCallback(),
        isFuzzyMatch: true,
        fuzzyMatchingThreshold: 0.7,
      },
      {
        command: ['NIA cancel', 'NIA stop emergency', 'cancel emergency', 'NIA stand down'],
        callback: () => deactivateEmergencyCallback(),
        isFuzzyMatch: true,
        fuzzyMatchingThreshold: 0.7,
      },
       {
        command: ['NIA share location', 'NIA location share karo'],
        callback: () => shareLocationCallback(),
        isFuzzyMatch: true,
        fuzzyMatchingThreshold: 0.7,
      }
    ];

  const {
    transcript,
    listening,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition({ commands });

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
        const language = 'en-IN'; // Defaulting to English (India)
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
  
  useEffect(() => {
      if (transcript) {
          console.log("Heard:", transcript);
      }
  }, [transcript])

  return null; // This is a listener component, it does not render a UI.
};

export default VoiceListener;
