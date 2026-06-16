import { useEffect, useState, useCallback } from "react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallPlatform = "ios" | "android" | "desktop";

function detectPlatform(): InstallPlatform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}

function checkStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export interface UseInstallPromptReturn {
  /** Whether the browser has a deferred native install prompt available */
  canPrompt: boolean;
  /** Attempt the native install prompt; falls back to opening instructions */
  triggerInstall: () => Promise<void>;
  /** Controls the visibility of the fallback instructions dialog */
  showInstructions: boolean;
  setShowInstructions: (v: boolean) => void;
  /** Detected platform for contextual instructions */
  platform: InstallPlatform;
  /** Whether the app is already running in standalone mode */
  isStandalone: boolean;
}

export function useInstallPrompt(): UseInstallPromptReturn {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(() => checkStandalone());
  const platform = detectPlatform();

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => setIsStandalone(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const triggerInstall = useCallback(async () => {
    if (deferred) {
      try {
        await deferred.prompt();
        const choice = await deferred.userChoice;
        if (choice.outcome === "accepted") setIsStandalone(true);
        setDeferred(null);
        return;
      } catch {
        // fallback to instructions
      }
    }
    setShowInstructions(true);
  }, [deferred]);

  return {
    canPrompt: !!deferred,
    triggerInstall,
    showInstructions,
    setShowInstructions,
    platform,
    isStandalone,
  };
}
