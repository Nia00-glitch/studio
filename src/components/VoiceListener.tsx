
"use client";

import 'regenerator-runtime/runtime';
import React, { useEffect, useCallback } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useEmergencyContext } from '../contexts/EmergencyContext';
import { useToast } from "@/hooks/use-toast";

const VoiceListener = () => {
  const { triggerEmergency, startRecording, stopRecording, shareLocation, deactivateEmergency, isEmergencyActive } = useEmergencyContext();
  const { toast } = useToast();
  
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      // You can configure voice, rate, pitch etc. here if needed
      // utterance.lang = 'en-IN';
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn("Browser does not support speech synthesis.");
      // The individual actions already trigger toasts, so no extra fallback is needed here.
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
      // The toast is handled in the context, we just add speech here.
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
            'nia', 
            'nia help', 
            'nia help me', 
            'help me',
            'nia bachao', 
            'nia emergency mode', 
            'nia madad karo',
            'madad karo',
            'emergency',
            'NIA alert',
            'activate safety mode',
            'send for help',
            'NIA emergency',
        ],
        callback: emergencyCallback,
        matchInterim: true,
        isFuzzyMatch: true,
        fuzzyMatchingThreshold: 0.8,
      },
      {
        command: [
            'nia start recording', 
            'nia recording start',
            'nia recording chalu karo',
            'start recording',
            'nia record',
            'record',
            'chalu karo recording'
        ],
        callback: startRecordingCallback,
        isFuzzyMatch: true,
        fuzzyMatchingThreshold: 0.8,
      },
      {
        command: ['nia stop recording', 'nia recording stop', 'nia recording band karo'],
        callback: stopRecordingCallback,
        isFuzzyMatch: true,
        fuzzyMatchingThreshold: 0.8,
      },
      {
        command: ['nia cancel', 'nia stop emergency', 'cancel emergency', 'nia stand down'],
        callback: deactivateEmergencyCallback,
        isFuzzyMatch: true,
        fuzzyMatchingThreshold: 0.8,
      },
       {
        command: ['nia share location', 'nia location share karo'],
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
