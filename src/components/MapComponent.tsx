
"use client";
import React from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { Loader2, Car } from 'lucide-react';

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

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={15}
      options={mapOptions}
    >
      {role === 'rider' && (
        <>
            <MarkerF position={center} title="Your Location" />
            {drivers.map(driver => (
                <MarkerF 
                    key={driver.driver_id} 
                    position={{ lat: driver.latitude, lng: driver.longitude }} 
                    title="Driver"
                    icon={{
                      path: 'M-1.54,21.57C-1.54,21.57,2.23,19.2,2.23,12.9s-2.91-10.7-5-10.7-5,4.45-5,10.7S-1.54,21.57-1.54,21.57Z',
                      fillColor: '#FF4136', // primary color
                      fillOpacity: 1,
                      strokeWeight: 1,
                      strokeColor: '#FFFFFF',
                      scale: 1.5,
                      anchor: new google.maps.Point(0, 22)
                    }}
                />
            ))}
        </>
      )}

      {role === 'driver' && (
         <MarkerF 
            position={center} 
            title="Your Current Location"
             icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: "#4285F4",
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "white",
            }}
         />
      )}
    </GoogleMap>
  );
}

export default React.memo(MapComponent);
