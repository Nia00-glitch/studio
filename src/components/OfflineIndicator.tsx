
"use client";

import { WifiOff } from "lucide-react";
import { useEmergencyContext } from "@/contexts/EmergencyContext";
import { AnimatePresence, motion } from "framer-motion";

export default function OfflineIndicator() {
  const { isOnline } = useEmergencyContext();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="flex items-center gap-2 text-white bg-destructive/80 px-3 py-1 rounded-full text-sm font-semibold"
        >
          <WifiOff className="w-4 h-4" />
          <span>Offline</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

    