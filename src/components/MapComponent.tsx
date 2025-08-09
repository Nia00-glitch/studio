
"use client";
import React from 'react';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';
import { Loader2 } from 'lucide-react';
import { NIAIcon } from './icons';

const containerStyle = {
  width: '100%',
  height: '100%',
};

// Disable default UI and custom map styles for a clean look
const mapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    styles: [
        { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
        { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
        { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
        { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
        { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
        { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
        { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
        { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
        { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
        { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
        { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
        { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
        { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
        { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
        { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
    ],
};


interface MapComponentProps {
  center: { lat: number; lng: number };
  drivers?: { driver_id: string; latitude: number; longitude: number; }[];
  role: 'rider' | 'driver';
}

function MapComponent({ center, drivers = [], role }: MapComponentProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  if (loadError) {
    return <div className="flex items-center justify-center h-full bg-destructive/10 text-destructive">Error loading maps. Please check your API key.</div>;
  }

  if (!isLoaded) {
    return <div className="flex items-center justify-center h-full bg-muted"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  // Custom icon for drivers
  const driverIcon = {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#FF4136" width="48px" height="48px"><path d="M0 0h24v24H0z" fill="none"/><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11C5.84 5 5.28 5.42 5.08 6.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5S18.33 16 17.5 16zM5 11l1.5-4.5h11L19 11H5z"/></svg>'
    ),
    scaledSize: new window.google.maps.Size(40, 40),
    anchor: new window.google.maps.Point(20, 20),
  };

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={15}
      options={mapOptions}
    >
        {/* Rider/User's own location marker */}
        <MarkerF 
            position={center} 
            title={role === 'rider' ? "Your Location" : "My Location"}
            icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: "#4285F4", // A distinct blue for the user
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "white",
            }}
            zIndex={10} // Ensure user's marker is on top
        />
        
        {/* Render driver markers (only for riders) */}
        {role === 'rider' && drivers.map(driver => (
            <MarkerF 
                key={driver.driver_id} 
                position={{ lat: driver.latitude, lng: driver.longitude }} 
                title="Driver"
                icon={driverIcon}
            />
        ))}

    </GoogleMap>
  );
}

// PERF FIX: Memoize the MapComponent to prevent it from re-rendering
// when its parent component's state changes for reasons unrelated to the map.
// This is a critical optimization for apps with maps.
export default React.memo(MapComponent);
