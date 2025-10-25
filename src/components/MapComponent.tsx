"use client";

import React, { useEffect, useRef } from "react";
import type { Ride } from "@/lib/types";

type Driver = { driver_id: string; latitude: number; longitude: number; };

type Props = {
  center: { lat: number; lng: number } | null;
  drivers?: Driver[];
  activeRide?: Ride | null;
  role: 'rider' | 'driver';
  onMapLoaded?: (map: google.maps.Map) => void;
  followUser?: boolean;
};

export default function MapComponent({ center, drivers = [], activeRide = null, role, onMapLoaded, followUser = true }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || !window?.google?.maps) {
      console.error("Map container or Google Maps API not ready.");
      return;
    }
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: center || { lat: 0, lng: 0 },
        zoom: center ? 15 : 2,
        streetViewControl: false,
        mapTypeControl: false,
        zoomControl: true,
      });
      if (onMapLoaded) onMapLoaded(mapInstanceRef.current);
    }
  }, [center, onMapLoaded]);

  // Update map center smoothly
  useEffect(() => {
    if (mapInstanceRef.current && center && followUser) {
      mapInstanceRef.current.panTo({ lat: center.lat, lng: center.lng });
    }
  }, [center, followUser]);

  const createOrUpdateMarker = (id: string, position: google.maps.LatLngLiteral, options: google.maps.MarkerOptions) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    let marker = markersRef.current.get(id);
    if (marker) {
      marker.setPosition(position);
    } else {
      marker = new window.google.maps.Marker({ ...options, position, map });
      markersRef.current.set(id, marker);
    }
  };

  // Sync driver markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || role !== 'rider' || activeRide) return; // Only show other drivers when rider is idle

    const seenDriverIds = new Set<string>();
    drivers.forEach(d => {
      seenDriverIds.add(d.driver_id);
      createOrUpdateMarker(`driver_${d.driver_id}`, { lat: d.latitude, lng: d.longitude }, {
        title: `Driver ${d.driver_id}`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: "#4CAF50",
          fillOpacity: 1,
          strokeWeight: 1,
          strokeColor: "#FFFFFF",
        }
      });
    });

    // Remove markers for drivers who went offline
    markersRef.current.forEach((_, key) => {
      if (key.startsWith('driver_') && !seenDriverIds.has(key.substring(7))) {
        markersRef.current.get(key)?.setMap(null);
        markersRef.current.delete(key);
      }
    });

  }, [drivers, role, activeRide]);


  // Sync active ride markers (rider, driver, destination)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !activeRide) {
        // Cleanup old ride markers if ride is cancelled/completed
        markersRef.current.get('ride_pickup')?.setMap(null);
        markersRef.current.get('ride_destination')?.setMap(null);
        markersRef.current.get('ride_driver')?.setMap(null);
        return;
    };

    const { pickupLocation, destinationLocation, driverLive, status } = activeRide;

    if (pickupLocation) {
        createOrUpdateMarker('ride_pickup', { lat: pickupLocation.latitude, lng: pickupLocation.longitude }, {
            title: 'Pickup',
            icon: {
                path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
                fillColor: '#4285F4',
                fillOpacity: 1,
                strokeWeight: 0,
                scale: 1.5,
                anchor: new google.maps.Point(12, 24),
            }
        });
    }

    if (destinationLocation) {
        createOrUpdateMarker('ride_destination', { lat: destinationLocation.latitude, lng: destinationLocation.longitude }, {
            title: 'Destination',
            icon: {
                path: google.maps.SymbolPath.FLAG,
                fillColor: '#EA4335',
                fillOpacity: 1,
                strokeWeight: 0,
                scale: 1.5,
            }
        });
    }

    if (driverLive && ['accepted', 'in-progress'].includes(status)) {
         createOrUpdateMarker('ride_driver', { lat: driverLive.lat, lng: driverLive.lng }, {
            title: 'Driver',
            icon: {
                path: 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11C5.84 5 5.28 5.42 5.08 6.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-1.33 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z',
                fillColor: '#34A853',
                fillOpacity: 1,
                strokeWeight: 0,
                scale: 1.5,
                anchor: new google.maps.Point(12, 12),
                rotation: driverLive.heading || 0
            }
        });
    } else {
        markersRef.current.get('ride_driver')?.setMap(null);
    }

  }, [activeRide]);

  return <div ref={mapRef} style={{ height: "100%", width: "100%" }} />;
}
