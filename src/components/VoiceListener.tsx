"use client";

import 'regenerator-runtime/runtime';
import React, { useEffect, useCallback } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useEmergencyContext } from '../contexts/EmergencyContext';
import { useToast } from "@/hooks/use-toast";

const VoiceListener = () => {
  const { triggerEmergency, startRecording, stopRecording, shareLocation, isEmergencyActive } = useEmergencyContext();
  const { toast } = useToast();
  
  const commands = [
      {
        command: ['nia', 'nia help', 'nia help me', 'nia bachao'],
        callback: useCallback(() => {
          if (!isEmergencyActive) {
            console.log('Emergency triggered by voice');
            triggerEmergency({ silent: true });
          }
        }, [isEmergencyActive, triggerEmergency]),
        matchInterim: true,
        isFuzzyMatch: true,
        fuzzyMatchingThreshold: 0.8,
      },
      {
        command: ['nia start recording', 'nia recording start', 'nia recording chalu karo'],
        callback: startRecording,
        isFuzzyMatch: true,
        fuzzyMatchingThreshold: 0.8,
      },
      {
        command: ['nia stop recording', 'nia recording stop', 'nia recording band karo'],
        callback: stopRecording,
        isFuzzyMatch: true,
        fuzzyMatchingThreshold: 0.8,
      },
       {
        command: ['nia share location', 'nia location share karo'],
        callback: shareLocation,
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

    // Start listening continuously
    const startListening = () => {
        SpeechRecognition.startListening({ continuous: true }).catch(err => {
            console.error('Could not start listening:', err);
             // This might happen if permission is denied after the initial check
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

  return null; // This is a background component and does not render anything.
};

export default VoiceListener;
