/** Filtros da campanha de novembro (mesmos ids do CategoryRail). */
export const CAMPAIGN_CATEGORY_OPTIONS = [
  { id: "praias", label: "Praias e Resorts" },
  { id: "familia", label: "Família e Orlando" },
  { id: "europa", label: "Europa" },
  { id: "cruzeiros", label: "Cruzeiros" },
  { id: "brasil", label: "Brasil" },
] as const;

export function isValidOfferCtaUrl(url: string): boolean {
  return /^https:\/\/[^\s]+$/.test(url) && url.length <= 1000;
}
