import type { CircuitTour } from "./types";
import { LESTE_EUROPEU_PREMIUM_2026 } from "./lesteEuropeuPremium2026";

export type { CircuitTour } from "./types";

/** Registro de circuitos. Para incluir um novo, crie o arquivo de dados e adicione aqui. */
export const CIRCUITS: CircuitTour[] = [LESTE_EUROPEU_PREMIUM_2026];

export function findCircuit(slug: string | undefined): CircuitTour | undefined {
  return CIRCUITS.find((c) => c.slug === slug);
}

export function formatCircuitPrice(value: number, currency: CircuitTour["currency"]): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}
