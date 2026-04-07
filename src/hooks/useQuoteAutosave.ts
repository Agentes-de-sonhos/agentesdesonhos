import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const DRAFT_KEY = "quote-editor-draft";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface QuoteLocalDraft {
  quoteId: string;
  clientName: string;
  destination: string;
  updatedAt: number;
}

/** Persist a lightweight snapshot to localStorage so it survives logout / tab close */
function persistLocalDraft(draft: QuoteLocalDraft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch { /* quota */ }
}

export function getLocalDraft(): QuoteLocalDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuoteLocalDraft;
    // Ignore drafts older than 30 days
    if (Date.now() - parsed.updatedAt > 30 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearLocalDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

/**
 * Hook that keeps a local draft in sync with the current quote being edited.
 * It also saves payment/validity config on visibilitychange and beforeunload.
 */
export function useQuoteAutosave(
  quoteId: string | undefined,
  clientName: string | undefined,
  destination: string | undefined,
  flushPendingSave?: () => void,
) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local draft updated
  useEffect(() => {
    if (!quoteId || !clientName) return;
    persistLocalDraft({
      quoteId,
      clientName: clientName || "",
      destination: destination || "",
      updatedAt: Date.now(),
    });
  }, [quoteId, clientName, destination]);

  // Show "saved" indicator
  const showSaved = useCallback(() => {
    setSaveStatus("saved");
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    statusTimeoutRef.current = setTimeout(() => setSaveStatus("idle"), 3000);
  }, []);

  const showSaving = useCallback(() => setSaveStatus("saving"), []);
  const showError = useCallback(() => {
    setSaveStatus("error");
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    statusTimeoutRef.current = setTimeout(() => setSaveStatus("idle"), 5000);
  }, []);

  // Flush pending saves on visibilitychange and beforeunload
  useEffect(() => {
    if (!quoteId) return;

    const handleVisibility = () => {
      if (document.hidden && flushPendingSave) {
        flushPendingSave();
      }
    };

    const handleBeforeUnload = () => {
      if (flushPendingSave) flushPendingSave();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [quoteId, flushPendingSave]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    };
  }, []);

  return { saveStatus, showSaved, showSaving, showError };
}
