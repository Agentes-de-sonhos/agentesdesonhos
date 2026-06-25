import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore - bundler import for the worker
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerUrl;

// Module-level cache so we don't re-render the same PDF on every mount
const cache = new Map<string, string>();

interface PdfThumbnailProps {
  url: string;
  className?: string;
  alt?: string;
  onError?: () => void;
}

/**
 * Renders the first page of a PDF as an <img> thumbnail.
 * Calls `onError` when the preview cannot be generated, so the caller
 * can fall back to a generic icon.
 */
export function PdfThumbnail({ url, className, alt, onError }: PdfThumbnailProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(() => cache.get(url) ?? null);
  const failedRef = useRef(false);

  useEffect(() => {
    if (dataUrl || failedRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const pdf = await (pdfjsLib as any).getDocument({ url, disableRange: false }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        // Target ~600px wide for crisp preview without overwhelming memory
        const targetWidth = 600;
        const scale = targetWidth / viewport.width;
        const scaled = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = scaled.width;
        canvas.height = scaled.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no canvas context");
        await page.render({ canvasContext: ctx, viewport: scaled, canvas }).promise;
        const out = canvas.toDataURL("image/jpeg", 0.8);
        if (cancelled) return;
        cache.set(url, out);
        setDataUrl(out);
      } catch (e) {
        failedRef.current = true;
        if (!cancelled) onError?.();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url, dataUrl, onError]);

  if (!dataUrl) return null;
  return <img src={dataUrl} alt={alt} loading="lazy" decoding="async" className={className} />;
}