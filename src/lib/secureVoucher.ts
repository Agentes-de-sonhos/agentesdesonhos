import { supabase } from "@/integrations/supabase/client";

/**
 * Extract the storage path from a voucher URL or return the path as-is.
 * Handles both legacy full public URLs and new path-only format.
 */
export function extractVoucherPath(urlOrPath: string): string {
  if (!urlOrPath) return "";
  // If it's a full URL, extract the path after /vouchers/
  const marker = "/vouchers/";
  const idx = urlOrPath.indexOf(marker);
  if (idx !== -1) {
    return decodeURIComponent(urlOrPath.substring(idx + marker.length).split("?")[0].split("#")[0]);
  }
  // Already a path
  return urlOrPath;
}

/**
 * Build a direct voucher proxy URL for public wallet documents.
 * This avoids async click handlers/window.open, which iOS Safari often blocks.
 */
export function buildPublicVoucherProxyUrl(filePath: string, shareToken?: string | null): string | null {
  if (/^https?:\/\//i.test(filePath) && !filePath.includes("/vouchers/")) return filePath;

  const path = extractVoucherPath(filePath);
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!path || !shareToken || !supabaseUrl) return null;

  return `${supabaseUrl}/functions/v1/serve-voucher?token=${encodeURIComponent(shareToken)}&file=${encodeURIComponent(path)}`;
}

/**
 * Get a signed URL for a voucher file (authenticated user context).
 * The user must own the file (RLS enforced).
 */
export async function getSignedVoucherUrl(filePath: string, expiresIn = 120): Promise<string | null> {
  const path = extractVoucherPath(filePath);
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from("vouchers")
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    console.error("Failed to get signed voucher URL:", error);
    return null;
  }
  return data.signedUrl;
}

/**
 * Get a signed URL for a voucher file via the secure edge function (public access).
 * Requires slug/share_token + password for authentication.
 */
export async function getPublicVoucherUrl(
  filePath: string,
  opts: { slug?: string; share_token?: string; password?: string; expires_in?: number }
): Promise<string | null> {
  const path = extractVoucherPath(filePath);
  if (!path) return null;

  try {
    const { data, error } = await supabase.functions.invoke("get-secure-voucher", {
      body: {
        file_path: path,
        slug: opts.slug || undefined,
        share_token: opts.share_token || undefined,
        password: opts.password || undefined,
        expires_in: opts.expires_in || undefined,
      },
    });

    if (error || !data?.url) {
      console.error("Failed to get public voucher URL:", error || data?.error);
      return null;
    }
    return data.url;
  } catch (err) {
    console.error("get-secure-voucher error:", err);
    return null;
  }
}
