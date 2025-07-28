
"use client";

import React from "react";
import Link from "next/link";
import { Settings, Shield, Mic, CheckCircle, WifiOff, AlertTriangle, LogOut } from "lucide-react";
import { useEmergencyContext } from "@/contexts/EmergencyContext";
import { useAuth } from "@/contexts/AuthContext";
import EmergencyScreen from "@/components/EmergencyScreen";
import { Button } from "@/components/ui/button";
import { NIAIcon } from "@/components/icons";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// This component will contain the UI for both Rider and Driver homes
export default function HomeClient({ role }: { role: 'rider' | 'driver' }) {
  const { isEmergencyActive, triggerEmergency, isOnline } = useEmergencyContext();
  const { logout, userProfile } = useAuth();
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
         <Button variant="ghost" size="icon" aria-label="Logout" onClick={logout}>
            <LogOut className="h-6 w-6" />
          </Button>
      </header>

      <main className="flex flex-col items-center justify-center text-center flex-grow">
        <div className="relative mb-8">
          <NIAIcon className="w-24 h-24 text-primary" />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold font-headline">Welcome, {userProfile?.name}</h1>
        <p className="text-muted-foreground mt-2 text-lg capitalize">{role} Dashboard</p>
        
        {/* Placeholder for role-specific content */}
        <div className="mt-8 border rounded-lg p-8 w-full max-w-md">
            {role === 'rider' ? (
                <p>Ready to book a ride?</p>
            ) : (
                <p>Ready to accept a ride?</p>
            )}
        </div>
        
        <div className="mt-12 text-center max-w-md mx-auto">
           <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Mic className="h-5 w-5 text-accent animate-pulse" />
              <span>Listening for voice commands...</span>
           </div>
          <p className="text-sm text-muted-foreground/80 mt-4">
            Say "NIA help" or "NIA recording start" to activate features.
          </p>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="lg"
              className="mt-8 gap-2 bg-primary/90 hover:bg-primary text-primary-foreground rounded-full px-8 py-6 text-lg"
              aria-label="Manually activate emergency mode"
            >
              <Shield className="h-6 w-6" />
              Manual Activation
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to activate emergency mode?</AlertDialogTitle>
              <AlertDialogDescription>
                This will immediately notify your emergency contacts and activate safety protocols. Only proceed if you are in a genuine emergency.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleActivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                <AlertTriangle className="mr-2 h-4 w-4" /> Activate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
