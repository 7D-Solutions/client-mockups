import { useEffect, useRef } from 'react';

interface PollingOptions {
  interval: number;
  enabled?: boolean;
  onError?: (error: Error) => void;
}

export function usePolling(
  fn: () => Promise<void> | void,
  { interval, enabled = true, onError }: PollingOptions
) {
  const savedCallback = useRef(fn);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = fn;
  }, [fn]);

  // Set up the polling
  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    const tick = async () => {
      try {
        await savedCallback.current();
      } catch (error) {
        onError?.(error as Error);
      } finally {
        // Schedule next poll
        timeoutRef.current = setTimeout(tick, interval);
      }
    };

    // Start polling
    timeoutRef.current = setTimeout(tick, interval);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [interval, enabled, onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
}