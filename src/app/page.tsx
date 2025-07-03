"use client";

import { useContext, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Settings, Shield, Mic, CheckCircle, AlertTriangle, WifiOff } from "lucide-react";
import { EmergencyContext } from "@/contexts/EmergencyContext";
import EmergencyScreen from "@/components/EmergencyScreen";
import { Button } from "@/components/ui/button";
import { NIAIcon } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { isEmergencyActive, activateEmergency, isOnline } = useContext(EmergencyContext);
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(true);

  const handleActivate = useCallback(() => {
    console.log("Emergency mode activated by command.");
    toast({
      title: "Emergency Mode Activated",
      description: "Voice command recognized. Activating safety protocols.",
    });
    activateEmergency();
  }, [activateEmergency, toast]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser.");
      setPermissionGranted(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    const startListening = () => {
      recognition.start();
      setIsListening(true);
    };

    const stopListening = () => {
      recognition.stop();
      setIsListening(false);
    }
    
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      if (permissionGranted && !isEmergencyActive) {
        setTimeout(startListening, 100);
      }
    };
    
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        setPermissionGranted(false);
        toast({
          variant: "destructive",
          title: "Microphone Access Denied",
          description: "Please enable microphone access to use voice commands.",
        });
      }
      
      if (event.error !== 'aborted') {
        console.error("Speech recognition error:", event.error);
      }
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
      const wakeWords = ["nia", "nia help me", "nia bachao", "emergency"];
      
      if (wakeWords.some(word => transcript.includes(word))) {
        handleActivate();
      }
    };

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        setPermissionGranted(true);
        if (!isEmergencyActive) {
          startListening();
        }
      })
      .catch(() => {
        setPermissionGranted(false);
        toast({
          variant: "destructive",
          title: "Microphone Required",
          description: "Please allow microphone access for voice activation.",
        });
      });

    return () => {
      // This prevents the onend handler from restarting recognition after the component unmounts.
      recognition.onend = null;
      stopListening();
    };
  }, [isEmergencyActive, handleActivate, toast, permissionGranted]);

  if (isEmergencyActive) {
    return <EmergencyScreen />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 relative">
      <header className="absolute top-4 right-4 flex items-center gap-4">
        {!isOnline && <div className="flex items-center gap-2 text-muted-foreground"><WifiOff className="w-4 h-4" /> Offline</div>}
        <Link href="/settings" passHref>
          <Button variant="ghost" size="icon" aria-label="Settings">
            <Settings className="h-6 w-6" />
          </Button>
        </Link>
      </header>

      <main className="flex flex-col items-center justify-center text-center flex-grow">
        <div className="relative mb-8">
          <NIAIcon className="w-24 h-24 text-primary" />
          {isListening && (
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse -z-10"></div>
          )}
        </div>
        <h1 className="text-4xl md:text-6xl font-bold font-headline">NIA</h1>
        <p className="text-muted-foreground mt-2 text-lg">Your Intelligent Safety Assistant</p>
        
        <div className="mt-12 text-center max-w-md mx-auto">
          {permissionGranted ? (
             <div className="flex items-center justify-center gap-2 text-muted-foreground">
                {isListening ? (
                  <>
                    <Mic className="h-5 w-5 text-accent animate-pulse" />
                    <span>Listening for wake words...</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-5 w-5" />
                    <span>Initializing microphone...</span>
                  </>
                )}
             </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <span>Microphone access denied.</span>
                <p className="text-sm text-muted-foreground">Voice commands are disabled. Please enable microphone permissions in your browser settings.</p>
             </div>
          )}
          <p className="text-sm text-muted-foreground/80 mt-4">
            Say "NIA" or "Emergency" to activate.
          </p>
        </div>

        <Button
          onClick={handleActivate}
          size="lg"
          className="mt-8 gap-2 bg-primary/90 hover:bg-primary text-primary-foreground rounded-full px-8 py-6 text-lg"
          aria-label="Manually activate emergency mode"
        >
          <Shield className="h-6 w-6" />
          Manual Activation
        </Button>
      </main>

      <footer className="absolute bottom-4 text-center text-muted-foreground text-sm">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>System Normal</span>
        </div>
      </footer>
    </div>
  );
}
