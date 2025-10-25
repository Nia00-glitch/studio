"use client";

import { useEffect, useRef } from "react";
import { useEmergencyContext } from "@/contexts/EmergencyContext";
import { Button } from "@/components/ui/button";
import { MapPin, Siren, ShieldOff, Video, VideoOff, Link } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";


export default function EmergencyScreen() {
  const { 
    deactivateEmergency, 
    settings, 
    isOnline, 
    isRecording, 
    startRecording, 
    stopRecording,
    mediaStream,
    hasCameraPermission,
    shareLocation,
  } = useEmergencyContext();
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (mediaStream && videoRef.current) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);


  useEffect(() => {
    // Auto-perform actions based on settings when emergency mode activates
    if (settings.autoSendLocation) {
      shareLocation();
    }
    if (settings.enableRecording && !isRecording) {
      startRecording();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleRecording = () => {
    if (!settings.enableRecording) {
      toast({ title: "Recording is disabled in settings." });
      return;
    }

    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleAlertAuthorities = () => {
    // This is a simulation; in a real app, this would call a backend service.
    // For now, it dials a generic emergency number.
    window.location.href = "tel:100";
  };

  const handleCopyLocationLink = () => {
    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "Geolocation is not supported by your browser." });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        
        navigator.clipboard.writeText(mapsLink).then(() => {
          toast({ title: "Location Link Copied!", description: "You can now paste it in any message." });
        }).catch(err => {
          toast({ variant: "destructive", title: "Copy Failed", description: "Could not copy link to clipboard." });
        });
      },
      () => {
        toast({ variant: "destructive", title: "Location access denied" });
      }
    );
  };


  return (
    <div className="fixed inset-0 bg-primary text-primary-foreground flex flex-col items-center justify-between p-4 md:p-8 z-50 animate-in fade-in-20">
      <header className="w-full flex justify-between items-center">
        <div className="flex items-center gap-2 text-lg font-semibold bg-primary-foreground/20 px-4 py-2 rounded-full">
          <Siren className="animate-ping" />
          <span>EMERGENCY MODE ACTIVE</span>
        </div>
        {!isOnline && (
            <div className="flex items-center gap-2 text-lg font-semibold bg-primary-foreground/20 px-4 py-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-wifi-off"><line x1="2" x2="22" y1="2" y2="22"></line><path d="M8.5 16.5a5 5 0 0 1 7 0"></path><path d="M2 8.82a15 15 0 0 1 4.17-2.65"></path><path d="M10.66 5c4.01 0 7.34 1.66 9.34 4.18"></path><path d="M16.85 11.25a10 10 0 0 1 2.18 1.93"></path><path d="M22 12.83A15 15 0 0 0 17.6 9"></path></svg>
                <span>OFFLINE</span>
            </div>
        )}
      </header>

      <main className="flex flex-col items-center text-center w-full max-w-2xl">
        <div className="w-full aspect-video bg-black/50 rounded-lg overflow-hidden mb-4 relative">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
            {!hasCameraPermission && (
                <div className="absolute inset-0 flex items-center justify-center p-4">
                    <Alert variant="destructive">
                        <AlertTitle>Camera Access Required</AlertTitle>
                        <AlertDescription>
                        Please allow camera access to use recording features.
                        </AlertDescription>
                    </Alert>
                </div>
            )}
        </div>
        <p className="text-xl font-light mb-4">Emergency protocols are active.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <ActionButton icon={MapPin} label="Send Location" onClick={shareLocation} />
            <ActionButton icon={Link} label="Copy Link" onClick={handleCopyLocationLink} />
            <ActionButton icon={isRecording ? VideoOff : Video} label={isRecording ? "Stop Rec" : "Start Rec"} onClick={handleToggleRecording} active={isRecording} />
            <ActionButton icon={Siren} label="Alert Authorities" onClick={handleAlertAuthorities} />
        </div>
      </main>

      <footer className="w-full flex flex-col items-center">
        <Button
          variant="secondary"
          size="lg"
          className="bg-primary-foreground/90 text-primary hover:bg-primary-foreground rounded-full text-lg px-12 py-6"
          onClick={deactivateEmergency}
        >
          <ShieldOff className="mr-2 h-6 w-6" />
          Deactivate
        </Button>
        <p className="mt-4 text-sm text-primary-foreground/80">Press button to deactivate emergency mode.</p>
      </footer>
    </div>
  );
}

const ActionButton = ({ icon: Icon, label, onClick, active = false }: { icon: React.ElementType, label: string, onClick: () => void, active?: boolean }) => (
    <div className="flex flex-col items-center gap-2">
        <Button
            variant="outline"
            size="icon"
            className={`h-20 w-20 md:h-24 md:w-24 rounded-full bg-primary-foreground/20 border-2 border-primary-foreground/50 hover:bg-primary-foreground/30 ${active ? 'bg-accent text-accent-foreground animate-pulse' : ''}`}
            onClick={onClick}
        >
            <Icon className="h-8 w-8 md:h-10 md:w-10" />
        </Button>
        <span className="font-semibold text-sm md:text-base text-center">{label}</span>
    </div>
);
