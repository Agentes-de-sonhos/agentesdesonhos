import { useEffect, useRef, useState } from "react";

const VERSION_URL = "/version.json";
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

async function fetchRemoteVersion(): Promise<string | null> {
  try {
    const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, {
      cache: "no-store",
      credentials: "omit",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: string };
    return typeof data.version === "string" ? data.version : null;
  } catch {
    return null;
  }
}

/**
 * Compares the version baked into the current bundle (__APP_VERSION__)
 * against the freshly-fetched /version.json. Returns whether an update
 * is available. Runs at mount, on tab visibility change and on a slow
 * periodic poll.
 */
export function useAppVersion(): { updateAvailable: boolean } {
  const currentVersion = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const stopRef = useRef(false);

  useEffect(() => {
    // Skip in development — there is no meaningful version to compare against.
    if (currentVersion === "dev") return;

    stopRef.current = false;

    const check = async () => {
      if (stopRef.current) return;
      const remote = await fetchRemoteVersion();
      if (!remote) return;
      if (remote !== currentVersion) {
        setUpdateAvailable(true);
      }
    };

    check();

    const onVisibility = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const interval = window.setInterval(check, POLL_INTERVAL_MS);

    return () => {
      stopRef.current = true;
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
    };
  }, [currentVersion]);

  return { updateAvailable };
}

/**
 * Runs registered "has unsaved changes" checks. Returns true if any
 * component reported dirty state.
 */
export function hasUnsavedChanges(): boolean {
  const checks = window.__appUpdateDirtyChecks;
  if (!checks || checks.length === 0) return false;
  for (const check of checks) {
    try {
      const result = check();
      if (result) return true;
    } catch {
      // ignore faulty checks
    }
  }
  return false;
}

/**
 * Best-effort cache & service worker refresh, then hard reload.
 * Never clears localStorage/sessionStorage/cookies — the Supabase
 * session and user preferences must survive the update.
 */
export async function performAppUpdate(): Promise<void> {
  const finalReload = () => {
    try {
      window.location.reload();
    } catch {
      window.location.href = window.location.href;
    }
  };

  try {
    // 1. Service worker: apply pending update or unregister stale ones.
    if ("serviceWorker" in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.allSettled(
          regs.map(async (reg) => {
            try {
              await reg.update();
            } catch {
              /* noop */
            }
            if (reg.waiting) {
              try {
                reg.waiting.postMessage({ type: "SKIP_WAITING" });
              } catch {
                /* noop */
              }
            }
          }),
        );
      } catch {
        /* noop */
      }
    }

    // 2. Clear only the Cache Storage (technical caches for app assets).
    //    localStorage / sessionStorage / cookies are intentionally preserved.
    if (typeof caches !== "undefined") {
      try {
        const keys = await caches.keys();
        await Promise.allSettled(keys.map((k) => caches.delete(k)));
      } catch {
        /* noop */
      }
    }
  } catch {
    // Swallow — we always want to fall through to the reload.
  } finally {
    finalReload();
  }
}