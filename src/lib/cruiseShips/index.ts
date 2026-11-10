import type { CruiseShipContent } from "./types";
import brazilShips from "./data/brazil-2026-27.ships.json";
import { HARMONY_OF_THE_SEAS } from "./harmonyOfTheSeas";

/** Registry of ship pages available on every white-label site. Add new ships here. */
export const CRUISE_SHIPS: CruiseShipContent[] = [HARMONY_OF_THE_SEAS, ...brazilShips as unknown as CruiseShipContent[]];

export function findCruiseShip(lineSlug?: string, shipSlug?: string): CruiseShipContent | null {
  return CRUISE_SHIPS.find((s) => s.lineSlug === lineSlug && s.shipSlug === shipSlug) ?? null;
}

export const cruiseShipPath = (s: Pick<CruiseShipContent, "lineSlug" | "shipSlug">) => `/cruzeiros/${s.lineSlug}/${s.shipSlug}`;
