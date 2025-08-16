
"use client";

import type { Ride } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Car, Clock, DollarSign, MapPin } from "lucide-react";

interface RideRequestCardProps {
    ride: Ride;
    onAccept: () => void;
    onDecline: () => void;
}

export default function RideRequestCard({ ride, onAccept, onDecline }: RideRequestCardProps) {
    const pickupAddress = ride.pickupLocation?.address || '1055 Market St';
    const destinationAddress = ride.destinationAddress || 'San Francisco Ferry Building';
    const timeToPickup = '2 min';
    const estimatedFare = '24.80';

    return (
        <Card className="w-full max-w-md mx-auto bg-card shadow-2xl rounded-3xl border-none">
        <CardHeader className="p-6 pb-4">
            <CardTitle className="text-3xl font-bold font-headline">New Ride Request</CardTitle>
            <CardDescription className="text-muted-foreground text-base">A rider is waiting for pickup.</CardDescription>
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
}
