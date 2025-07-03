"use client";

import React, { useEffect } from 'react';
import { useEmergencyContext } from '../contexts/EmergencyContext';

const VoiceListener = () => {
  const { triggerEmergency, startRecording, stopRecording } = useEmergencyContext();

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error('SpeechRecognition not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN'; // Better for Indian English and Hindi-English mix
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
      console.log('Heard:', transcript);

      if (
        transcript.includes('nia') &&
        (transcript.includes('help') || transcript.includes('bachao') || transcript.includes('emergency'))
      ) {
        console.log('Emergency triggered by voice');
        triggerEmergency();
      }

      if (transcript.includes('nia recording start karo')) {
        console.log('Starting background recording');
        startRecording();
      }

      if (transcript.includes('nia recording band karo')) {
        console.log('Stopping recording');
        stopRecording();
      }
    };

    recognition.onerror = (event) => {
        if (event.error !== 'aborted') {
            console.error('Speech recognition error:', event.error);
        }
    };
    
    recognition.onend = () => {
      try {
        recognition.start();
      } catch(e) {
        console.log("Could not restart recognition", e)
      }
    };

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(() => {
        try {
          recognition.start();
          console.log('Voice listener started');
        } catch (e) {
          console.log('Recognition already started');
        }
      })
      .catch((err) => {
        console.error('Microphone permission error:', err);
      });

    return () => {
      recognition.stop();
    };
  }, [triggerEmergency, startRecording, stopRecording]);

  return null; // This is a background listener
};

export default VoiceListener;