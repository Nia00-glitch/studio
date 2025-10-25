"use client";

import React, { useEffect } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { useFirebase } from "@/lib/firebase/provider";
import { useEmergencyContext } from "@/contexts/EmergencyContext";
import { useToast } from "@/hooks/use-toast";

export default function VoiceListener() {
  const { finalTranscript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();
  const { functions } = useFirebase();
  const { processVoiceIntent, speak, setIsListening, isListening, toggleListening } = useEmergencyContext();
  const { toast } = useToast();

  useEffect(() => {
    setIsListening(listening);
  }, [listening, setIsListening]);
  
  useEffect(() => {
    if (!browserSupportsSpeechRecognition) {
      // You can toast here or have a status indicator that the browser is not supported
      return;
    }

    if (isListening) {
      SpeechRecognition.startListening({ continuous: false, language: 'en-IN' }).catch(err => {
        console.error("Error starting listening:", err);
        if (err.name === 'NotAllowedError') {
           toast({
              variant: "destructive",
              title: "Microphone Access Denied",
              description: "Please allow microphone access in your browser settings to use voice commands."
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
          console.warn("Functions not initialized. Using local fallback for voice intent.");
          await processVoiceIntent({ prompt: finalTranscript });
          resetTranscript();
          return;
        }

        const { httpsCallable } = await import("firebase/functions");
        const niaAction = httpsCallable(functions, "niaAction");
        const resp = await niaAction({ prompt: finalTranscript });
        
        if (resp?.data) {
          // Let the context handle speaking and state changes
          await processVoiceIntent(resp.data);
        } else {
          // Fallback if function returns no data
          await processVoiceIntent({ prompt: finalTranscript, intent: "UNKNOWN" });
        }
      } catch (err) {
        console.error("Voice processing error:", err);
        speak("Sorry, I had trouble understanding that.");
        await processVoiceIntent({ prompt: finalTranscript, intent: "UNKNOWN" });
      } finally {
        resetTranscript();
      }
    })();
  }, [finalTranscript, functions, processVoiceIntent, resetTranscript, speak]);

  // This component is now purely a listener, it doesn't render anything itself.
  return null;
}
