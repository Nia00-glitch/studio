
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Settings, Shield, Mic, CheckCircle, WifiOff, AlertTriangle, LogOut, Loader2, Car, MapPin, Search } from "lucide-react";
import { useEmergencyContext } from "@/contexts/EmergencyContext";
import { useAuth } from "@/contexts/AuthContext";
import EmergencyScreen from "@/components/EmergencyScreen";
import { Button } from "@/components/ui/button";
import { NIAIcon } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { doc, setDoc, deleteDoc, serverTimestamp, onSnapshot, collection, query, addDoc, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import dynamic from 'next/dynamic';
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

// Dynamically import the MapComponent to avoid SSR issues with the Google Maps API
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full bg-muted"><Loader2 className="h-8 w-8 animate-spin" /></div>,
});


// This component will contain the UI for both Rider and Driver homes
export default function HomeClient({ role }: { role: 'rider' | 'driver' }) {
  const { isEmergencyActive, triggerEmergency, isOnline } = useEmergencyContext();
  const { logout, user, userProfile } = useAuth();
  const { toast } = useToast();
  
  // State for map and location
  const [isOnlineAsDriver, setIsOnlineAsDriver] = useState(false);
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [drivers, setDrivers] = useState<{ driver_id: string; latitude: number; longitude: number; }[]>([]);

  // State for ride request
  const [destination, setDestination] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);


  // Function to handle driver going online/offline
  const handleDriverStatusChange = async (isOnline: boolean) => {
    if (!user) return;
    setIsOnlineAsDriver(isOnline);

    if (isOnline) {
      toast({ title: "Going online..." });
      // Get initial location
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ lat: latitude, lng: longitude });
          await updateDriverLocation(latitude, longitude);
          
          // Start interval to update location
          if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
          locationIntervalRef.current = setInterval(() => {
            navigator.geolocation.getCurrentPosition(pos => {
                updateDriverLocation(pos.coords.latitude, pos.coords.longitude);
            });
          }, 10000); // 10 seconds
          toast({ title: "You are online!", description: "Your location is now visible to nearby riders." });
        },
        (error) => {
          setLocationError("Location permission denied. Please enable it in your browser settings.");
          setIsOnlineAsDriver(false);
        }
      );
    } else {
      toast({ title: "Going offline..." });
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
      await deleteDoc(doc(db, "driver_locations", user.uid));
      toast({ title: "You are offline." });
    }
  };

  const updateDriverLocation = async (lat: number, lng: number) => {
    if (!user) return;
    await setDoc(doc(db, "driver_locations", user.uid), {
      driver_id: user.uid,
      latitude: lat,
      longitude: lng,
      timestamp: serverTimestamp(),
    });
  };

  // Effect for rider to get their location and watch for drivers
  useEffect(() => {
    if (role === 'rider') {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
          setLocationError(null);
        },
        () => {
          setLocationError("Could not get your location. Please enable location services.");
        }
      );
      
      const q = query(collection(db, "driver_locations"));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const driversData: any[] = [];
        querySnapshot.forEach((doc) => {
          driversData.push(doc.data());
        });
        setDrivers(driversData);
      });
      return () => unsubscribe();
    }
  }, [role]);


  const handleRequestRide = async () => {
    if (!user || !location || !destination) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please ensure location is enabled and a destination is set.'});
      return;
    }

    setIsRequesting(true);
    toast({ title: "Requesting Ride...", description: "Finding a driver near you." });

    try {
      await addDoc(collection(db, "rides"), {
        riderId: user.uid,
        pickupLocation: {
          latitude: location.lat,
          longitude: location.lng,
        },
        destinationAddress: destination, // In a real app, you'd geocode this to lat/lng
        status: "pending",
        requestedAt: serverTimestamp(),
      });

      // UI would now transition to a "waiting for driver" state.
      // For now, we just show a success message.
      toast({ title: "Ride Requested!", description: "We are connecting you with a nearby driver." });
      setDestination("");
    } catch (error) {
      console.error("Error requesting ride: ", error);
      toast({ variant: "destructive", title: "Request Failed", description: "Could not request a ride at this time." });
    } finally {
      setIsRequesting(false);
    }
  }


  // Cleanup effect
  useEffect(() => {
    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
    };
  }, []);

  const handleActivateEmergency = () => {
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
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center bg-gradient-to-b from-black/20 to-transparent">
        <h1 className="text-xl font-bold text-white shadow-md flex items-center gap-2"><NIAIcon className="w-6 h-6" /> Safety Rides Connect</h1>
        <div className="flex items-center gap-2">
            {!isOnline && <div className="flex items-center gap-2 text-white bg-destructive/80 px-3 py-1 rounded-full text-sm"><WifiOff className="w-4 h-4" /> Offline</div>}
            <Link href="/settings" passHref>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" aria-label="Settings">
                    <Settings className="h-6 w-6" />
                </Button>
            </Link>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" aria-label="Logout" onClick={logout}>
                <LogOut className="h-6 w-6" />
            </Button>
        </div>
      </header>

      <main className="flex-grow relative">
        {locationError && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-20 p-4 text-center">
                <Alert variant="destructive" className="max-w-md">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Location Error</AlertTitle>
                    <AlertDescription>{locationError}</AlertDescription>
                </Alert>
             </div>
        )}
        {!location && !locationError && (
             <div className="absolute inset-0 flex items-center justify-center bg-background z-20">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-4">Getting your location...</p>
            </div>
        )}
        {location && (
            <MapComponent center={location} role={role} drivers={drivers} />
        )}
      </main>

      <footer className="p-4 border-t bg-background shadow-lg z-10">
        <div className="container mx-auto max-w-4xl">
            {role === 'driver' && (
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Switch id="online-status" checked={isOnlineAsDriver} onCheckedChange={handleDriverStatusChange} />
                        <Label htmlFor="online-status" className="text-lg font-bold">{isOnlineAsDriver ? "You are Online" : "You are Offline"}</Label>
                    </div>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button size="lg" className="gap-2 bg-primary/90 hover:bg-primary text-primary-foreground rounded-full px-8 text-lg">
                                <Shield className="h-6 w-6" />
                                Manual Activation
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>This will immediately notify your emergency contacts and activate safety protocols.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleActivateEmergency} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                <AlertTriangle className="mr-2 h-4 w-4" /> Activate
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            )}

            {role === 'rider' && (
                <div className="text-center space-y-4">
                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Where to?"
                            className="w-full max-w-sm pl-10 pr-4 py-6 text-lg"
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                        />
                    </div>

                    <Button 
                        size="lg" 
                        className="w-full max-w-sm text-lg py-6"
                        onClick={handleRequestRide}
                        disabled={!destination || isRequesting}
                    >
                        {isRequesting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                        Confirm Ride
                    </Button>

                     <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground">
                        <Mic className="h-5 w-5 text-accent animate-pulse" />
                        <span>Say "NIA help" for emergencies</span>
                    </div>
                </div>
            )}
        </div>
      </footer>
    </div>
  );
}
