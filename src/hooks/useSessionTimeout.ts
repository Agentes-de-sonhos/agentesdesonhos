import { useState, useEffect, useCallback, useRef } from "react";

const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes
const COUNTDOWN_SECONDS = 30;

const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = [
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "mousemove",
];

function isUserTyping(): boolean {
  const active = document.activeElement;
  if (!active) return false;
  const tag = active.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea") return true;
  if ((active as HTMLElement).isContentEditable) return true;
  return false;
}

export function useSessionTimeout(enabled: boolean) {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const clearAllTimers = useCallback(() => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = null;
    }
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
    }
  }, []);

  const startInactivityTimer = useCallback(() => {
    if (!enabledRef.current) return;
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);

    inactivityTimer.current = setTimeout(() => {
      if (isUserTyping()) {
        // User is typing, restart timer
        startInactivityTimer();
        return;
      }
      setShowWarning(true);
      setCountdown(COUNTDOWN_SECONDS);
    }, INACTIVITY_TIMEOUT_MS);
  }, []);

  const resetActivity = useCallback(() => {
    if (!enabledRef.current) return;
    // Only reset if warning is not showing
    if (!showWarning) {
      startInactivityTimer();
    }
  }, [showWarning, startInactivityTimer]);

  const continueSession = useCallback(() => {
    setShowWarning(false);
    clearAllTimers();
    startInactivityTimer();
  }, [clearAllTimers, startInactivityTimer]);

  const requestLogout = useCallback(() => {
    setShowWarning(false);
    clearAllTimers();
  }, [clearAllTimers]);

  // Countdown logic
  useEffect(() => {
    if (!showWarning) {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
        countdownInterval.current = null;
      }
      return;
    }

    countdownInterval.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval.current!);
          countdownInterval.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
        countdownInterval.current = null;
      }
    };
  }, [showWarning]);

  // Activity event listeners
  useEffect(() => {
    if (!enabled) {
      clearAllTimers();
      return;
    }

    startInactivityTimer();

    const handleActivity = () => resetActivity();

    ACTIVITY_EVENTS.forEach((event) =>
      document.addEventListener(event, handleActivity, { passive: true })
    );

    return () => {
      ACTIVITY_EVENTS.forEach((event) =>
        document.removeEventListener(event, handleActivity)
      );
      clearAllTimers();
    };
  }, [enabled, clearAllTimers, startInactivityTimer, resetActivity]);

  return {
    showWarning,
    countdown,
    continueSession,
    requestLogout,
    timedOut: showWarning && countdown === 0,
  };
}
