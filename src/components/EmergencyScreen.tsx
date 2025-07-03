"use client";

import { useContext, useEffect, useState, useRef } from "react";
import { EmergencyContext } from "@/contexts/EmergencyContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Siren, ShieldOff, Video, Mic, Phone, WifiOff, MessageSquare, VideoOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function EmergencyScreen() {
  const { 
    deactivateEmergency, 
    settings, 
    isOnline, 
    isRecording, 
    startRecording, 
    stopRecording,
    mediaStream,
    hasCameraPermission
  } = useContext(EmergencyContext);
  const { toast } = useToast();
  const [status, setStatus] = useState("Activating emergency protocols...");
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (mediaStream && videoRef.current) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);


  useEffect(() => {
    // Auto-send location if enabled
    if (settings.autoSendLocation) {
      handleSendLocation();
    }
    // Auto-start recording if enabled
    if (settings.enableRecording && !isRecording) {
      startRecording().then(() => {
        setStatus("Hidden recording started automatically.");
        toast({ title: "Recording Started", description: "Recording was started based on your settings." });
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeactivate = () => {
    toast({
      title: "Emergency Mode Deactivated",
      description: "You have manually ended the emergency mode.",
    });
    deactivateEmergency();
  };
  
  const handleSendLocation = () => {
    setStatus("Getting your location...");
    if (!navigator.geolocation) {
      setStatus("Geolocation is not supported by your browser.");
      toast({ variant: "destructive", title: "Could not get location" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation(position.coords);
        const { latitude, longitude } = position.coords;
        const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        const message = `🚨 This is an emergency. I’m in danger. My location: ${mapsLink}`;
        
        setStatus(`Location sent to ${settings.contacts.length} contact(s).`);
        toast({ title: "Location Sent!", description: "Emergency contacts have been notified." });

        settings.contacts.forEach(contact => {
          if (isOnline) {
            const whatsappUrl = `https://wa.me/${contact.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
          }
          const smsUrl = `sms:${contact.phone.replace(/\D/g, '')}?body=${encodeURIComponent(message)}`;
          window.location.href = smsUrl;
        });

      },
      () => {
        setStatus("Unable to retrieve your location.");
        toast({ variant: "destructive", title: "Location access denied" });
      }
    );
  };

  const handleToggleRecording = () => {
    if (!settings.enableRecording) {
      toast({ title: "Recording is disabled in settings." });
      return;
    }

    if (isRecording) {
      stopRecording();
      setStatus("Stopped hidden recording. File saved.");
      toast({ title: "Recording Stopped", description: "Your recording has been saved locally." });
    } else {
      startRecording();
      setStatus("Started hidden recording.");
      toast({ title: "Started hidden recording." });
    }
  };

  const handleAlertAuthorities = () => {
    setStatus("Alerting nearest authorities...");
    toast({ title: "Alerting Authorities", description: "An alert with your details is being sent to the nearest police station and hospital." });
    window.location.href = "tel:100";
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
                <WifiOff />
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
        <p className="text-xl font-light mb-4">{status}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <ActionButton icon={MapPin} label="Send Location" onClick={handleSendLocation} />
            <ActionButton icon={Siren} label="Alert Authorities" onClick={handleAlertAuthorities} />
            <ActionButton icon={isRecording ? VideoOff : Video} label={isRecording ? "Stop Rec" : "Start Rec"} onClick={handleToggleRecording} active={isRecording} />
            <ActionButton icon={MessageSquare} label="Message All" onClick={() => handleSendLocation()} />
        </div>
      </main>

      <footer className="w-full flex flex-col items-center">
        <Button
          variant="secondary"
          size="lg"
          className="bg-primary-foreground/90 text-primary hover:bg-primary-foreground rounded-full text-lg px-12 py-6"
          onClick={handleDeactivate}
          onLongPress={handleDeactivate}
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
