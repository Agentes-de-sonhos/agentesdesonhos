import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import {
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
} from "@/lib/seo";

interface SEOProps {
  /** Page title. If omitted, uses the default site title. */
  title?: string;
  /** Meta description. Falls back to a generic site description. */
  description?: string;
  /** Canonical path (starting with /) or full URL. Defaults to current pathname. */
  canonical?: string;
  /** When true, blocks indexing and following. Use for all authenticated + client-shared pages. */
  noindex?: boolean;
  /** Optional absolute image URL for social previews. */
  image?: string;
  /** Open Graph type. Defaults to "website". */
  ogType?: "website" | "article" | "profile";
  /** Optional JSON-LD payload (Object or Array). */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Per-route head manager. Emits title, meta description, canonical, robots,
 * Open Graph, Twitter Card and optional JSON-LD. Deduplicates via react-helmet-async.
 *
 * Does NOT touch layout, business logic, auth, or user data. Safe to drop in any page.
 */
export function SEO({
  title,
  description,
  canonical,
  noindex = false,
  image,
  ogType = "website",
  jsonLd,
}: SEOProps) {
  const location = useLocation();
  const pathname = location?.pathname ?? "/";
  const finalTitle = title
    ? title.includes(SITE_NAME)
      ? title
      : `${title} | ${SITE_NAME}`
    : `${SITE_NAME} | Sistema para Agências de Viagens`;
  const finalDescription =
    description ??
    "Sistema completo para agências de viagens com CRM, orçamentos, roteiros, carteira digital, financeiro e gestão de vendas em uma única plataforma.";
  const finalCanonical = canonical
    ? absoluteUrl(canonical)
    : absoluteUrl(pathname);
  const finalImage = image ?? DEFAULT_OG_IMAGE;
  const robotsContent = noindex ? "noindex, nofollow" : "index, follow";

  return (
    <Helmet prioritizeSeoTags>
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      <meta name="robots" content={robotsContent} />
      <link rel="canonical" href={finalCanonical} />

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:url" content={finalCanonical} />
      <meta property="og:locale" content="pt_BR" />
      <meta property="og:image" content={finalImage} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={finalImage} />

      {jsonLd ? (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      ) : null}
    </Helmet>
  );
}

export { SITE_URL, SITE_NAME };