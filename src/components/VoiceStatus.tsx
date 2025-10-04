
"use client";

import { useEmergencyContext } from "@/contexts/EmergencyContext";
import { Bot, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export default function VoiceStatus() {
  const { voiceCommandState, voiceDialogState } = useEmergencyContext();

  const getStatus = () => {
    if (voiceCommandState.status === "processing" || voiceDialogState.status === "PARSING" || voiceDialogState.status === "EXECUTING") {
      return {
        icon: <Loader2 className="h-8 w-8 animate-spin text-primary" />,
        text: voiceCommandState.message || "Processing...",
      };
    }
    if (voiceCommandState.status === "awaiting_confirmation") {
      return {
        icon: <Bot className="h-8 w-8 text-accent" />,
        text: voiceCommandState.message || "Awaiting your response...",
      };
    }
    return null;
  };

  const status = getStatus();

  return (
    <AnimatePresence>
      {status && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ type: "spring", stiffness: 150, damping: 20 }}
          className="absolute top-20 left-1/2 -translate-x-1/2 z-20 w-full max-w-sm p-2"
        >
          <div className="bg-background/80 backdrop-blur-md rounded-2xl shadow-lg p-4 flex items-center space-x-4">
            <div className="flex-shrink-0">{status.icon}</div>
            <p className="font-medium text-foreground">{status.text}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
