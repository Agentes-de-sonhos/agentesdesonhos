import { describe, expect, it } from 'vitest';
import { seasonItineraries, sampleSeasonItineraries, seasonItineraryPath } from '@/lib/cruiseShips/seasonItineraries';
import { buildItineraryGroups } from '@/lib/cruiseShips/itineraryGroups';

describe('season itinerary gallery', () => {
  const options = seasonItineraries('2026-11-13');
  it('draws eight different options without mutating the catalog', () => {
    const original = options.map(o => o.id);
    const selected = sampleSeasonItineraries(options, 8, () => 0.42);
    expect(selected).toHaveLength(8);
    expect(new Set(selected.map(o => o.id)).size).toBe(8);
    expect(options.map(o => o.id)).toEqual(original);
    expect(new Set(options.map(o => o.ship.lineSlug))).toEqual(new Set(['msc', 'costa', 'corazul']));
  });
  it('keeps exact port order, nights and months tied to eligible departures', () => {
    for (const option of options) {
      const group = buildItineraryGroups(option.ship.routes.feed.sailings, option.ship.routes).find(g => g.id === option.groupId)!;
      const variant = group.variants[option.variantIndex];
      const dates = variant.sailings.filter(s => s.status !== 'conflict' && s.date >= '2026-11-13' && s.date <= '2027-04-30');
      expect(option.ports).toEqual(variant.ports);
      expect(option.nights).toBe(group.n);
      expect(option.months).toEqual([...new Set(dates.map(s => s.date.slice(0, 7)))].sort());
      expect(option.ports.every(port => !!option.ship.routes.coordinates[port])).toBe(true);
      expect(seasonItineraryPath(option)).toContain(`?itinerary=${option.groupId}&variant=${option.variantIndex}#csp-roteiros`);
    }
  });
  it('does not advertise departed seasons', () => expect(seasonItineraries('2027-05-01')).toEqual([]));
});
