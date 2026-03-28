import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const HEARTBEAT_INTERVAL = 60_000; // 1 minute
const INACTIVITY_TIMEOUT = 20 * 60 * 1000; // 20 minutes

export function useSessionTracker() {
  const { user } = useAuth();
  const sessionIdRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      // End session due to inactivity
      if (sessionIdRef.current) {
        void endSession(sessionIdRef.current);
        sessionIdRef.current = null;
      }
    }, INACTIVITY_TIMEOUT);
  }, []);

  useEffect(() => {
    if (!user) {
      if (sessionIdRef.current) {
        void endSession(sessionIdRef.current);
        sessionIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      return;
    }

    // Start a new session
    const startSession = async () => {
      const { data, error } = await (supabase as any)
        .from("user_sessions")
        .insert({ user_id: user.id })
        .select("id")
        .single();

      if (!error && data) {
        sessionIdRef.current = data.id;
      }
    };

    startSession();

    // Heartbeat
    intervalRef.current = setInterval(async () => {
      if (!sessionIdRef.current) return;
      // If inactive for too long, skip heartbeat (session already ended)
      if (Date.now() - lastActivityRef.current > INACTIVITY_TIMEOUT) return;
      const now = new Date().toISOString();
      await (supabase as any)
        .from("user_sessions")
        .update({ last_heartbeat_at: now })
        .eq("id", sessionIdRef.current);
    }, HEARTBEAT_INTERVAL);

    // Track user activity for inactivity detection
    const handleActivity = () => resetInactivityTimer();
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));
    resetInactivityTimer();

    // Close session on tab close
    const handleBeforeUnload = () => {
      if (sessionIdRef.current) {
        const payload = JSON.stringify({
          ended_at: new Date().toISOString(),
        });
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_sessions?id=eq.${sessionIdRef.current}`;
        navigator.sendBeacon(
          url,
          new Blob([payload], { type: "application/json" })
        );
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      events.forEach((e) => window.removeEventListener(e, handleActivity));
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      if (sessionIdRef.current) {
        void endSession(sessionIdRef.current);
        sessionIdRef.current = null;
      }
    };
  }, [user?.id, resetInactivityTimer]);
}

async function endSession(sessionId: string) {
  const now = new Date().toISOString();
  const { data: session } = await (supabase as any)
    .from("user_sessions")
    .select("started_at")
    .eq("id", sessionId)
    .single();

  if (session) {
    const startedAt = new Date(session.started_at);
    const durationSeconds = Math.round((Date.now() - startedAt.getTime()) / 1000);
    await (supabase as any)
      .from("user_sessions")
      .update({
        ended_at: now,
        duration_seconds: durationSeconds,
      })
      .eq("id", sessionId);
  }
}
