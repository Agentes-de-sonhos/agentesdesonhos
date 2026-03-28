import { useCallback, useRef } from "react";

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 1500;
const MAX_DELAY_MS = 30000;
const RESET_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface AttemptState {
  count: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
}

/**
 * Client-side brute force protection with progressive delays.
 * Tracks failed login attempts and applies increasing delays.
 */
export function useLoginProtection() {
  const state = useRef<AttemptState>({
    count: 0,
    firstAttemptAt: 0,
    lockedUntil: null,
  });

  const getDelayMs = useCallback((attemptCount: number): number => {
    if (attemptCount <= 2) return 0;
    // Progressive: 1.5s, 3s, 6s, 12s... capped at 30s
    const delay = BASE_DELAY_MS * Math.pow(2, attemptCount - 3);
    return Math.min(delay, MAX_DELAY_MS);
  }, []);

  const checkCanAttempt = useCallback((): { allowed: boolean; waitMs?: number; message?: string } => {
    const now = Date.now();
    const s = state.current;

    // Reset window if enough time passed
    if (s.firstAttemptAt && now - s.firstAttemptAt > RESET_WINDOW_MS) {
      s.count = 0;
      s.firstAttemptAt = 0;
      s.lockedUntil = null;
    }

    // Check if temporarily locked
    if (s.lockedUntil && now < s.lockedUntil) {
      const waitMs = s.lockedUntil - now;
      const waitMin = Math.ceil(waitMs / 60000);
      return {
        allowed: false,
        waitMs,
        message: `Muitas tentativas. Aguarde ${waitMin} minuto${waitMin > 1 ? "s" : ""} e tente novamente.`,
      };
    }

    // Apply progressive delay
    const delay = getDelayMs(s.count);
    if (delay > 0) {
      return { allowed: true, waitMs: delay };
    }

    return { allowed: true };
  }, [getDelayMs]);

  const recordFailedAttempt = useCallback(() => {
    const now = Date.now();
    const s = state.current;

    if (!s.firstAttemptAt) {
      s.firstAttemptAt = now;
    }

    s.count += 1;

    // Lock after MAX_ATTEMPTS consecutive failures
    if (s.count >= MAX_ATTEMPTS) {
      // Lock for progressively longer: 5min, 10min, 15min
      const lockMinutes = Math.min(5 * Math.ceil(s.count / MAX_ATTEMPTS), 15);
      s.lockedUntil = now + lockMinutes * 60 * 1000;
    }
  }, []);

  const recordSuccess = useCallback(() => {
    state.current = { count: 0, firstAttemptAt: 0, lockedUntil: null };
  }, []);

  return { checkCanAttempt, recordFailedAttempt, recordSuccess };
}
