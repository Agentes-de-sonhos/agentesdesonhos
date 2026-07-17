import type { Quote } from "@/types/quote";

/**
 * Rótulo de composição de passageiros: "1 adulto", "2 adultos e 1 criança",
 * "2 adultos, 2 crianças e 1 bebê" etc. Singular/plural correto.
 */
export function buildPassengerLabel(quote: Quote): string {
  const adults = Number((quote as any).adults_count) || 0;
  const children = Number((quote as any).children_count) || 0;
  const infants = Number((quote as any).infants_count) || 0;

  const parts: string[] = [];
  if (adults > 0) parts.push(`${adults} adulto${adults === 1 ? "" : "s"}`);
  if (children > 0) parts.push(`${children} criança${children === 1 ? "" : "s"}`);
  if (infants > 0) parts.push(`${infants} bebê${infants === 1 ? "" : "s"}`);

  if (parts.length === 0) return "Passageiros não informados";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} e ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")} e ${parts[parts.length - 1]}`;
}