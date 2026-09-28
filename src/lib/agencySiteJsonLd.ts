/**
 * Dados estruturados (schema.org) dos sites white label.
 *
 * Tudo é derivado do perfil do tenant (`AgencySiteProfile`) e do host atual —
 * nenhum dado é compartilhado entre agências e nenhuma informação é inventada:
 * campos ausentes simplesmente não entram no JSON-LD.
 */
import type { AgencySiteProfile } from "@/lib/agencySiteProfile";

export interface AgencyRatingInput {
  rating: number | null;
  total: number | null;
}

/** "Rua Pontins, 54 — Santana — São Paulo/SP" -> partes de PostalAddress. */
function parseAddress(address?: string) {
  if (!address) return null;
  const parts = address.split(/\s+[—–-]\s+/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return null;
  const last = parts[parts.length - 1];
  const cityUf = last.match(/^(.+?)\s*\/\s*([A-Z]{2})$/);
  const street = parts[0];
  const neighborhood = parts.length > 2 ? parts[1] : undefined;
  return {
    "@type": "PostalAddress" as const,
    streetAddress: neighborhood ? `${street} — ${neighborhood}` : street,
    ...(cityUf ? { addressLocality: cityUf[1], addressRegion: cityUf[2] } : {}),
    addressCountry: "BR",
  };
}

function toE164(raw?: string): string | undefined {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length < 10) return undefined;
  return `+55${digits.slice(-11)}`;
}

/** Schema TravelAgency + WebSite da home de um site white label. */
export function buildAgencyJsonLd(
  profile: AgencySiteProfile,
  options: { name: string; siteUrl: string; rating?: AgencyRatingInput | null },
): Record<string, unknown>[] | null {
  const { footer } = profile;
  if (!footer) return null;

  const siteUrl = options.siteUrl.replace(/\/$/, "") + "/";
  const address = parseAddress(footer.address);
  const phone = toE164(footer.phone ?? footer.whatsapp);
  const sameAs = [footer.instagram].filter((v): v is string => !!v);
  const rating =
    options.rating && options.rating.rating && options.rating.total
      ? {
          "@type": "AggregateRating",
          ratingValue: Number(options.rating.rating.toFixed(1)),
          reviewCount: options.rating.total,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined;

  const agency: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    "@id": `${siteUrl}#agency`,
    name: options.name,
    url: siteUrl,
    ...(footer.legalName ? { legalName: footer.legalName } : {}),
    ...(footer.cnpj ? { taxID: footer.cnpj, vatID: footer.cnpj } : {}),
    ...(profile.seo?.description ? { description: profile.seo.description } : {}),
    ...(footer.email ? { email: footer.email } : {}),
    ...(phone ? { telephone: phone } : {}),
    ...(address ? { address } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(rating ? { aggregateRating: rating } : {}),
    areaServed: { "@type": "Country", name: "Brasil" },
  };

  const website: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}#website`,
    name: options.name,
    url: siteUrl,
    inLanguage: "pt-BR",
    publisher: { "@id": `${siteUrl}#agency` },
  };

  return [agency, website];
}
