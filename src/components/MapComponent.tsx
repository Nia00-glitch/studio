
"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, DirectionsRenderer } from '@react-google-maps/api';
import { Loader2 } from 'lucide-react';
import { NIAIcon } from './icons';
import { Ride } from '@/lib/types';

const containerStyle = {
  width: '100%',
  height: '100%',
};

// Define the required libraries for the Google Maps API OUTSIDE the component.
// This ensures the array reference is stable and doesn't trigger re-renders.
const MAP_LIBRARIES: ('places' | 'directions')[] = ['places', 'directions'];

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
  center: { lat: number; lng: number } | null;
  drivers?: { driver_id: string; latitude: number; longitude: number; }[];
  role: 'rider' | 'driver';
  activeRide?: Ride | null;
}

function MapComponent({ center, drivers = [], role, activeRide }: MapComponentProps) {
  // Guard: Ensure the API key is available before attempting to load the script.
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: googleMapsApiKey || "", // Pass an empty string if key is not available, which will be caught by our guard clause.
    libraries: MAP_LIBRARIES,
  });

  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const calculateRoute = useCallback((
      driverLocation: { lat: number, lng: number },
      pickupLocation: { latitude: number, longitude: number },
      destinationAddress: string,
      status: Ride['status']
    ) => {
        if (!window.google) return;
        const directionsService = new window.google.maps.DirectionsService();

        let origin = driverLocation;
        let destination: { lat: number, lng: number } | { query: string };

        if (status === 'in-progress') {
            origin = driverLocation;
            // The destination for DirectionsService can be a string address
            destination = { query: destinationAddress };
        } else { // 'accepted' status
            origin = driverLocation;
            destination = { lat: pickupLocation.latitude, lng: pickupLocation.longitude };
        }

        directionsService.route(
            {
                origin: new window.google.maps.LatLng(origin.lat, origin.lng),
                destination: 'query' in destination ? destination.query : new window.google.maps.LatLng(destination.lat, destination.lng),
                travelMode: window.google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
                if (status === window.google.maps.DirectionsStatus.OK) {
                    setDirections(result);
                } else {
                    console.error(`Error fetching directions: ${status}`, result);
                }
            }
        );
  }, []);

  // Effect to calculate and display the route for an active ride
  useEffect(() => {
    // Ensure the route is calculated only when the driver's live location is available and the map is loaded.
    if (activeRide && activeRide.driverLive && map && isLoaded) {
      const { driverLive, pickupLocation, destinationAddress, status } = activeRide;
      calculateRoute(driverLive, pickupLocation, destinationAddress, status);
    } else {
      setDirections(null); // Clear directions when ride ends
    }
  }, [activeRide, map, isLoaded, calculateRoute]);

  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
      setMap(mapInstance);
  }, []);

  // NEW: Add a clear error if the API key is missing in the environment.
  if (!googleMapsApiKey) {
    return (
      <div className="flex items-center justify-center h-full bg-destructive/10 text-destructive p-4 text-center">
        <p>
          <strong>Google Maps API Key is missing.</strong>
          <br />
          Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your environment variables and restart the server.
        </p>
      </div>
    );
  }

  // Show an error if the script fails to load for any reason (e.g., referrer restrictions, network issues).
  if (loadError) {
    return <div className="flex items-center justify-center h-full bg-destructive/10 text-destructive p-4 text-center">Error loading maps. Check your API key restrictions and network connection.</div>;
  }

  // Show a loading spinner while the script is loading.
  if (!isLoaded || !center) {
    return <div className="flex items-center justify-center h-full bg-muted"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  // Define the driver icon only after the script is loaded to prevent runtime errors.
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
      onLoad={onMapLoad}
    >
      {/* Rider/User's own location marker */}
      <MarkerF 
          position={center} 
          title="Your Location"
          icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#4285F4",
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: "white",
          }}
          zIndex={10}
      />
      
      {/* Render route if an active ride is in progress */}
      {directions && (
        <DirectionsRenderer
          directions={directions}
          options={{
            polylineOptions: {
              strokeColor: '#FF851B',
              strokeWeight: 6,
              strokeOpacity: 0.8,
            },
            suppressMarkers: true, // We use our own custom markers
          }}
        />
      )}

      {/* Render assigned driver's live location if ride is active */}
      {activeRide && activeRide.driverLive && (
        <MarkerF
          position={{ lat: activeRide.driverLive.lat, lng: activeRide.driverLive.lng }}
          title={activeRide.driverName || 'Your Driver'}
          icon={driverIcon}
          zIndex={15}
        />
      )}
      
      {/* Render nearby available drivers (only for riders not in a ride) */}
      {role === 'rider' && !activeRide && drivers.map(driver => (
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

export default React.memo(MapComponent);
