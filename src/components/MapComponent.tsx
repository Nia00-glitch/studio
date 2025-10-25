"use client";

import React, { useEffect, useRef } from "react";

type Driver = { driver_id: string; latitude: number; longitude: number; };
type Props = {
  center: { lat: number; lng: number } | null;
  drivers?: Driver[];
  destination?: { lat: number; lng: number } | null;
  onMapLoaded?: (map: google.maps.Map) => void;
  followUser?: boolean;
};

export default function MapComponent({ center, drivers = [], destination = null, onMapLoaded, followUser = true }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current) return;
    if (!window?.google?.maps) {
      console.error("Google Maps JS API not loaded.");
      return;
    }
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: center ? { lat: center.lat, lng: center.lng } : { lat: 0, lng: 0 },
        zoom: center ? 15 : 2,
        streetViewControl: false,
        mapTypeControl: false,
      });
      if (onMapLoaded) onMapLoaded(mapInstanceRef.current);
    }
    // No cleanup of map instance; reuse.
  }, [onMapLoaded, center]);

  // Update center with debounce-ish behavior
  useEffect(() => {
    if (!mapInstanceRef.current || !center) return;
    // Only recenters if followUser true
    if (!followUser) return;
    const map = mapInstanceRef.current;
    // Smooth pan if available
    try {
      map.panTo({ lat: center.lat, lng: center.lng });
    } catch {
      map.setCenter({ lat: center.lat, lng: center.lng });
    }
  }, [center, followUser]);

  // Update destination marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const id = "__destination__";
    const existing = markersRef.current.get(id);
    if (!destination) {
      if (existing) { existing.setMap(null); markersRef.current.delete(id); }
      return;
    }
    if (existing) {
      existing.setPosition({ lat: destination.lat, lng: destination.lng });
    } else {
      const marker = new google.maps.Marker({
        position: { lat: destination.lat, lng: destination.lng },
        map,
        icon: {
          path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 5,
          fillColor: "#2b8cff",
          fillOpacity: 1,
          strokeWeight: 0,
        },
        title: "Destination",
      });
      markersRef.current.set(id, marker);
    }
  }, [destination]);

  // Sync drivers: add/update/remove markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google?.maps?.geometry) return;
    const seen = new Set<string>();
    for (const d of drivers) {
      seen.add(d.driver_id);
      const id = `driver:${d.driver_id}`;
      let m = markersRef.current.get(id);
      const pos = new google.maps.LatLng(d.latitude, d.longitude);
      if (m) {
        // Only update if position changed significantly
        const prev = m.getPosition();
        if (!prev || google.maps.geometry.spherical.computeDistanceBetween(prev, pos) > 5) {
          m.setPosition(pos);
        }
      } else {
        m = new google.maps.Marker({
          position: pos,
          map,
          title: `Driver ${d.driver_id}`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 5,
            fillColor: "#00C853",
            fillOpacity: 1,
            strokeWeight: 0,
          },
        });
        markersRef.current.set(id, m);
      }
    }
    // remove stale markers
    for (const key of Array.from(markersRef.current.keys())) {
      if (key.startsWith("driver:") && !seen.has(key.replace("driver:", ""))) {
        const marker = markersRef.current.get(key)!;
        marker.setMap(null);
        markersRef.current.delete(key);
      }
    }
  }, [drivers]);

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
