
"use client";

import 'regenerator-runtime/runtime';
import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Settings, Mic, WifiOff, AlertTriangle, LogOut, Loader2, Car, MapPin } from "lucide-react";
import { useEmergencyContext } from "@/contexts/EmergencyContext";
import { useAuth } from "@/contexts/AuthContext";
import EmergencyScreen from "@/components/EmergencyScreen";
import { Button } from "@/components/ui/button";
import { NIAIcon } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { doc, setDoc, deleteDoc, serverTimestamp, onSnapshot, collection, query, where, addDoc, updateDoc, getDocs, limit, runTransaction, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import dynamic from 'next/dynamic';
import type { Ride, VoiceDialogState, DriverVoiceState } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { getFareQuote } from "@/lib/fare";
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

const RideRequestCard = dynamic(() => import('@/components/RideRequestCard'), {
  ssr: false,
  loading: () => <Skeleton className="w-full max-w-md h-[480px] mx-auto rounded-3xl" />,
});

const IncomingRideCard = dynamic(() => import('@/components/IncomingRideCard'), {
    ssr: false,
    loading: () => <Skeleton className="w-full max-w-md h-[380px] mx-auto rounded-3xl" />,
});

const LOCATION_STREAMING_INTERVAL = 5000;
const IDLE_LOCATION_UPDATE_INTERVAL = 4000;
const DRIVER_DECISION_TIMEOUT = 10000; // 10 seconds

const ACCEPT_KEYWORDS = ["accept", "haan", "yes", "theek hai", "ok", "okay", "chalo", "kar do"];
const DECLINE_KEYWORDS = ["decline", "nahi", "no", "cancel", "mana", "mat karo"];


export default function HomeClient({ role }: { role: 'rider' | 'driver' }) {
  const { 
    isEmergencyActive,
    isOnline, 
    voiceCommandState, setVoiceCommandState,
    voiceDialogState, setVoiceDialogState, speak,
  } = useEmergencyContext();

  const { logout, user, userProfile } = useAuth();
  const { toast } = useToast();
  
  const [isOnlineAsDriver, setIsOnlineAsDriver] = useState(false);
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const generalLocationWatcherRef = useRef<number | null>(null);

  const [drivers, setDrivers] = useState<{ driver_id: string; latitude: number; longitude: number; }[]>([]);
  const [destination, setDestination] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);

  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [rideId, setRideId] = useState<string | null>(null);
  
  const [pendingRideForDriver, setPendingRideForDriver] = useState<Ride | null>(null);
  const [driverVoiceState, setDriverVoiceState] = useState<DriverVoiceState>("IDLE");
  const driverDecisionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { finalTranscript, resetTranscript } = useSpeechRecognition();
  
  const unsubscribeRideRef = useRef<(() => void) | null>(null);
  const unsubscribePendingRideRef = useRef<(() => void) | null>(null);
  
  const debouncedUpdateDriverLocation = useDebouncedCallback(
    (lat: number, lng: number) => {
      if (user) {
        setDoc(doc(db, "driver_locations", user.uid), {
          driver_id: user.uid, latitude: lat, longitude: lng, timestamp: serverTimestamp(),
        }, { merge: true });
      }
    },
    IDLE_LOCATION_UPDATE_INTERVAL
  );

  const cleanupDriverVoiceState = useCallback(() => {
    SpeechRecognition.stopListening();
    if (driverDecisionTimeoutRef.current) {
        clearTimeout(driverDecisionTimeoutRef.current);
        driverDecisionTimeoutRef.current = null;
    }
    setDriverVoiceState("IDLE");
    setPendingRideForDriver(null);
    resetTranscript();
  }, [resetTranscript]);

  const handleRideDecision = useCallback(async (ride: Ride, decision: 'ACCEPT' | 'DECLINE') => {
      if (!user || driverVoiceState === 'UPDATING_RIDE') return;

      setDriverVoiceState('UPDATING_RIDE');
      SpeechRecognition.stopListening();

      const rideDocRef = doc(db, "rides", ride.id);

      if (decision === 'ACCEPT') {
          try {
              await runTransaction(db, async (transaction) => {
                  const rideDoc = await transaction.get(rideDocRef);
                  if (!rideDoc.exists()) throw "Ride does not exist.";
                  
                  const currentRideData = rideDoc.data();
                  if (currentRideData.status !== 'pending' || currentRideData.driverId) {
                      throw "RIDE_TAKEN";
                  }
                  
                  transaction.update(rideDocRef, {
                      status: 'accepted',
                      driverId: user.uid,
                      driverName: userProfile?.name || 'Driver',
                      acceptedAt: serverTimestamp(),
                  });
              });
              speak("Ride accepted. Navigating to pickup.");
              setRideId(ride.id); 
          } catch (error) {
              if (error === "RIDE_TAKEN") {
                  speak("Ride has already been taken.");
              } else {
                  speak("Could not accept ride. Please try again.");
              }
          } finally {
              cleanupDriverVoiceState();
          }
      } else { // DECLINE
          try {
              await updateDoc(rideDocRef, {
                  declinedBy: arrayUnion(user.uid)
              });
              speak("Ride declined.");
          } catch (error) {
              speak("Could not decline ride.");
          } finally {
              cleanupDriverVoiceState();
          }
      }
  }, [user, userProfile, driverVoiceState, speak, cleanupDriverVoiceState]);
  
    // Driver: Process voice decision for incoming ride
    useEffect(() => {
        if (role !== 'driver' || driverVoiceState !== 'LISTENING_DECISION' || !finalTranscript || !pendingRideForDriver) return;
        const transcript = finalTranscript.toLowerCase().trim();
        if (!transcript) return;
        resetTranscript();

        if (ACCEPT_KEYWORDS.some(kw => transcript.includes(kw))) {
            handleRideDecision(pendingRideForDriver, 'ACCEPT');
        } else if (DECLINE_KEYWORDS.some(kw => transcript.includes(kw))) {
            handleRideDecision(pendingRideForDriver, 'DECLINE');
        }
    }, [finalTranscript, role, driverVoiceState, pendingRideForDriver, handleRideDecision, resetTranscript]);


  // Rider: Voice Dialog State Machine
  useEffect(() => {
    if (role !== 'rider') return;
    const { status, lastAction } = voiceCommandState;

    const processAction = async () => {
        if (status !== 'awaiting_confirmation' || !lastAction) return;
        
        const currentDialogState = voiceDialogState.status;

        if (currentDialogState === 'IDLE' && lastAction.intent === 'RIDE_REQUEST' && lastAction.entities.destination) {
            if (!location) { speak("I need your location to book a ride. Please enable location services."); setVoiceDialogState({ status: 'ERROR', message: 'Location not available.' }); return; }
            if (!isOnline) { speak("You seem to be offline. Please check your connection."); setVoiceDialogState({ status: 'IDLE' }); return; }
            
            setVoiceDialogState({ status: 'PARSING' });
            const dest = lastAction.entities.destination;
            const placeholderDestination = { lat: location.lat + 0.1, lng: location.lng + 0.1 };
            try {
                const fares = await getFareQuote({ lat: location.lat, lng: location.lng }, placeholderDestination);
                if (!fares) throw new Error("Could not retrieve fare information.");
                speak(`Cab is ${fares.estimates.cab} rupees, Auto is ${fares.estimates.auto}, and Bike is ${fares.estimates.bike}. Which mode would you like?`);
                setVoiceDialogState({ status: 'AWAITING_MODE_CONFIRMATION', destination: dest, fares, pickup: location });
            } catch (err: any) {
                if(err.message?.includes("DIRECTIONS_FAILED")) { speak(`Sorry, I couldn't find a route to ${dest}. Please try another destination.`); }
                else { speak(`Sorry, I couldn't get fares for ${dest}. Please try again.`); }
                setVoiceDialogState({ status: 'ERROR', message: err.message });
            }
        } else if (currentDialogState === 'AWAITING_MODE_CONFIRMATION') {
            const transcript = (lastAction.prompt || '').toLowerCase();
            let mode: 'cab' | 'auto' | 'bike' | null = null;
            if (transcript.includes('cab') || transcript.includes('car') || transcript.includes('gaadi')) mode = 'cab';
            else if (transcript.includes('auto')) mode = 'auto';
            else if (transcript.includes('bike')) mode = 'bike';
            if (mode) {
                const priceEstimate = voiceDialogState.fares.estimates[mode];
                speak(`${mode} for ${priceEstimate} rupees. Should I confirm?`);
                setVoiceDialogState({ ...voiceDialogState, status: 'AWAITING_FINAL_CONFIRMATION', mode, priceEstimate });
            } else { speak("Sorry, I didn't catch that. Please say cab, auto, or bike."); }
        } else if (currentDialogState === 'AWAITING_FINAL_CONFIRMATION' && lastAction.intent === 'CONFIRMATION_YES') {
            setVoiceDialogState({ status: 'EXECUTING' });
            speak("Okay, booking your ride now.");
            await handleRequestRide(voiceDialogState.destination, voiceDialogState.mode, voiceDialogState.priceEstimate);
        } else if (lastAction.intent === 'CONFIRMATION_NO' || lastAction.intent === 'CANCEL_RIDE') {
            speak("Okay, cancelling the request.");
            setVoiceDialogState({ status: 'IDLE' });
        }
    };
    
    processAction().finally(() => { setVoiceCommandState({ status: 'idle' }); });
  }, [voiceCommandState, voiceDialogState, location, speak, setVoiceDialogState, setVoiceCommandState, role, isOnline]);
  
  
  // Driver: Announce incoming ride
  useEffect(() => {
      if (role === 'driver' && pendingRideForDriver && driverVoiceState === "IDLE") {
          setDriverVoiceState("ANNOUNCING");
          speak(`New ride to ${pendingRideForDriver.destinationAddress} for ${pendingRideForDriver.priceEstimate} rupees. Accept or Decline?`);
          
          setTimeout(() => {
              setDriverVoiceState("LISTENING_DECISION");
              SpeechRecognition.startListening({ language: 'en-IN' });
              driverDecisionTimeoutRef.current = setTimeout(() => {
                  speak("No response received. Ride declined.");
                  handleRideDecision(pendingRideForDriver, 'DECLINE');
              }, DRIVER_DECISION_TIMEOUT);
          }, 4000); // Give TTS time to speak
      }
  }, [role, pendingRideForDriver, driverVoiceState, speak, cleanupDriverVoiceState, handleRideDecision]);


  useEffect(() => {
    if (!navigator.geolocation) { setLocationError("Geolocation is not supported by your browser."); return; }
    const handleSuccess = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      setLocation({ lat: latitude, lng: longitude }); setLocationError(null);
      if (role === 'driver' && isOnlineAsDriver && !activeRide) { debouncedUpdateDriverLocation(latitude, longitude); }
    };
    const handleError = (error: GeolocationPositionError) => { setLocationError("Location permission denied. Please enable it to use the app."); };
    const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };
    generalLocationWatcherRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, options);
    return () => { if (generalLocationWatcherRef.current !== null) navigator.geolocation.clearWatch(generalLocationWatcherRef.current); };
  }, [role, isOnlineAsDriver, activeRide, debouncedUpdateDriverLocation]);

  useEffect(() => {
    let watcherId: number | null = null;
    let lastUpdateTime = 0;
    if (role === 'driver' && activeRide && ['accepted', 'in-progress'].includes(activeRide.status)) {
      const rideDocRef = doc(db, "rides", activeRide.id);
      const handleSuccess = (position: GeolocationPosition) => {
        if (Date.now() - lastUpdateTime < LOCATION_STREAMING_INTERVAL) return;
        lastUpdateTime = Date.now();
        const { latitude, longitude, heading } = position.coords;
        updateDoc(rideDocRef, {
            'driverLive.lat': latitude, 'driverLive.lng': longitude, 'driverLive.heading': heading ?? null, 'driverLive.updatedAt': serverTimestamp(),
        }).catch(err => console.error("Failed to update driver live location", err));
      };
      watcherId = navigator.geolocation.watchPosition(handleSuccess, () => {}, { enableHighAccuracy: true });
      if (user) deleteDoc(doc(db, "driver_locations", user.uid));
    }
    return () => { if (watcherId !== null) navigator.geolocation.clearWatch(watcherId); };
  }, [role, activeRide, user]);

  const handleDriverStatusChange = async (isOnline: boolean) => {
    if (!user || !location) return;
    setIsOnlineAsDriver(isOnline);
    if (isOnline) {
      await setDoc(doc(db, "driver_locations", user.uid), {
          driver_id: user.uid, latitude: location.lat, longitude: location.lng, timestamp: serverTimestamp(),
      }, { merge: true });
    } else {
      await deleteDoc(doc(db, "driver_locations", user.uid));
    }
  };
  
  useEffect(() => {
    if (role === 'rider' && !activeRide) {
      const q = query(collection(db, "driver_locations"));
      const unsubscribe = onSnapshot(q, (snapshot) => setDrivers(snapshot.docs.map(doc => doc.data() as any)));
      return () => unsubscribe();
    } else { setDrivers([]); }
  }, [role, activeRide]);

  useEffect(() => {
    if (rideId) {
      const rideDocRef = doc(db, "rides", rideId);
      unsubscribeRideRef.current = onSnapshot(rideDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const rideData = { id: docSnap.id, ...docSnap.data() } as Ride;
          setActiveRide(rideData);
          setIsRequesting(rideData.status === 'pending' && role === 'rider');
        } else { setActiveRide(null); setRideId(null); }
      });
    } else { if (unsubscribeRideRef.current) unsubscribeRideRef.current(); }
    return () => { if (unsubscribeRideRef.current) unsubscribeRideRef.current(); };
  }, [rideId, role]);

  // Driver: Listen for pending rides assigned to me
  useEffect(() => {
      if (role === 'driver' && isOnlineAsDriver && !activeRide && user) {
          const q = query(
              collection(db, "rides"), 
              where("notifiedDriverId", "==", user.uid), 
              where("status", "==", "pending"), 
              limit(1)
          );
          unsubscribePendingRideRef.current = onSnapshot(q, (snapshot) => {
              if (!snapshot.empty) {
                  const newRide = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Ride;
                  if (pendingRideForDriver?.id !== newRide.id) { setPendingRideForDriver(newRide); }
              } else {
                  if (driverVoiceState !== 'IDLE') { cleanupDriverVoiceState(); }
              }
          });
      } else { 
          if (unsubscribePendingRideRef.current) unsubscribePendingRideRef.current(); 
          if (driverVoiceState !== 'IDLE') { cleanupDriverVoiceState(); }
      }
      return () => { if (unsubscribePendingRideRef.current) unsubscribePendingRideRef.current(); }
  }, [role, isOnlineAsDriver, activeRide, user, driverVoiceState, pendingRideForDriver, cleanupDriverVoiceState]);


  const handleRequestRide = async (finalDestination?: string, mode?: 'cab' | 'auto' | 'bike', priceEstimate?: number) => {
    const destinationToUse = finalDestination || destination;
    if (!user || !location || !destinationToUse) return;
    setIsRequesting(true);
    try {
      const rideDocRef = await addDoc(collection(db, "rides"), {
        riderId: user.uid, riderName: userProfile?.name || "Rider",
        pickupLocation: { latitude: location.lat, longitude: location.lng },
        destinationAddress: destinationToUse, status: "pending", requestedAt: serverTimestamp(),
        mode, priceEstimate, declinedBy: [],
      });
      setRideId(rideDocRef.id); setDestination("");
      speak("Your ride has been booked. We are finding a driver for you.");
      setVoiceDialogState({ status: 'IDLE' });
    } catch (error) { 
        setIsRequesting(false); 
        speak("Sorry, there was an error booking your ride. Please try again.");
        setVoiceDialogState({ status: 'ERROR', message: 'Failed to create ride doc.'});
    }
  }

  const handleCompleteRide = async () => {
      if (!rideId) return;
      await updateDoc(doc(db, "rides", rideId), { status: 'completed', completedAt: serverTimestamp() });
      setRideId(null); setActiveRide(null);
  };
  
  const handleCancelRide = async () => {
      if (!rideId) return;
      await updateDoc(doc(db, "rides", rideId), { status: 'cancelled' });
      setRideId(null); setActiveRide(null);
  };

  if (isEmergencyActive) { return <EmergencyScreen />; }
  
  const renderRiderUI = () => {
    if (activeRide) {
        return (
            <Card className="w-full">
                <CardHeader>
                    <CardTitle>Ride in Progress</CardTitle>
                    <CardDescription>
                        {activeRide.status === 'accepted' && `Your driver, ${activeRide.driverName}, is on the way.`}
                        {activeRide.status === 'in-progress' && `Heading to ${activeRide.destinationAddress}.`}
                        {activeRide.status === 'pending' && `Searching for a driver...`}
                        {activeRide.status === 'no_drivers_available' && `Sorry, no drivers were available.`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="destructive" onClick={handleCancelRide}>Cancel Ride</Button>
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
    if (pendingRideForDriver && driverVoiceState !== "IDLE") {
        return (
            <IncomingRideCard
                ride={pendingRideForDriver}
                onAccept={() => handleRideDecision(pendingRideForDriver, 'ACCEPT')}
                onDecline={() => handleRideDecision(pendingRideForDriver, 'DECLINE')}
                isListening={driverVoiceState === 'LISTENING_DECISION'}
            />
        )
    }
    if (activeRide) {
        return (
             <Card className="w-full">
                <CardHeader>
                    <CardTitle>Ride in Progress</CardTitle>
                    <CardDescription>
                       Destination: {activeRide.destinationAddress}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button className="w-full bg-green-500 hover:bg-green-600" onClick={handleCompleteRide}>Complete Ride</Button>
                    <Button variant="destructive" className="w-full mt-2" onClick={handleCancelRide}>Cancel Ride</Button>
                </CardContent>
            </Card>
        )
    }
    return (
        <div className="flex items-center space-x-2">
          <Switch id="driver-status" checked={isOnlineAsDriver} onCheckedChange={handleDriverStatusChange} />
          <Label htmlFor="driver-status">{isOnlineAsDriver ? "You are Online" : "Go Online to receive requests"}</Label>
        </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center bg-gradient-to-b from-black/20 to-transparent">
        <h1 className="text-xl font-bold text-white shadow-md flex items-center gap-2 font-headline"><NIAIcon className="w-6 h-6" /> NIA Rides</h1>
        <div className="flex items-center gap-2">
            {!isOnline && <div className="flex items-center gap-2 text-white bg-destructive/80 px-3 py-1 rounded-full text-sm"><WifiOff className="w-4 h-4" /> Offline</div>}
            <Link href="/settings" passHref><Button variant="ghost" size="icon" className="text-white hover:bg-white/20" aria-label="Settings"><Settings className="h-6 w-6" /></Button></Link>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" aria-label="Logout" onClick={logout}><LogOut className="h-6 w-6" /></Button>
        </div>
      </header>

      <main className="flex-grow relative">
        {locationError && <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-20 p-4 text-center"><Alert variant="destructive" className="max-w-md"><AlertTriangle className="h-4 w-4" /><AlertTitle>Location Error</AlertTitle><AlertDescription>{locationError}</AlertDescription></Alert></div>}
        {!location && !locationError && <div className="absolute inset-0 flex items-center justify-center bg-background z-20"><Loader2 className="h-8 w-8 animate-spin" /><p className="ml-4">Getting your location...</p></div>}
        
        {/* Placeholder for the map */}
        <div className="flex items-center justify-center h-full bg-muted">
            <div className="text-center p-8">
                <Car className="mx-auto h-12 w-12 text-muted-foreground" />
                <h2 className="mt-4 text-xl font-semibold">Map System Removed</h2>
                <p className="mt-2 text-muted-foreground">The map will be rebuilt here.</p>
            </div>
        </div>
      </main>

      <footer className="p-4 border-t bg-background shadow-lg z-10">
        <div className="container mx-auto max-w-4xl">
            {role === 'rider' ? renderRiderUI() : renderDriverUI()}
        </div>
      </footer>
    </div>
  );
}
