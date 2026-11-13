import type { SeasonItinerary } from './seasonItineraries';
export const emptyItineraryFilters = { company: '', ship: '', region: '', nights: '', destination: '', order: '', port: '', month: '' };
export type ItineraryFilters = typeof emptyItineraryFilters;
export function filterSeasonItineraries(options: SeasonItinerary[], f: ItineraryFilters) {
  return options.filter(o => (!f.company || o.ship.lineSlug === f.company) && (!f.ship || o.ship.shipSlug === f.ship)
    && (!f.region || o.region === f.region) && (!f.nights || o.nights === Number(f.nights))
    && (!f.destination || o.ports.slice(1, -1).includes(f.destination)) && (!f.order || o.ports.join(' → ') === f.order)
    && (!f.port || o.ports[0] === f.port) && (!f.month || o.months.includes(f.month)));
}
