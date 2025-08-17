
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Settings, Shield, Mic, WifiOff, AlertTriangle, LogOut, Loader2, Search, Car, User, Clock, CheckCircle, XCircle, MapPin, DollarSign } from "lucide-react";
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
import { doc, setDoc, deleteDoc, serverTimestamp, onSnapshot, collection, query, where, addDoc, updateDoc, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import dynamic from 'next/dynamic';
import type { Ride } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const RideRequestCard = dynamic(() => import('@/components/RideRequestCard'), {
  ssr: false,
  loading: () => <Skeleton className="w-full max-w-md h-[480px] mx-auto rounded-3xl" />,
});

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full bg-muted"><Loader2 className="h-8 w-8 animate-spin" /></div>,
});

const LOCATION_STREAMING_INTERVAL = 5000;
const IDLE_LOCATION_UPDATE_INTERVAL = 4000;

export default function HomeClient({ role }: { role: 'rider' | 'driver' }) {
  const { 
    isEmergencyActive, 
    triggerEmergency, 
    isOnline, 
    voiceCommandState,
    setVoiceCommandState,
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

  // --- Voice Command Handling Logic ---
  useEffect(() => {
    const { status, lastAction } = voiceCommandState;
    if (status === 'awaiting_confirmation' && lastAction) {
        switch (lastAction.intent) {
            case 'RIDE_REQUEST':
                // The AI has parsed a ride request, now we wait for user's "Yes" or "No"
                // The UI can show a confirmation dialog here. For now, we listen.
                break;
            case 'SOS_REQUEST':
                triggerEmergency({ silent: true }); // AI already spoke, trigger silently
                setVoiceCommandState({ status: 'idle' });
                break;
            case 'CANCEL_RIDE':
                if (activeRide) {
                    handleCancelRide();
                }
                setVoiceCommandState({ status: 'idle' });
                break;
            case 'CONFIRMATION_YES':
                const previousAction = voiceCommandState.lastAction;
                if (previousAction?.intent === 'RIDE_REQUEST' && previousAction.entities.destination) {
                    setDestination(previousAction.entities.destination);
                    // Use a timeout to allow state to update before triggering request
                    setTimeout(() => handleRequestRide(previousAction.entities.destination as string), 100);
                }
                setVoiceCommandState({ status: 'idle' });
                break;
            case 'CONFIRMATION_NO':
                setVoiceCommandState({ status: 'idle', message: 'OK, cancelling.' });
                break;
            default:
                // For UNKNOWN intent, just reset to idle. The AI gives feedback.
                setVoiceCommandState({ status: 'idle' });
                break;
        }
    }
  }, [voiceCommandState, activeRide, triggerEmergency, setVoiceCommandState]); // Re-run this logic whenever the voice state changes


  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser."); return;
    }
    const handleSuccess = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      setLocation({ lat: latitude, lng: longitude }); setLocationError(null);
      if (role === 'driver' && isOnlineAsDriver && !activeRide) {
        debouncedUpdateDriverLocation(latitude, longitude);
      }
    };
    const handleError = (error: GeolocationPositionError) => {
      setLocationError("Location permission denied. Please enable it to use the app.");
    };
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

  useEffect(() => {
      if (role === 'driver' && isOnlineAsDriver && !activeRide) {
          const q = query(collection(db, "rides"), where("notifiedDriverId", "==", user?.uid), where("status", "==", "pending"), limit(1));
          unsubscribePendingRideRef.current = onSnapshot(q, (snapshot) => {
              if (!snapshot.empty) setPendingRideForDriver({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Ride);
              else setPendingRideForDriver(null);
          });
      } else { if (unsubscribePendingRideRef.current) unsubscribePendingRideRef.current(); setPendingRideForDriver(null); }
      return () => { if (unsubscribePendingRideRef.current) unsubscribePendingRideRef.current(); }
  }, [role, isOnlineAsDriver, activeRide, user]);


  const handleRequestRide = async (finalDestination?: string) => {
    const destinationToUse = finalDestination || destination;
    if (!user || !location || !destinationToUse) return;
    setIsRequesting(true);
    try {
      const rideDocRef = await addDoc(collection(db, "rides"), {
        riderId: user.uid, riderName: userProfile?.name || "Rider",
        pickupLocation: { latitude: location.lat, longitude: location.lng },
        destinationAddress: destinationToUse, status: "pending", requestedAt: serverTimestamp(),
      });
      setRideId(rideDocRef.id); setDestination("");
    } catch (error) { setIsRequesting(false); }
  }

  const handleRideDecision = async (rideId: string, decision: 'accepted' | 'declined') => {
      if (!user) return;
      const rideDocRef = doc(db, "rides", rideId);
      if (decision === 'accepted') {
          try {
              await updateDoc(rideDocRef, {
                  status: 'accepted', driverId: user.uid, driverName: userProfile?.name || 'Driver', acceptedAt: serverTimestamp(),
              });
              setRideId(rideId); setPendingRideForDriver(null);
          } catch (error) { toast({ variant: 'destructive', title: "Error", description: "Could not accept ride." }); }
      } else { setPendingRideForDriver(null); }
  };

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
    if (pendingRideForDriver) {
        return (
            <RideRequestCard 
                ride={pendingRideForDriver} 
                onAccept={() => handleRideDecision(pendingRideForDriver.id, 'accepted')}
                onDecline={() => handleRideDecision(pendingRideForDriver.id, 'declined')}
            />
        )
    }
    if (activeRide) {
        return (
             <Card className="w-full">
                <CardHeader>
                    <CardTitle>Ride in Progress</CardTitle>
                    <CardDescription>
                       Pickup: {activeRide.pickupLocation.address || '...'} <br/>
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

  const getMapPropsForRole = useCallback(() => {
    if (role === 'rider' && activeRide && ['accepted', 'in-progress'].includes(activeRide.status)) {
        return { center: location, activeRide: activeRide, role: 'rider' as const };
    }
    return { center: location, drivers: role === 'rider' ? drivers : [], role: role };
  }, [role, activeRide, location, drivers]);

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
        {location && <MapComponent {...getMapPropsForRole()} />}
      </main>

      <footer className="p-4 border-t bg-background shadow-lg z-10">
        <div className="container mx-auto max-w-4xl">
            {role === 'rider' ? renderRiderUI() : renderDriverUI()}
        </div>
      </footer>
    </div>
  );
}
