import { supabase } from "@/integrations/supabase/client";

const APP_KEY_PREFIXES = [
  "sb-",
  "supabase.auth",
  "agentesdesonhos-",
  "lovable-",
  "itinerary-",
  "autosave-",
  "draft-",
  "quote-",
  "wallet-",
  "travel-",
];

function clearStorageByPrefixes(storage: Storage) {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && APP_KEY_PREFIXES.some((p) => key.startsWith(p) || key.toLowerCase().includes(p.toLowerCase()))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => {
      try {
        storage.removeItem(k);
      } catch {
        /* ignore */
      }
    });
  } catch (err) {
    console.warn("[resetUserSession] storage clear failed", err);
  }
}

async function clearCacheStorage() {
  try {
    if (typeof caches !== "undefined" && caches.keys) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
    }
  } catch (err) {
    console.warn("[resetUserSession] cache clear failed", err);
  }
}

async function unregisterServiceWorkers() {
  try {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
    }
  } catch (err) {
    console.warn("[resetUserSession] SW unregister failed", err);
  }
}

export interface ResetSessionOptions {
  /** Path to redirect to after reset. Defaults to "/auth". */
  redirectTo?: string;
  /** Whether to force a full page reload. Defaults to true. */
  reload?: boolean;
}

/**
 * Resets the user's local session: signs out locally, clears app-scoped
 * localStorage / sessionStorage entries, clears Cache API caches, unregisters
 * service workers, then redirects to `redirectTo` (default `/auth`) with a
 * forced reload.
 */
export async function resetUserSession(options: ResetSessionOptions = {}): Promise<void> {
  const { redirectTo = "/auth", reload = true } = options;

  // 1. Local sign out (does not call Supabase server)
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch (err) {
    console.warn("[resetUserSession] signOut failed", err);
  }

  // 2. Clear app-scoped storage
  if (typeof window !== "undefined") {
    clearStorageByPrefixes(window.localStorage);
    clearStorageByPrefixes(window.sessionStorage);
  }

  // 3. Clear Cache API and service workers in parallel
  await Promise.all([clearCacheStorage(), unregisterServiceWorkers()]);

  // 4. Redirect with hard reload
  if (typeof window !== "undefined") {
    if (reload) {
      window.location.replace(redirectTo);
    } else {
      window.location.href = redirectTo;
    }
  }
}
