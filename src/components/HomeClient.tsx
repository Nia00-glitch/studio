
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

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full bg-muted"><Loader2 className="h-8 w-8 animate-spin" /></div>,
});

const LOCATION_STREAMING_INTERVAL = 5000; // 5 seconds

// World-class Ride Request Card Component
const RideRequestCard = ({ ride, onAccept, onDecline }: { ride: Ride, onAccept: () => void, onDecline: () => void }) => {
  // Mock data for display purposes, can be replaced with real data from `ride` prop
  const pickupAddress = ride.pickupLocation?.address || '1055 Market St';
  const destinationAddress = ride.destinationAddress || 'San Francisco Ferry Building';
  const timeToPickup = '2 min';
  const estimatedFare = '24.80';

  return (
    <Card className="w-full max-w-md mx-auto bg-card shadow-2xl rounded-3xl border-none">
      <CardHeader className="p-6 pb-4">
        <CardTitle className="text-3xl font-bold">Ride request</CardTitle>
        <CardDescription className="text-muted-foreground text-base">A customer is waiting for a ride.</CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Route Info */}
        <div className="flex items-start space-x-4">
          <div className="flex flex-col items-center h-full">
            <div className="flex-shrink-0 grid place-content-center bg-orange-500 rounded-xl w-12 h-12">
              <Car className="w-7 h-7 text-white" />
            </div>
            <div className="flex-grow w-px bg-border my-2" />
            <MapPin className="w-7 h-7 text-foreground" />
          </div>
          <div className="flex flex-col justify-between h-full pt-1.5 pb-2">
            <p className="font-semibold text-lg">{pickupAddress}</p>
            <p className="font-semibold text-lg mt-8">{destinationAddress}</p>
          </div>
        </div>

        {/* Ride Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-center bg-muted/50 rounded-xl p-3 space-x-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <span className="font-semibold text-lg">{timeToPickup}</span>
          </div>
          <div className="flex items-center justify-center bg-muted/50 rounded-xl p-3 space-x-2">
            <DollarSign className="w-5 h-5 text-muted-foreground" />
            <span className="font-semibold text-lg">{estimatedFare}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <Button variant="outline" size="lg" className="h-14 text-lg rounded-xl border-2" onClick={onDecline}>
            Decline
          </Button>
          <Button size="lg" className="h-14 text-lg rounded-xl" onClick={onAccept}>
            Accept
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};


export default function HomeClient({ role }: { role: 'rider' | 'driver' }) {
  const { isEmergencyActive, triggerEmergency, isOnline } = useEmergencyContext();
  const { logout, user, userProfile } = useAuth();
  const { toast } = useToast();
  
  const [isOnlineAsDriver, setIsOnlineAsDriver] = useState(false);
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const generalLocationWatcherRef = useRef<number | null>(null);

  const [drivers, setDrivers] = useState<{ driver_id: string; latitude: number; longitude: number; }[]>([]);
  const [destination, setDestination] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);

  // State for active ride tracking
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [rideId, setRideId] = useState<string | null>(null);
  const [pendingRideForDriver, setPendingRideForDriver] = useState<Ride | null>(null);
  const unsubscribeRideRef = useRef<(() => void) | null>(null);
  const unsubscribePendingRideRef = useRef<(() => void) | null>(null);
  
  // Real-time location watching effect
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    const handleSuccess = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      const newLocation = { lat: latitude, lng: longitude };
      setLocation(newLocation);
      setLocationError(null);

      // If driver is online AND NOT in a ride, broadcast location globally
      if (role === 'driver' && isOnlineAsDriver && !activeRide) {
        updateDriverLocation(latitude, longitude);
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      let message = "An unknown error occurred while fetching location.";
      if (error.code === error.PERMISSION_DENIED) {
        message = "Location permission denied. Please enable it in your browser settings to use the app.";
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        message = "Location information is unavailable.";
      } else if (error.code === error.TIMEOUT) {
        message = "The request to get user location timed out.";
      }
      setLocationError(message);
      toast({ variant: 'destructive', title: "Location Error", description: message });
    };
    
    // Use high accuracy for drivers, standard for riders
    const options = { enableHighAccuracy: role === 'driver', timeout: 10000, maximumAge: 0 };
    generalLocationWatcherRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, options);

    return () => {
      if (generalLocationWatcherRef.current !== null) {
        navigator.geolocation.clearWatch(generalLocationWatcherRef.current);
      }
    };
  }, [role, isOnlineAsDriver, activeRide, toast]);


  // Effect for streaming DRIVER'S location to an ACTIVE RIDE document
  useEffect(() => {
    let watcherId: number | null = null;
    let lastUpdateTime = 0;

    // Only run this effect if you are a driver with an active ride that is 'accepted' or 'in-progress'
    if (role === 'driver' && activeRide && ['accepted', 'in-progress'].includes(activeRide.status)) {
      const rideDocRef = doc(db, "rides", activeRide.id);

      const handleSuccess = (position: GeolocationPosition) => {
        const now = Date.now();
        // Throttle Firestore writes to avoid excessive usage
        if (now - lastUpdateTime < LOCATION_STREAMING_INTERVAL) {
          return;
        }
        lastUpdateTime = now;
        
        const { latitude, longitude, heading } = position.coords;
        const driverLocationUpdate = {
            'driverLive.lat': latitude,
            'driverLive.lng': longitude,
            'driverLive.heading': heading ?? null,
            'driverLive.updatedAt': serverTimestamp(),
        };
        
        updateDoc(rideDocRef, driverLocationUpdate).catch(err => console.error("Failed to update driver live location", err));
      };

      const handleError = (error: GeolocationPositionError) => {
        console.error("Error watching position for active ride:", error.message);
        toast({ variant: 'destructive', title: "Location Stream Error", description: "Could not stream your location for the ride."});
      };
      
      watcherId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
        enableHighAccuracy: true,
        maximumAge: 0,
      });

      console.log(`Driver streaming location for ride ${activeRide.id} with watcher ID ${watcherId}`);

      // Stop broadcasting to global `driver_locations`
      if (user) {
        deleteDoc(doc(db, "driver_locations", user.uid));
      }
    }
    
    // Cleanup function: this runs when the dependencies change OR the component unmounts.
    return () => {
      if (watcherId !== null) {
        navigator.geolocation.clearWatch(watcherId);
        console.log(`Stopped streaming location for ride, cleared watcher ID ${watcherId}`);
      }
    };
  }, [role, activeRide, user, toast]);


  const handleDriverStatusChange = async (isOnline: boolean) => {
    if (!user || !location) {
        toast({variant: 'destructive', title: 'Location not available', description: 'Cannot go online without a valid location.'});
        return;
    };
    setIsOnlineAsDriver(isOnline);

    if (isOnline) {
      toast({ title: "Going online..." });
      await updateDriverLocation(location.lat, location.lng);
      toast({ title: "You are online!", description: "Your location is now visible." });
    } else {
      toast({ title: "Going offline..." });
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
    }, { merge: true });
  };
  
  // Effect for fetching nearby drivers (for rider)
  useEffect(() => {
    if (role === 'rider' && !activeRide) {
      const q = query(collection(db, "driver_locations"));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const driversData: any[] = [];
        querySnapshot.forEach((doc) => {
          driversData.push(doc.data());
        });
        setDrivers(driversData);
      });
      return () => unsubscribe();
    } else {
      setDrivers([]); // Clear drivers if in a ride
    }
  }, [role, activeRide]);

  // Effect to listen for ride updates (for both rider and driver)
  useEffect(() => {
    if (rideId) {
      const rideDocRef = doc(db, "rides", rideId);
      unsubscribeRideRef.current = onSnapshot(rideDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const rideData = { id: docSnap.id, ...docSnap.data() } as Ride;
          setActiveRide(rideData);
          if (rideData.status === 'pending' && role === 'rider') {
              setIsRequesting(true); // Keep UI in requesting state
          } else {
              setIsRequesting(false);
          }
        } else {
          setActiveRide(null);
          setRideId(null);
        }
      });
    } else {
        if (unsubscribeRideRef.current) {
            unsubscribeRideRef.current();
            unsubscribeRideRef.current = null;
        }
    }
    return () => {
        if (unsubscribeRideRef.current) {
            unsubscribeRideRef.current();
        }
    };
  }, [rideId, role]);

  // Effect for DRIVER to listen for new PENDING rides
  useEffect(() => {
      if (role === 'driver' && isOnlineAsDriver && !activeRide) {
          const q = query(collection(db, "rides"), where("notifiedDriverId", "==", user?.uid), where("status", "==", "pending"), limit(1));
          unsubscribePendingRideRef.current = onSnapshot(q, (snapshot) => {
              if (!snapshot.empty) {
                  const rideDoc = snapshot.docs[0];
                  setPendingRideForDriver({ id: rideDoc.id, ...rideDoc.data() } as Ride);
              } else {
                  setPendingRideForDriver(null);
              }
          });
      } else {
          if (unsubscribePendingRideRef.current) {
              unsubscribePendingRideRef.current();
              unsubscribePendingRideRef.current = null;
          }
          setPendingRideForDriver(null);
      }

      return () => {
          if (unsubscribePendingRideRef.current) {
              unsubscribePendingRideRef.current();
          }
      }
  }, [role, isOnlineAsDriver, activeRide, user]);


  const handleRequestRide = async () => {
    if (!user || !location || !destination) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please ensure location is enabled and a destination is set.'});
      return;
    }

    setIsRequesting(true);
    toast({ title: "Requesting Ride...", description: "Finding a driver near you." });

    try {
      const rideDocRef = await addDoc(collection(db, "rides"), {
        riderId: user.uid,
        riderName: userProfile?.name || "Unknown Rider",
        pickupLocation: {
          latitude: location.lat,
          longitude: location.lng,
        },
        destinationAddress: destination,
        status: "pending", // pending, accepted, in-progress, completed, cancelled
        requestedAt: serverTimestamp(),
      });
      setRideId(rideDocRef.id);
      setDestination("");
    } catch (error) {
      console.error("Error requesting ride: ", error);
      toast({ variant: "destructive", title: "Request Failed", description: "Could not request a ride at this time." });
      setIsRequesting(false);
    }
  }

  const handleRideDecision = async (rideId: string, decision: 'accepted' | 'declined') => {
      if (!user) return;
      const rideDocRef = doc(db, "rides", rideId);
      if (decision === 'accepted') {
          try {
              await updateDoc(rideDocRef, {
                  status: 'accepted',
                  driverId: user.uid,
                  driverName: userProfile?.name || 'Unknown Driver',
                  acceptedAt: serverTimestamp(),
              });
              setRideId(rideId);
              setPendingRideForDriver(null); // Stop listening for other rides
              toast({ title: "Ride Accepted!", description: "Please proceed to the pickup location." });
          } catch (error) {
              toast({ variant: 'destructive', title: "Error", description: "Could not accept the ride. It may have been taken." });
          }
      } else {
          // A declined ride should be findable by another driver. For now we just hide it locally.
          setPendingRideForDriver(null);
      }
  };

  const handleCompleteRide = async () => {
      if (!rideId) return;
      await updateDoc(doc(db, "rides", rideId), { status: 'completed', completedAt: serverTimestamp() });
      // Reset state for next ride
      setRideId(null);
      setActiveRide(null);
      toast({ title: "Ride Completed!", description: "Thank you for using Safety Rides Connect." });
  };
  
  const handleCancelRide = async () => {
      if (!rideId) return;
      await updateDoc(doc(db, "rides", rideId), { status: 'cancelled' });
      setRideId(null);
      setActiveRide(null);
      toast({ title: "Ride Cancelled" });
  };


  useEffect(() => {
    return () => {
      if (generalLocationWatcherRef.current !== null) {
        navigator.geolocation.clearWatch(generalLocationWatcherRef.current);
      }
      if (unsubscribeRideRef.current) unsubscribeRideRef.current();
      if (unsubscribePendingRideRef.current) unsubscribePendingRideRef.current();
    };
  }, []);

  const handleActivateEmergency = () => {
    toast({
      title: "Emergency Mode Activated",
      description: "Activating safety protocols.",
    });
    triggerEmergency();
  };

  if (isEmergencyActive) {
    return <EmergencyScreen />;
  }
  
  const renderRiderStatus = () => {
    if (!activeRide) return null;
    let statusText = "";
    let statusIcon = <Loader2 className="h-5 w-5 animate-spin" />;
    
    switch(activeRide.status) {
        case 'pending':
            statusText = "Finding a driver...";
            break;
        case 'accepted':
            statusText = `${activeRide.driverName} is on their way!`;
            statusIcon = <Car className="h-5 w-5 text-green-500" />;
            break;
        case 'in-progress':
            statusText = `On your way to the destination.`;
            statusIcon = <Car className="h-5 w-5 text-blue-500" />;
            break;
        case 'completed':
        case 'cancelled':
             // Reset state after a moment to clear the UI
            setTimeout(() => {
                setActiveRide(null);
                setRideId(null);
            }, 5000);
            statusText = activeRide.status === 'completed' ? "Ride Completed!" : "Ride Cancelled";
            statusIcon = activeRide.status === 'completed' ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />;
            return (
                <Card className="w-full max-w-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                            {statusIcon}
                            <span>{statusText}</span>
                        </CardTitle>
                    </CardHeader>
                </Card>
            )
        default:
             return null;
    }

    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {statusIcon}
            <span>{statusText}</span>
          </CardTitle>
          <CardDescription>
            {activeRide.status === 'accepted' ? 'Your driver will arrive shortly.' : 'Please wait while we connect you.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Button variant="destructive" className="w-full" onClick={handleCancelRide}>Cancel Ride</Button>
        </CardContent>
      </Card>
    )
  };
  
  const renderDriverStatus = () => {
      if (!activeRide) return null;

      let statusText = "";
      let statusIcon = <Car className="h-5 w-5" />;
      let description = `Pickup: ${activeRide.riderName}. Destination: ${activeRide.destinationAddress}`;
      let actionButton = null;

      switch(activeRide.status) {
          case 'accepted':
              statusText = "Ride Accepted";
              statusIcon = <CheckCircle className="h-5 w-5 text-green-500" />;
              actionButton = <Button className="w-full" onClick={() => updateDoc(doc(db, "rides", activeRide.id), { status: 'in-progress' })}>Start Ride</Button>;
              break;
          case 'in-progress':
              statusText = "Ride In Progress";
              statusIcon = <Clock className="h-5 w-5 text-blue-500 animate-pulse" />;
              actionButton = <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleCompleteRide}>Complete Ride</Button>;
              break;
          default:
              return null; // No card for pending, completed, etc. on driver side for now
      }

      return (
        <Card className="w-full max-w-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-3">{statusIcon} {statusText}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                {actionButton}
            </CardContent>
        </Card>
      )
  };

  const getMapPropsForRole = useCallback(() => {
    // Rider in an active ride
    if (role === 'rider' && activeRide && ['accepted', 'in-progress'].includes(activeRide.status)) {
        return {
            center: location, // Rider's own location is the center
            activeRide: activeRide, // Pass the whole ride object
            role: 'rider'
        };
    }
    
    // Default for rider (no active ride) or driver
    return {
        center: location,
        drivers: role === 'rider' ? drivers : [],
        role: role
    };
  }, [role, activeRide, location, drivers]);

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
            <MapComponent {...getMapPropsForRole()} />
        )}
      </main>

      <footer className="p-4 border-t bg-background shadow-lg z-10">
        <div className="container mx-auto max-w-4xl">
            {role === 'driver' && (
                <div>
                  {!activeRide && pendingRideForDriver && (
                      <RideRequestCard 
                        ride={pendingRideForDriver} 
                        onAccept={() => handleRideDecision(pendingRideForDriver.id, 'accepted')} 
                        onDecline={() => handleRideDecision(pendingRideForDriver.id, 'declined')} 
                      />
                  )}

                  {!activeRide && !pendingRideForDriver && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                          <Switch id="online-status" checked={isOnlineAsDriver} onCheckedChange={handleDriverStatusChange} />
                          <Label htmlFor="online-status" className="text-lg font-bold">{isOnlineAsDriver ? "You are Online" : "You are Offline"}</Label>
                      </div>
                       <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button size="lg" className="gap-2 bg-destructive/90 hover:bg-destructive text-destructive-foreground rounded-full px-8 text-lg">
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

                  {activeRide && renderDriverStatus()}
                </div>
            )}

            {role === 'rider' && (
              activeRide ? renderRiderStatus() : (
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
                        {isRequesting ? 'Requesting...' : 'Confirm Ride'}
                    </Button>

                     <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground">
                        <Mic className="h-5 w-5 text-accent animate-pulse" />
                        <span>Say "NIA help" for emergencies</span>
                    </div>
                </div>
              )
            )}
        </div>
      </footer>
    </div>
  );
}
