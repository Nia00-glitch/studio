
"use client";

import React, { useEffect, useState, memo } from 'react';
import { Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';
import type { Ride } from '@/lib/types';
import { CarIcon } from 'lucide-react';
import { motion } from 'framer-motion';

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
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
    { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
    { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
    { featureType: 'water',elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
    { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] },
];

const DirectionsRenderer = ({ activeRide }: { activeRide: Ride | null }) => {
    const map = useMap();
    const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);
    const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);

    useEffect(() => {
        if (!map) return;
        setDirectionsService(new window.google.maps.DirectionsService());
        setDirectionsRenderer(new window.google.maps.DirectionsRenderer({
            suppressMarkers: true,
            polylineOptions: { strokeColor: '#f56565', strokeWeight: 5, strokeOpacity: 0.8 },
        }));
    }, [map]);

    useEffect(() => {
        if (directionsRenderer) {
            directionsRenderer.setMap(map);
        }
    }, [map, directionsRenderer]);

    useEffect(() => {
        if (!directionsService || !directionsRenderer || !activeRide || !['accepted', 'in-progress'].includes(activeRide.status)) {
            directionsRenderer?.setDirections({routes: []}); // Clear route when ride is not active
            return;
        }

        let origin, destination;
        const pickupLatLng = new google.maps.LatLng(activeRide.pickupLocation.latitude, activeRide.pickupLocation.longitude);

        if (activeRide.status === 'accepted' && activeRide.driverLive) {
            origin = new google.maps.LatLng(activeRide.driverLive.lat, activeRide.driverLive.lng);
            destination = pickupLatLng;
        } else if (activeRide.status === 'in-progress' && activeRide.driverLive) {
            origin = new google.maps.LatLng(activeRide.driverLive.lat, activeRide.driverLive.lng);
            // In a real app, destinationAddress would be geocoded to a LatLng
            // For now, we'll just use the pickup location as a placeholder for the destination if it's a string
            destination = { query: activeRide.destinationAddress, location: pickupLatLng };
        } else {
            return;
        }
        
        // This is a temporary fix. In a real app, you would geocode the destinationAddress to get lat/lng
        if (typeof destination === 'string') {
             console.warn("Destination is a string, geocoding not implemented. Using placeholder.");
             destination = pickupLatLng; // Placeholder
        }


        directionsService.route({
            origin: origin,
            destination: destination,
            travelMode: google.maps.TravelMode.DRIVING,
        }, (result, status) => {
            if (status === google.maps.DirectionsStatus.OK && result) {
                directionsRenderer.setDirections(result);
            } else {
                console.error(`Error fetching directions: ${status}`);
            }
        });

    }, [activeRide, directionsService, directionsRenderer]);

    return null;
};

const MapComponent = ({ center, drivers = [], activeRide, role }: MapComponentProps) => {
    const map = useMap();

    useEffect(() => {
        if (!map || !activeRide || !activeRide.driverLive) return;
        
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(new google.maps.LatLng(center!.lat, center!.lng));
        bounds.extend(new google.maps.LatLng(activeRide.driverLive.lat, activeRide.driverLive.lng));
        
        map.fitBounds(bounds, 100); // 100px padding
    }, [map, activeRide, center]);

    if (!center) return null;

    const defaultProps = {
        center: center,
        zoom: 15,
        mapId: '15d7ba67048f63a6', // Custom Map ID from GCP
        disableDefaultUI: true,
        styles: mapStyles,
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
                    title={`Driver ${driver.driver_id.substring(0, 4)}`}
                >
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: Math.random() * 0.5 }}
                        className="bg-background p-1 rounded-full shadow-lg"
                    >
                        <CarIcon className="h-6 w-6 text-foreground" />
                    </motion.div>
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

            <DirectionsRenderer activeRide={activeRide} />
        </Map>
    );
};

export default memo(MapComponent);
