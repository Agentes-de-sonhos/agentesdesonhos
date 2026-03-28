import { useRef, useCallback } from "react";

interface AntiFloodOptions {
  /** Minimum seconds between submissions (default: 10) */
  cooldownSeconds?: number;
  /** Minimum seconds the form must be open before submit (default: 2) */
  minInteractionSeconds?: number;
}

/**
 * Anti-flood hook for forms.
 * Prevents rapid re-submissions and bot-like instant submissions.
 */
export function useAntiFlood(options: AntiFloodOptions = {}) {
  const { cooldownSeconds = 10, minInteractionSeconds = 2 } = options;
  
  const lastSubmitRef = useRef<number>(0);
  const formOpenedAtRef = useRef<number>(Date.now());

  /** Call when the form mounts or becomes visible */
  const markFormOpened = useCallback(() => {
    formOpenedAtRef.current = Date.now();
  }, []);

  /** Returns null if allowed, or an error message string if blocked */
  const canSubmit = useCallback((): string | null => {
    const now = Date.now();
    
    // Check minimum interaction time (anti-bot)
    const interactionTime = (now - formOpenedAtRef.current) / 1000;
    if (interactionTime < minInteractionSeconds) {
      return "Aguarde um momento antes de enviar.";
    }

    // Check cooldown (anti-flood)
    const timeSinceLastSubmit = (now - lastSubmitRef.current) / 1000;
    if (lastSubmitRef.current > 0 && timeSinceLastSubmit < cooldownSeconds) {
      const remaining = Math.ceil(cooldownSeconds - timeSinceLastSubmit);
      return `Aguarde ${remaining} segundo${remaining > 1 ? "s" : ""} antes de enviar novamente.`;
    }

    return null;
  }, [cooldownSeconds, minInteractionSeconds]);

  /** Call after a successful submission */
  const markSubmitted = useCallback(() => {
    lastSubmitRef.current = Date.now();
  }, []);

  return { canSubmit, markSubmitted, markFormOpened };
}
