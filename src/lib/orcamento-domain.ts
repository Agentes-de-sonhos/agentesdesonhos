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
