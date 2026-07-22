/**
 * Central SEO constants for Agentes de Sonhos.
 * Change SITE_URL/SITE_NAME/DEFAULT_OG_IMAGE here to propagate across the app.
 */
export const SITE_URL = "https://agentedesonhos.com.br";
export const SITE_NAME = "Agentes de Sonhos";
export const SITE_DESCRIPTION =
  "Sistema completo para agências de viagens com CRM, orçamentos, roteiros, carteira digital, financeiro e gestão de vendas em uma única plataforma.";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;
export const DEFAULT_LOGO = `${SITE_URL}/android-chrome-512x512.png`;

export function absoluteUrl(pathname?: string): string {
  if (!pathname) return SITE_URL + "/";
  if (/^https?:\/\//i.test(pathname)) return pathname;
  return SITE_URL + (pathname.startsWith("/") ? pathname : `/${pathname}`);
}