
"use client";

import { useRef, useEffect, useCallback } from 'react';

// A custom hook to create a stable, debounced callback function.
// This prevents excessive function calls in response to rapid events like location updates.
export function useDebouncedCallback<A extends any[]>(
  callback: (...args: A) => void,
  wait: number
) {
  // Using refs to store the latest callback and timeout ID without triggering re-renders
  const argsRef = useRef<A>();
  const timeout = useRef<ReturnType<typeof setTimeout>>();

  // Cleanup function to clear any pending timeout when the component unmounts
  function cleanup() {
    if (timeout.current) {
      clearTimeout(timeout.current);
    }
  }

  // Ensure cleanup runs on unmount
  useEffect(() => cleanup, []);

  // The debounced callback that gets returned
  const debouncedCallback = useCallback(
    (...args: A) => {
      // Store the latest arguments
      argsRef.current = args;
      
      // Clear the previous timeout to reset the debounce timer
      cleanup();

      // Set a new timeout
      timeout.current = setTimeout(() => {
        if (argsRef.current) {
          // Execute the callback with the last saved arguments
          callback(...argsRef.current);
        }
      }, wait);
    },
    [callback, wait]
  );
  
  return debouncedCallback;
}
