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
    return decodeURIComponent(urlOrPath.substring(idx + marker.length));
  }
  // Already a path
  return urlOrPath;
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
  opts: { slug?: string; share_token?: string; password?: string }
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
