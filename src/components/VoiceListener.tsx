"use client";
import 'regenerator-runtime/runtime'; // <--- THIS MUST BE THE FIRST LINE
import React, { useEffect } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { useFirebase } from "@/lib/firebase/provider";
import { useEmergencyContext } from "@/contexts/EmergencyContext";
import { useToast } from "@/hooks/use-toast";
import { httpsCallable } from "firebase/functions";

export default function VoiceListener() {
  const { finalTranscript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();
  const { functions } = useFirebase();
  const { processVoiceIntent, speak, setIsListening, isListening } = useEmergencyContext();
  const { toast } = useToast();

  // Sync internal listening state with the hook
  useEffect(() => {
    setIsListening(listening);
  }, [listening, setIsListening]);
  
  // Manage Microphone Start/Stop
  useEffect(() => {
    if (!browserSupportsSpeechRecognition) return;

    if (isListening) {
      SpeechRecognition.startListening({ continuous: false, language: 'en-IN' }).catch(err => {
        console.error("Mic Error:", err);
        // Don't disable listening immediately on error, retry or let user know
      });
    } else {
      SpeechRecognition.stopListening();
    }
  }, [isListening, browserSupportsSpeechRecognition]);

  // Handle Voice Results (The Brain Connection)
  useEffect(() => {
    if (!finalTranscript) return;

    const handleVoiceCommand = async () => {
      try {
        if (!functions) {
            console.warn("Functions not ready");
            resetTranscript();
            return;
        }

        console.log("Sending to AI:", finalTranscript);
        // Correct Flow Name: 'niaActionFlow'
        const niaAction = httpsCallable(functions, "niaActionFlow");
        const resp = await niaAction({ prompt: finalTranscript });
        
        console.log("AI Response:", resp.data);

        if (resp?.data) {
          await processVoiceIntent(resp.data);
        }
      } catch (err) {
        console.error("AI Error:", err);
        speak("I'm having trouble connecting to the cloud.");
      } finally {
        resetTranscript();
      }
    };

    handleVoiceCommand();
  }, [finalTranscript, functions, processVoiceIntent, resetTranscript, speak]);

  return null;
}
