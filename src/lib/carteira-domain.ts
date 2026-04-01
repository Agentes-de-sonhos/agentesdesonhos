/**
 * Domain used for the new Carteira Digital link format.
 * Old links on vitrine.tur.br continue working via /c/:slug.
 */
export const CARTEIRA_DOMAIN = "https://carteiradigital.tur.br";

/**
 * Domains that should resolve /:agencySlug/:code to CarteiraPublicaV2.
 */
export const CARTEIRA_DOMAINS = [
  "carteiradigital.tur.br",
  "www.carteiradigital.tur.br",
];

/**
 * Generates a URL-friendly slug from an agency name.
 */
export function agencyNameToSlug(agencyName: string): string {
  return agencyName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Builds the new-format carteira link for a trip.
 */
export function buildCarteiraLink(agencyName: string, publicAccessCode: string): string {
  const slug = agencyNameToSlug(agencyName);
  return `${CARTEIRA_DOMAIN}/${slug}/${publicAccessCode}`;
}
