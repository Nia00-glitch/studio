
"use client";

import 'regenerator-runtime/runtime';
import React, { useEffect, useCallback, useState } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useEmergencyContext } from '../contexts/EmergencyContext';
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getFlow } from '@genkit-ai/firebase/client';
import type { emergencyFlow } from '@/../functions/src/index';


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

  const [confirmation, setConfirmation] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);
  
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn("Browser does not support speech synthesis.");
    }
  };

  const handleCommand = useCallback(async (
    commandCallback: (spokenPhrase: string) => Promise<void>,
    spokenPhrase: string,
  ) => {
    await commandCallback(spokenPhrase);
  }, []);

  const emergencyCallback = useCallback(async (spokenPhrase: string) => {
    if (!isEmergencyActive) {
      console.log('Passing to AI:', spokenPhrase);
      try {
        const simpleGenerate = await getFlow<typeof emergencyFlow>('simpleGenerate');
        const aiResponse = await simpleGenerate({ prompt: spokenPhrase });
        
        speak(aiResponse.responseText);

        if (aiResponse.activateEmergency) {
          triggerEmergency({ silent: true });
        }
      } catch (error) {
        console.error("Error calling AI flow:", error);
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
            handleCommand(emergencyCallback, spokenPhrase),
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
        callback: (command: string, spokenPhrase: string) =>
            handleCommand(startRecordingCallback, spokenPhrase),
        isFuzzyMatch: true,
        fuzzyMatchingThreshold: 0.7,
      },
      {
        command: ['NIA stop recording', 'NIA recording stop', 'NIA recording band karo'],
        callback: (command: string, spokenPhrase: string) =>
            handleCommand(stopRecordingCallback, spokenPhrase),
        isFuzzyMatch: true,
        fuzzyMatchingThreshold: 0.7,
      },
      {
        command: ['NIA cancel', 'NIA stop emergency', 'cancel emergency', 'NIA stand down'],
        callback: (command: string, spokenPhrase: string) =>
            handleCommand(deactivateEmergencyCallback, spokenPhrase),
        isFuzzyMatch: true,
        fuzzyMatchingThreshold: 0.7,
      },
       {
        command: ['NIA share location', 'NIA location share karo'],
        callback: (command: string, spokenPhrase: string) =>
            handleCommand(shareLocationCallback, spokenPhrase),
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

  const handleCancel = () => {
    setConfirmation(null);
  };


  return (
    <>
      {confirmation && (
        <AlertDialog open={!!confirmation} onOpenChange={(open) => !open && handleCancel()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Action</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmation.message}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancel}>No, Ignore</AlertDialogCancel>
              <AlertDialogAction onClick={confirmation.onConfirm}>Yes, Proceed</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};

export default VoiceListener;
