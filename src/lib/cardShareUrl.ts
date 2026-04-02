const PUBLIC_DOMAIN = "https://contato.tur.br";

/**
 * Returns the direct public URL for viewing the card.
 */
export function getCardPublicUrl(slug: string): string {
  return `${PUBLIC_DOMAIN}/${slug}`;
}

/**
 * Returns the OG-enriched URL for sharing via WhatsApp/social media.
 * This URL serves proper OG meta tags to crawlers, then redirects to the SPA.
 */
export function getCardShareUrl(slug: string): string {
  const publicUrl = getCardPublicUrl(slug);
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/public-og?type=card&slug=${encodeURIComponent(slug)}&url=${encodeURIComponent(publicUrl)}`;
}
