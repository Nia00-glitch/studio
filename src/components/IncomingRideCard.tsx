
"use client";

import React from "react";
import type { Ride } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Car, Clock, DollarSign, MapPin, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface IncomingRideCardProps {
    ride: Ride;
    onAccept: () => void;
    onDecline: () => void;
    isListening: boolean;
}

const IncomingRideCard = ({ ride, onAccept, onDecline, isListening }: IncomingRideCardProps) => {
    const pickupAddress = ride.pickupLocation?.address || 'Pickup Location';
    const destinationAddress = ride.destinationAddress || 'Destination';
    const estimatedFare = ride.priceEstimate || 0;

    return (
        <Card className="w-full max-w-md mx-auto bg-card shadow-2xl rounded-3xl border-none animate-in fade-in-50 slide-in-from-bottom-10 duration-500">
            <CardHeader className="p-6 pb-4 text-center">
                <CardTitle className="text-3xl font-bold font-headline">New Ride Request</CardTitle>
                <CardDescription className="text-muted-foreground text-base">
                    A rider is waiting for pickup.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                {/* Route Info */}
                <div className="flex items-start space-x-4">
                    <div className="flex flex-col items-center h-full">
                        <div className="flex-shrink-0 grid place-content-center bg-primary/10 rounded-xl w-12 h-12">
                            <MapPin className="w-7 h-7 text-primary" />
                        </div>
                        <div className="flex-grow w-px bg-border my-2" />
                        <div className="flex-shrink-0 grid place-content-center bg-accent/10 rounded-xl w-12 h-12">
                            <Car className="w-7 h-7 text-accent" />
                        </div>
                    </div>
                    <div className="flex flex-col justify-between h-full pt-1.5 pb-2">
                        <div>
                            <p className="text-xs text-muted-foreground">PICKUP</p>
                            <p className="font-semibold text-lg">{pickupAddress}</p>
                        </div>
                        <div className="mt-4">
                            <p className="text-xs text-muted-foreground">DESTINATION</p>
                            <p className="font-semibold text-lg">{destinationAddress}</p>
                        </div>
                    </div>
                </div>

                {/* Ride Details */}
                 <div className="flex items-center justify-center bg-muted/50 rounded-xl p-4 space-x-2">
                    <DollarSign className="w-6 h-6 text-muted-foreground" />
                    <span className="font-semibold text-2xl">₹{estimatedFare}</span>
                </div>
                
                {/* Mic Indicator */}
                <div className={cn(
                    "flex items-center justify-center gap-2 text-sm text-muted-foreground transition-all",
                    isListening ? "opacity-100" : "opacity-0"
                )}>
                    <Mic className="w-5 h-5 text-primary animate-pulse" />
                    <span>Listening...</span>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                    <Button variant="outline" size="lg" className="h-14 text-lg rounded-xl border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={onDecline}>
                        Decline
                    </Button>
                    <Button size="lg" className="h-14 text-lg rounded-xl bg-green-500 hover:bg-green-600" onClick={onAccept}>
                        Accept
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default React.memo(IncomingRideCard);

    