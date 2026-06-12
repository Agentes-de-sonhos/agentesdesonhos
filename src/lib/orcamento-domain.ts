/**
 * Domain used for the new quote (orçamento) link format.
 * Old links via /orcamento/:token continue working.
 */
export const ORCAMENTO_DOMAIN = "https://seuorcamento.tur.br";

/**
 * Builds the new-format quote link.
 */
export function buildOrcamentoLink(agencyName: string, publicAccessCode: string): string {
  const slug = agencyNameToSlug(agencyName);
  return `${ORCAMENTO_DOMAIN}/${slug}/${publicAccessCode}`;
}

/**
 * Generates a URL-friendly slug from an agency name.
 */
export function agencyNameToSlug(agencyName: string): string {
  return agencyName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Returns the OG-enriched URL for sharing a quote via WhatsApp/social media.
 * This URL hits the `public-og` edge function, which serves proper OG meta tags
 * to crawlers (WhatsApp, Facebook, LinkedIn, X) and then redirects browsers
 * to the canonical SPA URL.
 */
export function buildOrcamentoShareUrl(agencyName: string, publicAccessCode: string): string {
  const canonical = buildOrcamentoLink(agencyName, publicAccessCode);
  const slug = agencyNameToSlug(agencyName);
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/public-og?type=quote&slug=${encodeURIComponent(slug)}&code=${encodeURIComponent(publicAccessCode)}&url=${encodeURIComponent(canonical)}`;
}

/**
 * Legacy token-based share URL (for quotes that still use share_token only).
 */
export function buildOrcamentoShareUrlByToken(shareToken: string): string {
  const canonical = `${ORCAMENTO_DOMAIN}/orcamento/${shareToken}`;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/public-og?type=quote&token=${encodeURIComponent(shareToken)}&url=${encodeURIComponent(canonical)}`;
}
