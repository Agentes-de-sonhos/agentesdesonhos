import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { seasonItineraries } from '@/lib/cruiseShips/seasonItineraries';
import { emptyItineraryFilters, filterSeasonItineraries } from '@/lib/cruiseShips/seasonItineraryFilters';
import CruiseItinerariesPage from '@/pages/whitelabel/CruiseItinerariesPage';
import type { AgencyDomainInfo } from '@/lib/agencyDomains';
afterEach(cleanup);
it('combines every filter against the same itinerary rather than matching unrelated sailings', () => {
  const options = seasonItineraries('2026-11-13');
  const chosen = options.find(o => o.ports.length > 2)!;
  const filters = { company: chosen.ship.lineSlug, ship: chosen.ship.shipSlug, region: chosen.region, nights: String(chosen.nights), destination: chosen.ports[1], order: chosen.ports.join(' → '), port: chosen.ports[0], month: chosen.months[0] };
  const matches = filterSeasonItineraries(options, filters);
  expect(matches).toContain(chosen);
  for (const option of matches) { expect(option.ports).toEqual(chosen.ports); expect(option.months).toContain(filters.month); }
  expect(filterSeasonItineraries(options, { ...filters, month: '2030-01' })).toEqual([]);
  expect(filterSeasonItineraries(options, emptyItineraryFilters)).toHaveLength(options.length);
});
it('filters the catalog, clears it, and expands results beyond the first twelve', () => {
  window.scrollTo = vi.fn();
  render(<CruiseItinerariesPage info={{ agency_name: 'Arena', hostname: 'arena.preview.local' } as AgencyDomainInfo} />);
  const list = screen.getByRole('list', { name: 'Todos os roteiros' });
  expect(within(list).getAllByRole('listitem')).toHaveLength(12);
  fireEvent.click(screen.getByRole('button', { name: /Mostrar mais roteiros/ }));
  expect(within(list).getAllByRole('listitem').length).toBeGreaterThan(12);
  fireEvent.change(screen.getByLabelText('Companhia'), { target: { value: 'costa' } });
  for (const link of within(list).getAllByRole('link')) expect(link.getAttribute('href')).toContain('/cruzeiros/costa/');
  fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
  expect(screen.getByLabelText('Companhia')).toHaveValue('');
  expect(within(list).getAllByRole('listitem')).toHaveLength(12);
});
