import { useEffect, useState } from 'react';

// How long a request may stay pending before the UI admits it is slow. Exported
// so tests assert against the real value instead of a duplicated magic number.
export const COLD_START_NOTICE_DELAY_MS = 4000;

/**
 * Tracks whether an in-flight request has been pending longer than the cold-start
 * threshold. Returns false while the request is fast (or idle), true once it has
 * been pending past the delay, and false again the moment it settles - so a
 * "waking up" message appears only for genuinely slow requests and vanishes
 * immediately on response. No timers run while nothing is pending.
 */
export function useSlowRequest(isPending, delayMs = COLD_START_NOTICE_DELAY_MS) {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    if (!isPending) {
      setIsSlow(false);
      return undefined;
    }
    const timer = setTimeout(() => setIsSlow(true), delayMs);
    return () => clearTimeout(timer);
  }, [isPending, delayMs]);

  return isSlow;
}
