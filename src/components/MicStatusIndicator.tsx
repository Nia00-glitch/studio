
"use client";

import { useEmergencyContext } from "@/contexts/EmergencyContext";
import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MicStatusIndicator() {
  const { isListening } = useEmergencyContext();

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div
        className={cn(
          "flex items-center justify-center h-12 w-12 rounded-full transition-all duration-300",
          isListening ? "bg-green-500/80 shadow-lg animate-pulse" : "bg-red-500/70"
        )}
      >
        <Mic className="h-6 w-6 text-white" />
      </div>
    </div>
  );
}
