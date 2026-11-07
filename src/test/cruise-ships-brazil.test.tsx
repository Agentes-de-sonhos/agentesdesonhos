import { beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach } from 'vitest';
vi.mock('@/lib/cruiseShips/harmonyAssets', () => ({ HARMONY_ASSETS: {} }));
vi.mock('leaflet', () => ({ default: null }));
vi.mock('leaflet/dist/leaflet.css', () => ({}));
vi.mock('@/hooks/useAgencySiteRequest', () => ({ useAgencySiteRequest: () => ({ state: 'idle', submit: vi.fn(), reset: vi.fn() }) }));
import { CRUISE_SHIPS, findCruiseShip, cruiseShipPath } from '@/lib/cruiseShips';
import { CruiseShipPage } from '@/components/cruise-ship/CruiseShipPage';
const ships = CRUISE_SHIPS.filter(s => s.lineSlug !== 'royal-caribbean');
beforeAll(() => {
  HTMLMediaElement.prototype.pause = vi.fn();
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(cleanup);
describe('Brazilian cruise pages', () => {
  it('registers eight distinct routes and resolves every referenced photo', () => {
    expect(ships).toHaveLength(8);
    expect(new Set(ships.map(cruiseShipPath)).size).toBe(8);
    for (const s of ships) {
      expect(findCruiseShip(s.lineSlug, s.shipSlug)).toBe(s);
      const keys = [s.hero.image, s.albumTile.image, ...s.tiles.map(t => t.photo), ...s.photos.map(p => p.key), ...s.experiences.tabs.map(t => t.image), ...s.cabins.items.flatMap(c => c.image ? [c.image] : [])];
      for (const k of keys) expect(s.assets[k], `${s.shipName}/${k}`).toMatch(/^https:\/\//);
    }
  });
  it.each(ships.map(s => [s.shipName, s] as const))('%s renders without fabricating dates or maps', (_name, ship) => {
    render(<CruiseShipPage ship={ship} hostname="review.preview.local" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(ship.titleTail);
    expect(document.querySelector('#itineraryMap')).toBeNull();
    expect(document.querySelectorAll('img[src=""]')).toHaveLength(0);
    expect(screen.queryByLabelText('Data de saída')).toBeNull();
    fireEvent.click(screen.getAllByText('Consultar saídas')[0]);
    expect(screen.getByLabelText('Roteiro de interesse')).toHaveValue(`seasonal:${ship.routes.summaries![0].title}`);
  });
  it('photo-only gallery wraps without displaying a nonexistent video', () => {
    const s = ships.find(s => !s.hero.video)!;
    render(<CruiseShipPage ship={s} hostname="review.preview.local" />);
    fireEvent.click(screen.getByRole('button', { name: s.hero.videoAria }));
    expect(document.querySelector('video')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Foto anterior' }));
    expect(document.querySelector('#largePhoto')).not.toHaveAttribute('hidden');
    const start = s.photos.findIndex(p => s.assets[p.key] === s.assets[s.hero.image]);
    const previous = (start - 1 + s.photos.length) % s.photos.length;
    expect(document.querySelector('#largePhoto')).toHaveAttribute('src', s.assets[s.photos[previous].key]);
  });
});
