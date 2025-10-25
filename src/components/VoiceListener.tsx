
"use client";

import React, { useEffect } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { useFirebase } from "@/lib/firebase/provider";
import { useEmergencyContext } from "@/contexts/EmergencyContext";
import { useToast } from "@/hooks/use-toast";

export default function VoiceListener() {
  const { finalTranscript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();
  const { functions } = useFirebase();
  const { processVoiceIntent, speak, setIsListening, isListening } = useEmergencyContext();
  const { toast } = useToast();

  useEffect(() => {
    setIsListening(listening);
  }, [listening, setIsListening]);
  
  useEffect(() => {
    if (!browserSupportsSpeechRecognition) {
      return;
    }
    if (isListening) {
      SpeechRecognition.startListening({ continuous: false, language: 'en-IN' }).catch(err => {
        console.error("Error starting listening:", err);
        if (err.name === 'NotAllowedError') {
           toast({
              variant: "destructive",
              title: "Microphone Access Denied",
              description: "Please allow microphone access in your browser settings."
           });
        }
        setIsListening(false);
      });
    } else {
      SpeechRecognition.stopListening();
    }
  }, [isListening, browserSupportsSpeechRecognition, toast, setIsListening]);

  useEffect(() => {
    if (!finalTranscript) return;
    (async () => {
      try {
        if (!functions) {
          console.warn("Functions not initialized");
          await processVoiceIntent({ prompt: finalTranscript });
          resetTranscript();
          return;
        }
        const { httpsCallable } = await import("firebase/functions");
        const niaAction = httpsCallable(functions, "niaAction");
        const resp = await niaAction({ prompt: finalTranscript });
        
        if (resp?.data) {
          await processVoiceIntent(resp.data);
          speak(resp.data.responseText || "Got it.");
        } else {
          await processVoiceIntent({ prompt: finalTranscript, intent: "UNKNOWN" });
        }
      } catch (err) {
        console.error("Voice processing error:", err);
        await processVoiceIntent({ prompt: finalTranscript, intent: "UNKNOWN" });
      } finally {
        resetTranscript();
      }
    })();
  }, [finalTranscript, functions, processVoiceIntent, resetTranscript, speak]);

  return null;
}
