
"use client";

import { useJsApiLoader } from "@react-google-maps/api";
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

// The same stable libraries array used in the main map component.
const MAP_LIBRARIES: ("places" | "directions")[] = ["places", "directions"];

/**
 * A diagnostic page to isolate and test the Google Maps API loading.
 */
export default function MapsDebugPage() {
  const [origin, setOrigin] = React.useState("Loading...");
  const [apiKey, setApiKey] = React.useState("Checking...");
  const [sanitizedApiKey, setSanitizedApiKey] = React.useState("N/A");

  React.useEffect(() => {
    // This code runs only on the client.
    setOrigin(window.location.origin);
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (key) {
      setApiKey("Present");
      setSanitizedApiKey(`${key.substring(0, 3)}...${key.substring(key.length - 3)}`);
    } else {
      setApiKey("Missing");
    }
  }, []);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-maps-script-debug", // Use a unique ID for the debug page
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: MAP_LIBRARIES,
  });

  const getStatus = () => {
    if (loadError) return "Error";
    if (isLoaded) return "Success";
    return "Loading";
  };
  const status = getStatus();

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Google Maps Loader Diagnostics</CardTitle>
          <CardDescription>
            This page tests the Google Maps script loading in isolation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <h3 className="font-semibold text-lg">Runtime Environment</h3>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>
              <strong>Current Origin:</strong> <code>{origin}</code>
            </li>
            <li>
              <strong>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:</strong>
              <span className={`ml-2 font-mono ${apiKey === "Present" ? "text-green-600" : "text-red-600"}`}>
                {apiKey}
              </span>
              {apiKey === "Present" && <span className="text-muted-foreground"> (Sanitized: {sanitizedApiKey})</span>}
              {apiKey === "Missing" && (
                <p className="text-xs text-destructive">You must set this key in a <strong>.env.local</strong> file and restart your dev server.</p>
              )}
            </li>
            <li>
              <strong>`libraries` array stable:</strong> <span className="text-green-600 font-mono">Yes</span> (module-level constant)
            </li>
          </ul>

          <h3 className="font-semibold text-lg">Loader Status</h3>
          <div className="flex items-center gap-4 p-4 border rounded-lg">
            {status === "Loading" && <Loader2 className="h-6 w-6 animate-spin text-blue-500" />}
            {status === "Success" && <CheckCircle className="h-6 w-6 text-green-500" />}
            {status === "Error" && <XCircle className="h-6 w-6 text-red-500" />}
            <div>
              <p className="font-semibold">{status}</p>
              {loadError && (
                <p className="text-xs text-destructive mt-1">
                  <strong>Error Message:</strong> {loadError.message}
                </p>
              )}
               {status === "Success" && (
                <p className="text-xs text-muted-foreground mt-1">
                 The Google Maps script was loaded successfully.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
