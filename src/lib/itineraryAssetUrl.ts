import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { extractVoucherPath } from "./secureVoucher";

/**
 * Build a permanent serve-voucher proxy URL for public/wallet access.
 * Returns null if shareToken or supabase URL are missing.
 */
export function buildVoucherProxyUrl(pathOrUrl: string, shareToken?: string | null): string | null {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl || !shareToken) return null;
  const cleanPath = extractVoucherPath(pathOrUrl);
  if (!cleanPath) return null;
  return `${supabaseUrl}/functions/v1/serve-voucher?token=${encodeURIComponent(shareToken)}&file=${encodeURIComponent(cleanPath)}`;
}

/**
 * Resolve a stored voucher path/URL to a displayable URL.
 * - If already an absolute URL, returns it as-is.
 * - If shareToken is provided, returns the serve-voucher proxy URL.
 * - Otherwise (authenticated context), fetches a short-lived signed URL.
 */
export function useResolvedVoucherUrl(
  pathOrUrl: string | null | undefined,
  shareToken?: string | null
): string | null {
  const [url, setUrl] = useState<string | null>(() => {
    if (!pathOrUrl) return null;
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    return buildVoucherProxyUrl(pathOrUrl, shareToken);
  });

  useEffect(() => {
    let cancelled = false;
    if (!pathOrUrl) {
      setUrl(null);
      return;
    }
    if (/^https?:\/\//i.test(pathOrUrl)) {
      setUrl(pathOrUrl);
      return;
    }
    const proxy = buildVoucherProxyUrl(pathOrUrl, shareToken);
    if (proxy) {
      setUrl(proxy);
      return;
    }
    // Fall back to authenticated signed URL
    (async () => {
      const cleanPath = extractVoucherPath(pathOrUrl);
      if (!cleanPath) return;
      const { data, error } = await supabase.storage
        .from("vouchers")
        .createSignedUrl(cleanPath, 3600);
      if (!cancelled && !error && data?.signedUrl) setUrl(data.signedUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [pathOrUrl, shareToken]);

  return url;
}