
"use client";

import React, { useEffect, useState, memo } from 'react';
import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import type { Ride } from '@/lib/types';
import { CarIcon } from 'lucide-react';

interface MapComponentProps {
    center: { lat: number; lng: number } | null;
    drivers?: { driver_id: string; latitude: number; longitude: number; }[];
    activeRide?: Ride | null;
    role: 'rider' | 'driver';
}

const mapStyles: google.maps.MapTypeStyle[] = [
    { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
    {
        featureType: 'administrative.locality',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#d59563' }],
    },
    {
        featureType: 'poi',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#d59563' }],
    },
    {
        featureType: 'poi.park',
        elementType: 'geometry',
        stylers: [{ color: '#263c3f' }],
    },
    {
        featureType: 'poi.park',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#6b9a76' }],
    },
    {
        featureType: 'road',
        elementType: 'geometry',
        stylers: [{ color: '#38414e' }],
    },
    {
        featureType: 'road',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#212a37' }],
    },
    {
        featureType: 'road',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#9ca5b3' }],
    },
    {
        featureType: 'road.highway',
        elementType: 'geometry',
        stylers: [{ color: '#746855' }],
    },
    {
        featureType: 'road.highway',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#1f2835' }],
    },
    {
        featureType: 'road.highway',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#f3d19c' }],
    },
    {
        featureType: 'transit',
        elementType: 'geometry',
        stylers: [{ color: '#2f3948' }],
    },
    {
        featureType: 'transit.station',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#d59563' }],
    },
    {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: '#17263c' }],
    },
    {
        featureType: 'water',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#515c6d' }],
    },
    {
        featureType: 'water',
        elementType: 'labels.text.stroke',
        stylers: [{ color: '#17263c' }],
    },
];

const MapComponent = ({ center, drivers = [], activeRide, role }: MapComponentProps) => {
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

    useEffect(() => {
        if (!activeRide || !['accepted', 'in-progress'].includes(activeRide.status)) {
            setDirections(null);
            return;
        }

        const directionsService = new window.google.maps.DirectionsService();
        const directionsRenderer = new window.google.maps.DirectionsRenderer({
            suppressMarkers: true, // We use our own AdvancedMarkers
            polylineOptions: {
                strokeColor: '#f56565', // Red color for the route
                strokeOpacity: 0.8,
                strokeWeight: 5,
            },
        });

        const origin = activeRide.pickupLocation;
        const destination = activeRide.destinationAddress; // Assuming this is a geocodable string

        directionsService.route(
            {
                origin: new google.maps.LatLng(origin.latitude, origin.longitude),
                destination: destination,
                travelMode: google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
                if (status === google.maps.DirectionsStatus.OK) {
                    setDirections(result);
                } else {
                    console.error(`error fetching directions ${result}`);
                }
            }
        );

        // This part is a bit tricky with react-google-maps v1.
        // In a real app we'd likely need to manage the map instance itself to add the renderer.
        // For now, this state is ready for a component that can render it.

    }, [activeRide]);

    if (!center) return null;

    const defaultProps = {
        center: center,
        zoom: 15,
        mapId: '15d7ba67048f63a6', // Custom Map ID from GCP
        disableDefaultUI: true,
    };

    return (
        <Map {...defaultProps}>
            <AdvancedMarker position={center} title="Your Location">
                <Pin
                    background={'hsl(var(--primary))'}
                    borderColor={'hsl(var(--primary))'}
                    glyphColor={'hsl(var(--primary-foreground))'}
                />
            </AdvancedMarker>

            {role === 'rider' && !activeRide && drivers.map((driver) => (
                <AdvancedMarker
                    key={driver.driver_id}
                    position={{ lat: driver.latitude, lng: driver.longitude }}
                    title={`Driver ${driver.driver_id}`}
                >
                    <div className="bg-background p-1 rounded-full shadow-lg">
                        <CarIcon className="h-6 w-6 text-foreground" />
                    </div>
                </AdvancedMarker>
            ))}

            {activeRide && activeRide.driverLive && (
                <AdvancedMarker
                    position={{ lat: activeRide.driverLive.lat, lng: activeRide.driverLive.lng }}
                    title="Your Driver"
                >
                     <div className="bg-accent p-2 rounded-full shadow-lg animate-pulse">
                        <CarIcon className="h-6 w-6 text-accent-foreground" />
                    </div>
                </AdvancedMarker>
            )}

        </Map>
    );
};

export default memo(MapComponent);
