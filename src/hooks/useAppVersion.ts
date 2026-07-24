import { useEffect, useRef, useState } from "react";

const VERSION_URL = "/version.json";
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const DISMISS_KEY = "appUpdateDismissed";
const DISMISS_DURATION_MS = 60 * 60 * 1000; // 60 minutes

type DismissRecord = { version: string; until: number };

function readDismiss(): DismissRecord | null {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DismissRecord;
    if (!parsed || typeof parsed.version !== "string" || typeof parsed.until !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function dismissAppUpdate(version: string) {
  try {
    const record: DismissRecord = { version, until: Date.now() + DISMISS_DURATION_MS };
    localStorage.setItem(DISMISS_KEY, JSON.stringify(record));
  } catch {
    /* noop */
  }
}

/**
 * Returns true when the modal must be suppressed entirely — public /
 * white-label routes shown to end clients should never receive an
 * internal "update the platform" prompt.
 */
export function isPublicUpdateContext(): boolean {
  if (typeof window === "undefined") return true;
  const host = window.location.hostname.toLowerCase();
  const path = window.location.pathname;

  // White-label / marketing hostnames.
  if (
    host.endsWith(".tur.br") ||
    host === "tur.br" ||
    host.startsWith("lp.") ||
    host.startsWith("contato.") ||
    host.startsWith("vitrine.") ||
    host.startsWith("seuorcamento.") ||
    host.startsWith("seuroteiro.") ||
    host.startsWith("carteiradigital.") ||
    host.startsWith("ativar-cartao.")
  ) {
    return true;
  }

  // Public / tokenized routes served under the main domain.
  const publicPrefixes = [
    "/roteiro/",
    "/orcamento/",
    "/c/",
    "/v/",
    "/viagem/",
    "/fatura/",
    "/formulario/",
    "/pesquisa/",
    "/lp/",
    "/experiencias/",
    "/captura-cartao/",
    "/cadastro/",
    "/cadastro-fornecedor",
    "/cadastro-guia",
    "/reset-password",
    "/criar-cartao",
    "/ativar-cartao",
    "/politicasdeprivacidade",
    "/termosdeuso",
    "/blog",
    "/planos",
    "/desconto30off",
    "/certificate-test",
  ];
  if (publicPrefixes.some((p) => path === p || path.startsWith(p))) return true;
  if (/^\/[^/]+\/ofertas\/?$/.test(path)) return true;

  return false;
}

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
export function useAppVersion(): { updateAvailable: boolean; remoteVersion: string | null } {
  const currentVersion = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const stopRef = useRef(false);

  useEffect(() => {
    // Skip in development — there is no meaningful version to compare against.
    if (currentVersion === "dev") return;
    if (isPublicUpdateContext()) return;

    stopRef.current = false;

    const check = async () => {
      if (stopRef.current) return;
      const remote = await fetchRemoteVersion();
      if (!remote) return;
      if (remote === currentVersion) return;
      setRemoteVersion(remote);
      const dismissed = readDismiss();
      if (dismissed && dismissed.version === remote && dismissed.until > Date.now()) return;
      setUpdateAvailable(true);
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

  return { updateAvailable, remoteVersion };
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