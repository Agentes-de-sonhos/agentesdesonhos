import { cruiseShipPath } from './index';
import { SEASON_SHIPS, availableSailings, brazilToday } from './season';
import { buildItineraryGroups } from './itineraryGroups';
import type { CruiseShipContent } from './types';

export interface SeasonItinerary {
  id: string;
  ship: CruiseShipContent;
  groupId: string;
  variantIndex: number;
  nights: number;
  ports: string[];
  months: string[];
}

/** Exact port order and nights stay together; conflicting/past departures never enter the gallery. */
export function seasonItineraries(today = brazilToday(), ships = SEASON_SHIPS): SeasonItinerary[] {
  return ships.flatMap(ship => {
    const eligible = new Set(availableSailings(ship, today));
    return buildItineraryGroups(ship.routes.feed.sailings, ship.routes).flatMap(group =>
      group.variants.flatMap((variant, variantIndex) => {
        const dates = variant.sailings.filter(s => eligible.has(s)).map(s => s.date);
        if (!dates.length || variant.ports.length < 2 || variant.ports.some(port => !ship.routes.coordinates[port])) return [];
        return [{ id: `${ship.shipSlug}-${group.id}-${variantIndex}`, ship, groupId: group.id, variantIndex,
          nights: group.n, ports: variant.ports, months: [...new Set(dates.map(d => d.slice(0, 7)))].sort() }];
      }));
  });
}

/** One draw per mounted gallery. Shuffle distinct options rather than duplicate departure dates. */
export function sampleSeasonItineraries(options: SeasonItinerary[], count = 8, random = Math.random): SeasonItinerary[] {
  const pool = [...options];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.max(0, count));
}

export function seasonItineraryPath(option: SeasonItinerary) {
  return `${cruiseShipPath(option.ship)}?itinerary=${encodeURIComponent(option.groupId)}&variant=${option.variantIndex}#csp-roteiros`;
}

export const seasonMonthLabel = (month: string) => new Date(`${month}-01T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
