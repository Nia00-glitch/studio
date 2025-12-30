"use client";
import React, { useEffect } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { useFirebase } from "@/lib/firebase/provider";
import { useEmergencyContext } from "@/contexts/EmergencyContext";
import { useToast } from "@/hooks/use-toast";
import { httpsCallable } from "firebase/functions"; // Import here

export default function VoiceListener() {
  const { finalTranscript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();
  const { functions } = useFirebase();
  const { processVoiceIntent, speak, setIsListening, isListening } = useEmergencyContext();
  const { toast } = useToast();

  useEffect(() => {
    setIsListening(listening);
  }, [listening, setIsListening]);
  
  useEffect(() => {
    if (!browserSupportsSpeechRecognition) return;

    if (isListening) {
      SpeechRecognition.startListening({ continuous: false, language: 'en-IN' }).catch(err => {
        console.error("Mic Error:", err);
        setIsListening(false);
      });
    } else {
      SpeechRecognition.stopListening();
    }
  }, [isListening, browserSupportsSpeechRecognition, setIsListening]);

  useEffect(() => {
    if (!finalTranscript) return;

    (async () => {
      try {
        if (!functions) {
            console.warn("Functions not ready");
            resetTranscript();
            return;
        }

        console.log("Sending to AI:", finalTranscript);
        // FIX: Use the correct flow name 'niaActionFlow'
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
    })();
  }, [finalTranscript, functions, processVoiceIntent, resetTranscript, speak]);

  return null;
}