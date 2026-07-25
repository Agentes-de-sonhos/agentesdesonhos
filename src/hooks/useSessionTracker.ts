import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isActiveImpersonatingUser } from "@/lib/impersonation";

const HEARTBEAT_INTERVAL = 60_000; // 1 minute
const INACTIVITY_TIMEOUT = 20 * 60 * 1000; // 20 minutes

interface SharedTrackerState {
  userId: string | null;
  sessionId: string | null;
  refCount: number;
  starting: boolean;
  interval: ReturnType<typeof setInterval> | null;
  inactivityTimer: ReturnType<typeof setTimeout> | null;
  lastActivity: number;
  listenersAttached: boolean;
}

const sharedTracker: SharedTrackerState = {
  userId: null,
  sessionId: null,
  refCount: 0,
  starting: false,
  interval: null,
  inactivityTimer: null,
  lastActivity: Date.now(),
  listenersAttached: false,
};

const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart"] as const;

export function useSessionTracker() {
  const { user } = useAuth();

  useEffect(() => {
    // Skip session tracking entirely during admin support/impersonation mode
    // so the impersonated user's real activity logs and online status are
    // not polluted by the admin's temporary session.
    if (!user || isActiveImpersonatingUser(user.id)) {
      return;
    }

    acquireSharedSession(user.id);

    return () => {
      releaseSharedSession(user.id);
    };
  }, [user?.id]);
}

function acquireSharedSession(userId: string) {
  if (sharedTracker.userId && sharedTracker.userId !== userId) {
    void shutdownSharedSession();
  }

  sharedTracker.userId = userId;
  sharedTracker.refCount += 1;
  attachSharedListeners();
  resetSharedInactivityTimer();

  if (!sharedTracker.interval) {
    sharedTracker.interval = setInterval(() => {
      void heartbeatSharedSession();
    }, HEARTBEAT_INTERVAL);
  }

  if (!sharedTracker.sessionId && !sharedTracker.starting) {
    void startSharedSession(userId);
  }
}

function releaseSharedSession(userId: string) {
  if (sharedTracker.userId !== userId) return;
  sharedTracker.refCount = Math.max(0, sharedTracker.refCount - 1);

  if (sharedTracker.refCount === 0) {
    void shutdownSharedSession();
  }
}

async function startSharedSession(userId: string) {
  sharedTracker.starting = true;
  const { data, error } = await (supabase as any)
    .from("user_sessions")
    .insert({ user_id: userId })
    .select("id")
    .single();

  if (!error && data && sharedTracker.userId === userId && sharedTracker.refCount > 0) {
    sharedTracker.sessionId = data.id;
  }
  sharedTracker.starting = false;
}

async function heartbeatSharedSession() {
  if (!sharedTracker.sessionId) return;
  if (Date.now() - sharedTracker.lastActivity > INACTIVITY_TIMEOUT) return;

  await (supabase as any)
    .from("user_sessions")
    .update({ last_heartbeat_at: new Date().toISOString() })
    .eq("id", sharedTracker.sessionId);
}

function resetSharedInactivityTimer() {
  sharedTracker.lastActivity = Date.now();
  if (sharedTracker.inactivityTimer) {
    clearTimeout(sharedTracker.inactivityTimer);
  }
  sharedTracker.inactivityTimer = setTimeout(() => {
    if (sharedTracker.sessionId) {
      void endSession(sharedTracker.sessionId);
      sharedTracker.sessionId = null;
    }
  }, INACTIVITY_TIMEOUT);
}

function attachSharedListeners() {
  if (sharedTracker.listenersAttached) return;
  ACTIVITY_EVENTS.forEach((eventName) =>
    window.addEventListener(eventName, handleSharedActivity, { passive: true })
  );
  window.addEventListener("beforeunload", handleSharedBeforeUnload);
  sharedTracker.listenersAttached = true;
}

function detachSharedListeners() {
  if (!sharedTracker.listenersAttached) return;
  ACTIVITY_EVENTS.forEach((eventName) =>
    window.removeEventListener(eventName, handleSharedActivity)
  );
  window.removeEventListener("beforeunload", handleSharedBeforeUnload);
  sharedTracker.listenersAttached = false;
}

function handleSharedActivity() {
  resetSharedInactivityTimer();
}

function handleSharedBeforeUnload() {
  if (!sharedTracker.sessionId) return;
  const payload = JSON.stringify({
    ended_at: new Date().toISOString(),
  });
  const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_sessions?id=eq.${sharedTracker.sessionId}`;
  navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
}

async function shutdownSharedSession() {
  if (sharedTracker.interval) {
    clearInterval(sharedTracker.interval);
    sharedTracker.interval = null;
  }
  if (sharedTracker.inactivityTimer) {
    clearTimeout(sharedTracker.inactivityTimer);
    sharedTracker.inactivityTimer = null;
  }
  detachSharedListeners();

  const sessionId = sharedTracker.sessionId;
  sharedTracker.userId = null;
  sharedTracker.sessionId = null;
  sharedTracker.refCount = 0;

  if (sessionId) {
    await endSession(sessionId);
  }
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
