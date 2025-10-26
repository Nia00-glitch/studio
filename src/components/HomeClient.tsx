
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Settings, LogOut, Loader2, Mic } from "lucide-react";
import { useEmergencyContext } from "@/contexts/EmergencyContext";
import { useAuth } from "@/contexts/AuthContext";
import EmergencyScreen from "@/components/EmergencyScreen";
import { Button } from "@/components/ui/button";
import { NIAIcon } from "@/components/icons";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { doc, setDoc, deleteDoc, serverTimestamp, onSnapshot, collection, query, addDoc, updateDoc, limit, arrayUnion, where } from "firebase/firestore";
import dynamic from 'next/dynamic';
import type { Ride } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { getFareQuote } from "@/lib/fare";
import OfflineIndicator from '@/components/OfflineIndicator';
import VoiceStatus from '@/components/VoiceStatus';
import { useFirebase } from '@/lib/firebase/provider'; 
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";

const IncomingRideCard = dynamic(() => import('@/components/IncomingRideCard'), {
    ssr: false,
    loading: () => <Skeleton className="w-full max-w-md h-[380px] mx-auto rounded-3xl" />,
});

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full bg-muted"><Loader2 className="h-8 w-8 animate-spin" /></div>,
});

const IDLE_LOCATION_UPDATE_INTERVAL = 4000;

export default function HomeClient({ role }: { role: 'rider' | 'driver' }) {
  const { db, functions } = useFirebase();
  const { toast } = useToast();
  const { 
    isEmergencyActive,
    voiceCommandState, setVoiceCommandState,
    voiceDialogState, setVoiceDialogState, speak,
    isListening, toggleListening,
  } = useEmergencyContext();

  const { logout, user, userProfile } = useAuth();
  
  const [isOnlineAsDriver, setIsOnlineAsDriver] = useState(false);
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  const [drivers, setDrivers] = useState<{ driver_id: string; latitude: number; longitude: number; }[]>([]);
  const [destination, setDestination] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);

  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [rideId, setRideId] = useState<string | null>(null);
  
  const [pendingRideForDriver, setPendingRideForDriver] = useState<Ride | null>(null);
  
  const unsubscribeRideRef = useRef<(() => void) | null>(null);
  const unsubscribePendingRideRef = useRef<(() => void) | null>(null);
  
  const debouncedUpdateDriverLocation = useDebouncedCallback(
    (lat: number, lng: number) => {
      if (user && db) {
        setDoc(doc(db, "driver_locations", user.uid), {
          driver_id: user.uid, latitude: lat, longitude: lng, timestamp: serverTimestamp(), isOnline: true,
        }, { merge: true });
      }
    },
    IDLE_LOCATION_UPDATE_INTERVAL
  );

  const handleRideDecision = useCallback(async (ride: Ride, decision: 'ACCEPT' | 'DECLINE') => {
      if (!user || !db || !functions) return;

      if (decision === 'ACCEPT') {
          const { httpsCallable } = await import('firebase/functions');
          const acceptRide = httpsCallable(functions, 'rideAccept');
          try {
            await acceptRide({ rideId: ride.id });
            toast({ title: "Ride Accepted", description: "Navigating to pickup." });
            setRideId(ride.id); 
            setPendingRideForDriver(null);
          } catch(error: any) {
            console.error("Accept ride error:", error);
            if(error.code?.includes('failed-precondition')) {
              toast({ variant: 'destructive', title: "Ride Gone", description: "Sorry, this ride has already been taken." });
            } else {
              toast({ variant: 'destructive', title: "Error", description: "Could not accept ride. Please try again." });
            }
            setPendingRideForDriver(null);
          }
      } else { // DECLINE
          try {
              const rideDocRef = doc(db, "rides", ride.id);
              await updateDoc(rideDocRef, {
                  declinedBy: arrayUnion(user.uid)
              });
              toast({ title: "Ride Declined" });
          } catch (error) {
              toast({ variant: 'destructive', title: "Error", description: "Could not decline ride." });
          } finally {
             setPendingRideForDriver(null);
          }
      }
  }, [user, db, functions, toast]);
  
  // Rider: Voice Dialog State Machine
  useEffect(() => {
    if (role !== 'rider' || !voiceCommandState.lastAction || !functions) return;

    const { intent, entities, prompt } = voiceCommandState.lastAction;
    const currentDialogStatus = voiceDialogState.status;

    const processAction = async () => {
        if (currentDialogStatus === 'IDLE' && intent === 'RIDE_REQUEST' && entities?.destination) {
            if (!location) { speak("I need your location to book a ride."); setVoiceDialogState({ status: 'IDLE' }); return; }
            setVoiceDialogState({ status: 'PARSING' });
            // In a real app, you'd geocode the destination. Here, we use a placeholder.
            const placeholderDestination = { lat: location.lat + 0.05, lng: location.lng + 0.05 }; 
            try {
                const fares = await getFareQuote(functions, location, placeholderDestination);
                speak(`A cab is ${fares.estimates.cab} rupees, auto is ${fares.estimates.auto}. Which do you want?`);
                setVoiceDialogState({ status: 'AWAITING_MODE_CONFIRMATION', destination: entities.destination, fares, pickup: location });
            } catch (err) {
                speak(`Sorry, I couldn't get fares for ${entities.destination}.`);
                setVoiceDialogState({ status: 'IDLE' });
            }
        } else if (currentDialogStatus === 'AWAITING_MODE_CONFIRMATION') {
            const transcript = (prompt || '').toLowerCase();
            const mode = transcript.includes('cab') ? 'cab' : transcript.includes('auto') ? 'auto' : null;
            if (mode) {
                const price = voiceDialogState.fares.estimates[mode];
                speak(`${mode} for ${price} rupees. Should I confirm?`);
                setVoiceDialogState({ ...voiceDialogState, status: 'AWAITING_FINAL_CONFIRMATION', mode, priceEstimate: price });
            } else {
                speak("Sorry, I didn't get that. Cab or auto?");
            }
        } else if (currentDialogStatus === 'AWAITING_FINAL_CONFIRMATION' && intent === 'CONFIRMATION_YES') {
            setVoiceDialogState({ status: 'EXECUTING' });
            await handleRequestRide(voiceDialogState.destination, voiceDialogState.mode, voiceDialogState.priceEstimate);
        } else if (intent === 'CANCEL_RIDE' || intent === 'CONFIRMATION_NO') {
            speak("Okay, cancelling.");
            setVoiceDialogState({ status: 'IDLE' });
        }
    };
    
    processAction().finally(() => setVoiceCommandState({ status: 'idle' }));
  }, [voiceCommandState.lastAction, voiceDialogState, location, role, setVoiceDialogState, setVoiceCommandState, speak, functions]); // React only to changes in lastAction
  
  // Get user's location
  useEffect(() => {
    if (!navigator.geolocation) { setLocationError("Geolocation is not supported."); return; }
    const watcher = navigator.geolocation.watchPosition(
      (pos) => { 
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        if (role === 'driver' && isOnlineAsDriver && !activeRide) {
          debouncedUpdateDriverLocation(pos.coords.latitude, pos.coords.longitude);
        }
      },
      () => setLocationError("Location permission denied."),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, [role, isOnlineAsDriver, activeRide, debouncedUpdateDriverLocation]);

  // Driver online/offline status
  const handleDriverStatusChange = async (online: boolean) => {
    if (!user || !location || !db) return;
    setIsOnlineAsDriver(online);
    const driverLocRef = doc(db, "driver_locations", user.uid);
    if (online) {
      await setDoc(driverLocRef, {
          driver_id: user.uid, latitude: location.lat, longitude: location.lng, timestamp: serverTimestamp(), isOnline: true
      }, { merge: true });
    } else {
      await deleteDoc(driverLocRef);
    }
  };
  
  // Rider: watch nearby drivers
  useEffect(() => {
    if (role === 'rider' && !activeRide && db) {
      const q = query(collection(db, "driver_locations"), where("isOnline", "==", true));
      const unsub = onSnapshot(q, (snap) => setDrivers(snap.docs.map(d => d.data() as any)));
      return () => unsub();
    } else { setDrivers([]); }
  }, [role, activeRide, db]);

  // Listen to active ride updates
  useEffect(() => {
    if (rideId && db) {
      const unsub = onSnapshot(doc(db, "rides", rideId), (docSnap) => {
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Ride;
          setActiveRide(data);
          setIsRequesting(data.status === 'pending');
        } else {
          setActiveRide(null); setRideId(null);
        }
      });
      return () => unsub();
    }
  }, [rideId, db]);

  // Driver: Listen for assigned pending rides
  useEffect(() => {
    if (role === 'driver' && isOnlineAsDriver && !activeRide && user && db) {
      const q = query(collection(db, "rides"), where("status", "==", "pending"), where("notifiedDriverId", "==", user.uid), limit(1));
      const unsub = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          const ride = { id: snap.docs[0].id, ...snap.docs[0].data() } as Ride;
          if (!ride.declinedBy?.includes(user.uid) && pendingRideForDriver?.id !== ride.id) {
            setPendingRideForDriver(ride);
          }
        } else {
          setPendingRideForDriver(null);
        }
      });
      return () => unsub();
    } else { if (unsubscribePendingRideRef.current) unsubscribePendingRideRef.current(); setPendingRideForDriver(null); }
  }, [role, isOnlineAsDriver, activeRide, user, db, pendingRideForDriver]);


  const handleRequestRide = async (finalDestination?: string, mode?: 'cab' | 'auto' | 'bike', priceEstimate?: number) => {
    const destinationToUse = finalDestination || destination;
    if (!user || !location || !destinationToUse || !db) return;
    setIsRequesting(true);
    try {
      const rideDocRef = await addDoc(collection(db, "rides"), {
        riderId: user.uid, riderName: userProfile?.name || "Rider",
        pickupLocation: { latitude: location.lat, longitude: location.lng },
        destinationAddress: destinationToUse, status: "pending", requestedAt: serverTimestamp(),
        mode: mode || 'cab', priceEstimate: priceEstimate || 0, declinedBy: [],
      });
      setRideId(rideDocRef.id); setDestination("");
      speak("Searching for a driver.");
      setVoiceDialogState({ status: 'IDLE' });
    } catch (error) { 
        setIsRequesting(false); 
        speak("Sorry, there was an error booking your ride.");
        setVoiceDialogState({ status: 'IDLE' });
    }
  }

  const handleRideAction = async (newStatus: 'completed' | 'cancelled') => {
      if (!rideId || !db) return;
      await updateDoc(doc(db, "rides", rideId), { status: newStatus, [`${newStatus}At`]: serverTimestamp() });
      setRideId(null); setActiveRide(null);
  };
  
  if (isEmergencyActive) { return <EmergencyScreen />; }
  
  const renderRiderUI = () => {
    if (activeRide) {
        return (
            <Card className="w-full">
                <CardHeader>
                    <CardTitle>
                      {activeRide.status === 'pending' && 'Finding your ride...'}
                      {activeRide.status === 'accepted' && `Driver is on the way!`}
                      {activeRide.status === 'in-progress' && `Ride to ${activeRide.destinationAddress}`}
                      {activeRide.status === 'no_drivers_available' && 'No Drivers Found'}
                    </CardTitle>
                    <CardDescription>
                        {activeRide.driverName && `Your driver is ${activeRide.driverName}.`}
                        {activeRide.status === 'no_drivers_available' && `Sorry, no drivers were available. Please try again.`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="destructive" onClick={() => handleRideAction('cancelled')}>Cancel Ride</Button>
                </CardContent>
            </Card>
        )
    }
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Where to?</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); handleRequestRide(); }} className="space-y-4">
                    <Input placeholder="Enter destination" value={destination} onChange={(e) => setDestination(e.target.value)} />
                    <Button type="submit" className="w-full" disabled={isRequesting || !destination}>
                        {isRequesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Request Ride'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
  };
  
  const renderDriverUI = () => {
    if (pendingRideForDriver) {
        return <IncomingRideCard ride={pendingRideForDriver} onAccept={() => handleRideDecision(pendingRideForDriver, 'ACCEPT')} onDecline={() => handleRideDecision(pendingRideForDriver, 'DECLINE')} isListening={false} />
    }
    if (activeRide) {
        return (
             <Card className="w-full">
                <CardHeader>
                    <CardTitle>Ride in Progress</CardTitle>
                    <CardDescription>To: {activeRide.destinationAddress}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2">
                    <Button className="w-full bg-green-500 hover:bg-green-600" onClick={() => handleRideAction('completed')}>Complete Ride</Button>
                    <Button variant="destructive" className="w-full" onClick={() => handleRideAction('cancelled')}>Cancel Ride</Button>
                </CardContent>
            </Card>
        )
    }
    return (
        <div className="flex items-center space-x-2">
          <Switch id="driver-status" checked={isOnlineAsDriver} onCheckedChange={handleDriverStatusChange} />
          <Label htmlFor="driver-status">{isOnlineAsDriver ? "You are Online" : "Go Online"}</Label>
        </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center bg-gradient-to-b from-black/20 to-transparent">
        <h1 className="text-xl font-bold text-white shadow-md flex items-center gap-2 font-headline"><NIAIcon className="w-6 h-6" /> NIA Rides</h1>
        <div className="flex items-center gap-2">
            <OfflineIndicator />
            <Link href="/settings" passHref><Button variant="ghost" size="icon" className="text-white hover:bg-white/20" aria-label="Settings"><Settings className="h-6 w-6" /></Button></Link>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" aria-label="Logout" onClick={logout}><LogOut className="h-6 w-6" /></Button>
        </div>
      </header>
      
      <VoiceStatus />

      <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20">
          <Button size="icon" className={cn("rounded-full h-20 w-20 shadow-lg transition-all duration-300 transform hover:scale-110", isListening ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-primary hover:bg-primary/90")} onClick={toggleListening}>
              <Mic className="h-9 w-9" />
          </Button>
      </div>

      <main className="flex-grow relative">
        {locationError && <div className="absolute inset-0 z-20 p-4 text-center flex items-center justify-center bg-background/80 backdrop-blur-sm"><p>{locationError}</p></div>}
        {!location && !locationError && <div className="absolute inset-0 flex items-center justify-center bg-background z-20"><Loader2 className="h-8 w-8 animate-spin" /><p className="ml-4">Getting your location...</p></div>}
        {location && <MapComponent center={location} drivers={drivers} activeRide={activeRide} role={role} />}
      </main>

      <footer className="p-4 border-t bg-background shadow-lg z-10">
        <div className="container mx-auto max-w-4xl">
            {role === 'rider' ? renderRiderUI() : renderDriverUI()}
        </div>
      </footer>
    </div>
  );
}

    