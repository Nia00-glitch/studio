"use client";

import React from "react";
import Link from "next/link";
import { Settings, Shield, Mic, CheckCircle, WifiOff } from "lucide-react";
import { useEmergencyContext } from "@/contexts/EmergencyContext";
import EmergencyScreen from "@/components/EmergencyScreen";
import { Button } from "@/components/ui/button";
import { NIAIcon } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { isEmergencyActive, triggerEmergency, isOnline } = useEmergencyContext();
  const { toast } = useToast();

  const handleActivate = () => {
    console.log("Emergency mode activated by button.");
    toast({
      title: "Emergency Mode Activated",
      description: "Activating safety protocols.",
    });
    triggerEmergency();
  };

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
        </div>
        <h1 className="text-4xl md:text-6xl font-bold font-headline">NIA</h1>
        <p className="text-muted-foreground mt-2 text-lg">Your Intelligent Safety Assistant</p>
        
        <div className="mt-12 text-center max-w-md mx-auto">
           <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Mic className="h-5 w-5 text-accent animate-pulse" />
              <span>Listening for voice commands...</span>
           </div>
          <p className="text-sm text-muted-foreground/80 mt-4">
            Say "NIA help" or "NIA recording start" to activate features.
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
          <CheckCircle className="w-4 h-4 text-success" />
          <span>System Normal</span>
        </div>
      </footer>
    </div>
  );
}
