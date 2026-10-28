import type { CircuitTour } from "./types";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";
import { CAPITAIS_DA_ITALIA } from "./capitaisDaItalia";
import { LESTE_EUROPEU_PREMIUM_2026 } from "./lesteEuropeuPremium2026";

export type { CircuitTour } from "./types";

/** Registro de circuitos. Para incluir um novo, crie o arquivo de dados e adicione aqui. */
export const CIRCUITS: CircuitTour[] = [LESTE_EUROPEU_PREMIUM_2026, CAPITAIS_DA_ITALIA];

export function findCircuit(slug: string | undefined, hostname?: string | null): CircuitTour | undefined {
  const c = CIRCUITS.find((x) => x.slug === slug);
  if (!c?.profiles) return c;
  const key = resolveSiteProfile(hostname ?? "").key as string;
  return c.profiles.includes(key) ? c : undefined;
}

export function formatCircuitPrice(value: number, currency: CircuitTour["currency"]): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}
