import type { CruiseShipContent } from "./types";
import brazilShips from "./data/brazil-2026-27.ships.json";
import { HARMONY_OF_THE_SEAS } from "./harmonyOfTheSeas";

/** Registry of ship pages available on every white-label site. Add new ships here. */
export const ALL_CRUISE_SHIPS: CruiseShipContent[] = [HARMONY_OF_THE_SEAS, ...brazilShips as unknown as CruiseShipContent[]];

/** Ships temporarily hidden from every site (data kept intact). Remove a slug to reactivate. */
export const HIDDEN_CRUISE_SHIPS = new Set<string>(["corazul/buenavista"]);

export const CRUISE_SHIPS: CruiseShipContent[] = ALL_CRUISE_SHIPS.filter((s) => !HIDDEN_CRUISE_SHIPS.has(`${s.lineSlug}/${s.shipSlug}`));

export function findCruiseShip(lineSlug?: string, shipSlug?: string): CruiseShipContent | null {
  return CRUISE_SHIPS.find((s) => s.lineSlug === lineSlug && s.shipSlug === shipSlug) ?? null;
}

export const cruiseShipPath = (s: Pick<CruiseShipContent, "lineSlug" | "shipSlug">) => `/cruzeiros/${s.lineSlug}/${s.shipSlug}`;
