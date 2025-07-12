
"use client";

import 'regenerator-runtime/runtime';
import React, { useEffect, useCallback } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useEmergencyContext } from '../contexts/EmergencyContext';
import { useToast } from "@/hooks/use-toast";

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

  const emergencyCallback = useCallback(() => {
    if (!isEmergencyActive) {
      console.log('Emergency triggered by voice');
      speak("Emergency mode activated. Notifying contacts.");
      triggerEmergency({ silent: true });
    }
  }, [isEmergencyActive, triggerEmergency]);

  const startRecordingCallback = useCallback(() => {
    startRecording().then(() => {
      speak("Recording started.");
    });
  }, [startRecording]);

  const stopRecordingCallback = useCallback(() => {
    stopRecording();
    speak("Recording stopped.");
  }, [stopRecording]);

  const shareLocationCallback = useCallback(() => {
    shareLocation();
    speak("Sharing your location.");
  }, [shareLocation]);
  
  const deactivateEmergencyCallback = useCallback(() => {
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
        callback: emergencyCallback,
        matchInterim: true,
        isFuzzyMatch: true,
        fuzzyMatchingThreshold: 0.8,
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
        callback: startRecordingCallback,
        isFuzzyMatch: true,
        fuzzyMatchingThreshold: 0.8,
      },
      {
        command: ['NIA stop recording', 'NIA recording stop', 'NIA recording band karo'],
        callback: stopRecordingCallback,
        isFuzzyMatch: true,
        fuzzyMatchingThreshold: 0.8,
      },
      {
        command: ['NIA cancel', 'NIA stop emergency', 'cancel emergency', 'NIA stand down'],
        callback: deactivateEmergencyCallback,
        isFuzzyMatch: true,
        fuzzyMatchingThreshold: 0.8,
      },
       {
        command: ['NIA share location', 'NIA location share karo'],
        callback: shareLocationCallback,
        isFuzzyMatch: true,
        fuzzyMatchingThreshold: 0.8,
      }
    ];

  const {
    transcript,
    listening,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition({ commands, transcribing: false });

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
        SpeechRecognition.startListening({ continuous: true }).catch(err => {
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

  return null;
};

export default VoiceListener;
