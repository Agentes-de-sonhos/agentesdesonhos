import { useState, useEffect, useRef, useCallback } from "react";
import { Download, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { buildPublicVoucherProxyUrl, getSignedVoucherUrl } from "@/lib/secureVoucher";
import { toast } from "sonner";

interface SecureFileLinkProps {
  filePath: string;
  fileName: string;
  /** For authenticated user access */
  mode?: "authenticated";
  className?: string;
}

interface PublicFileLinkProps {
  filePath: string;
  fileName: string;
  mode: "public";
  slug?: string;
  shareToken?: string;
  password?: string;
  className?: string;
}

type Props = SecureFileLinkProps | PublicFileLinkProps;

// Signed URLs expire (~120s) — refresh shortly before that so the rendered
// anchor always points at a valid URL.
const REFRESH_AFTER_MS = 90_000;

export function SecureFileLink(props: Props) {
  const publicUrl = props.mode === "public" ? buildPublicVoucherProxyUrl(props.filePath, props.shareToken) : null;
  const [url, setUrl] = useState<string | null>(publicUrl);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(publicUrl ? "ready" : "idle");
  const lastFetchedAt = useRef<number>(0);
  const inFlight = useRef<Promise<string | null> | null>(null);

  const fetchUrl = useCallback(async (): Promise<string | null> => {
    if (props.mode === "public") {
      const next = buildPublicVoucherProxyUrl(props.filePath, props.shareToken);
      setUrl(next);
      setStatus(next ? "ready" : "error");
      return next;
    }
    if (inFlight.current) return inFlight.current;
    setStatus((s) => (s === "ready" ? s : "loading"));
    const p = (async () => {
      try {
        const next = await getSignedVoucherUrl(props.filePath);
        if (next) {
          setUrl(next);
          setStatus("ready");
          lastFetchedAt.current = Date.now();
          return next;
        }
        setStatus("error");
        return null;
      } catch {
        setStatus("error");
        return null;
      } finally {
        inFlight.current = null;
      }
    })();
    inFlight.current = p;
    return p;
  }, [props]);

  // Pre-fetch the signed URL on mount so the <a href> is ready before the
  // user taps. This is what makes iOS/Safari open the PDF reliably — Safari
  // only opens new tabs when the click handler runs synchronously on a real
  // URL (not about:blank followed by an async redirect).
  useEffect(() => {
    if (props.mode === "public") {
      setUrl(publicUrl);
      setStatus(publicUrl ? "ready" : "error");
      return;
    }
    void fetchUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.filePath, publicUrl]);

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (props.mode === "public") {
        if (!url) {
          e.preventDefault();
          toast.error("Não foi possível abrir este documento. Tente novamente.");
        }
        return;
      }
      // If the signed URL is missing or stale, refresh and let the navigation
      // happen on the next tap instead of opening about:blank.
      const stale = Date.now() - lastFetchedAt.current > REFRESH_AFTER_MS;
      if (!url || stale) {
        e.preventDefault();
        const next = await fetchUrl();
        if (!next) {
          toast.error("Não foi possível abrir este documento. Tente novamente.");
          return;
        }
        // Same-tab navigation is the only reliable fallback on iOS Safari
        // when the gesture has already been consumed.
        window.location.href = next;
      }
    },
    [props.mode, url, fetchUrl]
  );

  const className =
    props.className ||
    "inline-flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer disabled:opacity-50";

  if (status === "error" && !url) {
    return (
      <button
        type="button"
        onClick={() => void fetchUrl()}
        className={className}
        title="Tentar novamente"
      >
        <AlertCircle className="h-3 w-3" />
        {props.fileName}
      </button>
    );
  }

  return (
    <a
      href={url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={className}
      aria-busy={status === "loading"}
    >
      {status === "loading" && !url ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Download className="h-3 w-3" />
      )}
      {props.fileName}
      {url && <ExternalLink className="h-3 w-3" />}
    </a>
  );
}
