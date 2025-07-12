
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
import { simpleGenerate } from '@/ai/flows/simple-flow';

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
    similarityRatio: number,
    confirmationMessage: string
  ) => {
    const action = async () => {
        await commandCallback(spokenPhrase);
        if (confirmation) setConfirmation(null);
    };

    if (similarityRatio >= 0.8) {
      await action();
    } else {
      setConfirmation({
        message: `Did you say "${confirmationMessage}"?`,
        onConfirm: action,
      });
    }
  }, [confirmation]);

  const emergencyCallback = useCallback(async (spokenPhrase: string) => {
    if (!isEmergencyActive) {
      console.log('Passing to AI:', spokenPhrase);
      // Call the AI and wait for its decision
      const aiResponse = await simpleGenerate(spokenPhrase);
      console.log('AI Response:', aiResponse);
      
      if (aiResponse.includes('Emergency Mode Activated')) {
        speak("Emergency mode activated. Notifying contacts.");
        triggerEmergency({ silent: true });
      }
    }
  }, [isEmergencyActive, triggerEmergency]);


  const startRecordingCallback = useCallback(async (spokenPhrase: string) => {
      await startRecording();
      speak("Recording started.");
  }, [startRecording]);

  const stopRecordingCallback = useCallback(async (spokenPhrase: string) => {
      stopRecording();
      speak("Recording stopped.");
  }, [stopRecording]);

  const shareLocationCallback = useCallback(async (spokenPhrase: string) => {
      shareLocation();
      speak("Sharing your location.");
  }, [shareLocation]);
  
  const deactivateEmergencyCallback = useCallback(async (spokenPhrase: string) => {
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
        callback: (command: string, spokenPhrase: string, similarityRatio: number) => 
            handleCommand(emergencyCallback, spokenPhrase, similarityRatio, "help"),
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
        callback: (command: string, spokenPhrase: string, similarityRatio: number) =>
            handleCommand(startRecordingCallback, spokenPhrase, similarityRatio, "start recording"),
        isFuzzyMatch: true,
        fuzzyMatchingThreshold: 0.7,
      },
      {
        command: ['NIA stop recording', 'NIA recording stop', 'NIA recording band karo'],
        callback: (command: string, spokenPhrase: string, similarityRatio: number) =>
            handleCommand(stopRecordingCallback, spokenPhrase, similarityRatio, "stop recording"),
        isFuzzyMatch: true,
        fuzzyMatchingThreshold: 0.7,
      },
      {
        command: ['NIA cancel', 'NIA stop emergency', 'cancel emergency', 'NIA stand down'],
        callback: (command: string, spokenPhrase: string, similarityRatio: number) =>
            handleCommand(deactivateEmergencyCallback, spokenPhrase, similarityRatio, "cancel emergency"),
        isFuzzyMatch: true,
        fuzzyMatchingThreshold: 0.7,
      },
       {
        command: ['NIA share location', 'NIA location share karo'],
        callback: (command: string, spokenPhrase: string, similarityRatio: number) =>
            handleCommand(shareLocationCallback, spokenPhrase, similarityRatio, "share location"),
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
