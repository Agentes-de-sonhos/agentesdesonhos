import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchSecureDocument,
  downloadSecureDocument,
  revokeObjectUrl,
  SECURE_DOCUMENT_ERROR,
  type SecureDocumentBlob,
  type SecureDocumentSource,
} from "@/lib/secureDocumentFetch";

export interface UseSecureDocumentResult {
  /** Currently opened document (blob URL only). */
  doc: SecureDocumentBlob | null;
  open: boolean;
  loading: boolean;
  downloading: boolean;
  error: string | null;
  /** Fetch + open the in-app viewer. Ignores duplicate clicks. */
  openDocument: (source: SecureDocumentSource) => Promise<void>;
  retry: () => Promise<void>;
  close: () => void;
  /** Blob download, never navigates. */
  download: (source: SecureDocumentSource) => Promise<void>;
}

export function useSecureDocument(): UseSecureDocumentResult {
  const [doc, setDoc] = useState<SecureDocumentBlob | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSource = useRef<SecureDocumentSource | null>(null);
  const busy = useRef(false);
  const currentUrl = useRef<string | null>(null);

  const releaseCurrent = useCallback(() => {
    revokeObjectUrl(currentUrl.current);
    currentUrl.current = null;
  }, []);

  useEffect(() => () => releaseCurrent(), [releaseCurrent]);

  const load = useCallback(
    async (source: SecureDocumentSource) => {
      if (busy.current) return;
      busy.current = true;
      lastSource.current = source;
      setLoading(true);
      setError(null);
      setOpen(true);
      releaseCurrent();
      setDoc(null);
      try {
        const next = await fetchSecureDocument(source);
        currentUrl.current = next.objectUrl;
        setDoc(next);
      } catch {
        setError(SECURE_DOCUMENT_ERROR);
      } finally {
        setLoading(false);
        busy.current = false;
      }
    },
    [releaseCurrent],
  );

  const retry = useCallback(async () => {
    if (lastSource.current) await load(lastSource.current);
  }, [load]);

  const close = useCallback(() => {
    setOpen(false);
    setDoc(null);
    setError(null);
    releaseCurrent();
  }, [releaseCurrent]);

  const download = useCallback(async (source: SecureDocumentSource) => {
    if (busy.current) return;
    busy.current = true;
    setDownloading(true);
    setError(null);
    try {
      await downloadSecureDocument(source);
    } catch {
      setError(SECURE_DOCUMENT_ERROR);
      throw new Error(SECURE_DOCUMENT_ERROR);
    } finally {
      setDownloading(false);
      busy.current = false;
    }
  }, []);

  return { doc, open, loading, downloading, error, openDocument: load, retry, close, download };
}