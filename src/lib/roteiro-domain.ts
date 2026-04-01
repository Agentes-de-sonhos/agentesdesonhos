/**
 * Domain used for the new itinerary (roteiro) link format.
 * Old links via /roteiro/:token continue working.
 */
export const ROTEIRO_DOMAIN = "https://seuroteiro.tur.br";

/**
 * Builds the new-format itinerary link.
 */
export function buildRoteiroLink(agencyName: string, publicAccessCode: string): string {
  const slug = agencyNameToSlug(agencyName);
  return `${ROTEIRO_DOMAIN}/${slug}/${publicAccessCode}`;
}

/**
 * Generates a URL-friendly slug from an agency name.
 */
function agencyNameToSlug(agencyName: string): string {
  return agencyName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
