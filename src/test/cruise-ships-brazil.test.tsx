import { beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach } from 'vitest';
vi.mock('@/lib/cruiseShips/harmonyAssets', () => ({ HARMONY_ASSETS: {} }));
vi.mock('leaflet', () => ({ default: null }));
vi.mock('leaflet/dist/leaflet.css', () => ({}));
vi.mock('@/hooks/useAgencySiteRequest', () => ({ useAgencySiteRequest: () => ({ state: 'idle', submit: vi.fn(), reset: vi.fn() }) }));
import { CRUISE_SHIPS, findCruiseShip, cruiseShipPath } from '@/lib/cruiseShips';
import { buildItineraryGroups } from '@/lib/cruiseShips/itineraryGroups';
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
  it('keeps gallery images and the five cover positions distinct', () => {
    const canonical = (url: string) => {
      const u = new URL(url);
      return u.pathname.toLowerCase().replace(/\.image\..*$/, '').replace(/-\d+x\d+(?=\.)/, '').replace(/\.webp$/, '');
    };
    for (const s of ships) {
      const images = s.photos.map(p => canonical(s.assets[p.key]));
      expect(new Set(images).size, s.shipName).toBe(images.length);
      expect(images.length).toBeLessThanOrEqual(18);
      const cover = [s.hero.image, ...s.tiles.map(t => t.photo), s.albumTile.image].map(k => canonical(s.assets[k]));
      expect(new Set(cover).size, s.shipName).toBe(5);
      expect(s.hero.video).toBeTruthy();
    }
  });
  it('opens the official video from the main cover before the photos', () => {
    const ship = ships[0];
    render(<CruiseShipPage ship={ship} hostname="review.preview.local" />);
    fireEvent.click(screen.getByRole('button', { name: ship.hero.videoAria }));
    expect(document.querySelector('#galleryDialog')).toHaveAttribute('open');
    expect(document.querySelector('#shipVideo')).not.toHaveAttribute('hidden');
    expect(document.querySelector('#shipVideo source')).toHaveAttribute('src', ship.assets[ship.hero.video!]);
    fireEvent.click(screen.getByRole('button', { name: 'Próxima foto' }));
    expect(document.querySelector('#shipVideo')).toHaveAttribute('hidden');
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });
  it.each(ships.map(s => [s.shipName, s] as const))('%s has six numerical highlights and a complete specification dialog', (_name, ship) => {
    render(<CruiseShipPage ship={ship} hostname="review.preview.local" />);
    const values = [...document.querySelectorAll('.stats b')].map(e => e.textContent);
    expect(values).toHaveLength(6);
    expect(values.every(value => /\d/.test(value ?? ''))).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Ver ficha técnica do navio' }));
    const dialog = document.querySelector('#techDialog')!;
    expect(dialog).toHaveAttribute('open');
    expect(dialog.querySelectorAll('.tech-fact')).toHaveLength(6);
    expect(dialog.querySelectorAll('.tech-fact-detail')).toHaveLength(6);
    expect(dialog).toHaveTextContent(`Conheça os números e a estrutura do ${ship.shipName}.`);
    if (ship.shipSlug === 'buenavista') {
      expect(dialog).toHaveTextContent('2.140');
      expect(dialog).toHaveTextContent('números diferentes');
      expect(dialog).not.toHaveTextContent('não são exibidos');
    }
    fireEvent.click(screen.getByRole('button', { name: 'Fechar ficha técnica' }));
    expect(dialog).not.toHaveAttribute('open');
  });
  it.each(ships.map(s => [s.shipName, s] as const))('%s renders the available itinerary detail', (_name, ship) => {
    render(<CruiseShipPage ship={ship} hostname="review.preview.local" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(ship.titleTail);
    expect(document.querySelectorAll('img[src=""]')).toHaveLength(0);
    for (const selector of ['.gallery + .media-credit', '.experience-media .media-credit', '.cabin-grid + .media-credit', '#albumDialog > .media-credit', '#galleryDialog > .media-credit']) {
      const credit = document.querySelector(selector);
      expect(credit).toHaveTextContent(ship.lineName);
      expect(credit?.querySelector('a')).toBeNull(); expect(credit?.textContent).toContain('Fonte: site oficial da companhia.');
    }
    expect(document.querySelectorAll('.album-grid .media-credit, .lightbox-thumbs .media-credit')).toHaveLength(0);
    if (ship.routes.feed.sailings.length) {
      expect(document.querySelector('#itineraryMap')).not.toBeNull();
      fireEvent.click(screen.getByText('Quero orçamento deste roteiro'));
      expect(screen.getByLabelText('Roteiro de interesse')).toHaveValue((screen.getByLabelText('Destinos') as HTMLSelectElement).value);
      expect(screen.getByLabelText('Data de saída')).toBeInTheDocument();
    } else {
      expect(document.querySelector('#itineraryMap')).toBeNull();
      expect(screen.queryByLabelText('Data de saída')).toBeNull();
      fireEvent.click(screen.getAllByText('Consultar saídas')[0]);
      expect(screen.getByLabelText('Roteiro de interesse')).toHaveValue(`seasonal:${ship.routes.summaries![0].title}`);
    }
  });
  it('keeps dated routes source-backed with complete coordinates and valid durations', () => {
    const dated = ships.filter(s => s.routes.feed.sailings.length);
    expect(dated).toHaveLength(8);
    for (const s of dated) {
      const feed = s.routes.feed.sailings;
      expect(new Set(feed.map(r => r.date)).size).toBe(feed.length);
      for (const r of feed) {
        expect(r.source).toMatch(/^https:\/\//);
        expect(r.n).toBeGreaterThan(0);
        expect(r.ports.at(-1)).toBe(r.ports[0]);
        for (const p of r.ports) expect(s.routes.coordinates[p], p).toHaveLength(2);
      }
      const groups = buildItineraryGroups(feed, s.routes);
      expect(groups.flatMap(g => g.variants.flatMap(v => v.sailings))).toHaveLength(feed.length);
      for (const g of groups) expect(s.routes.regions).toContain(g.region);
    }
    const buenavista = dated.find(s => s.shipSlug === 'buenavista')!;
    expect(buenavista.routes.feed.sailings.map(s => s.date)).not.toContain('2026-11-20');
    // Suspensão comunicada pela companhia em 6/11: o catálogo estático ainda listava esta saída.
    expect(buenavista.routes.feed.sailings.map(s => s.date)).not.toContain('2026-11-09');
    expect(buenavista.routes.feed.sailings.filter(s => s.n === 7)).toHaveLength(5);
  });
  it('shows all advertised Brazilian durations even when a complete route is unavailable', () => {
    const expected: Record<string, number[]> = {
      'msc-virtuosa': [3, 7], 'msc-divina': [3, 4, 5], 'msc-musica': [3, 4, 7],
      'msc-splendida': [8, 9], 'msc-seaview': [3, 7, 8],
      'costa-diadema': [3, 4, 7], 'costa-serena': [8, 9], 'buenavista': [3, 4, 5, 7],
    };
    for (const ship of ships) {
      const durations = [...new Set([...ship.routes.feed.sailings.map(s => s.n), ...(ship.routes.announcements ?? []).map(a => a.n)])].sort((a,b) => a-b);
      expect(durations, ship.shipName).toEqual(expected[ship.shipSlug]);
    }
  });
  it('maps Nordeste and Carnaval separately with their own dates and documented return', () => {
    const ship = ships.find(s => s.shipSlug === 'buenavista')!;
    render(<CruiseShipPage ship={ship} hostname="review.preview.local" />);
    fireEvent.change(screen.getByLabelText('Duração'), { target: { value: '7' } });
    const options = [...screen.getByLabelText('Destinos').querySelectorAll('option')];
    expect(options.map(o => o.textContent)).toEqual(['Nordeste', 'Carnaval']);
    expect(document.querySelector('.route-explorer')).not.toHaveAttribute('hidden');
    expect(screen.getByTestId('route-details')).toHaveTextContent('desembarque em Santos');
    expect(screen.getByTestId('route-details')).toHaveTextContent('Pernoite em Salvador');
    fireEvent.click(screen.getByRole('button', { name: 'Quero orçamento deste roteiro' }));
    expect([...screen.getByLabelText('Data de saída').querySelectorAll('option')].map(o => o.value)).toEqual(['','2027-01-04','2027-01-11','2027-01-18','2027-01-25']);
    fireEvent.change(screen.getByLabelText('Destinos'), { target: { value: options[1].value } });
    fireEvent.click(screen.getByRole('button', { name: 'Quero orçamento deste roteiro' }));
    expect([...screen.getByLabelText('Data de saída').querySelectorAll('option')].map(o => o.value)).toEqual(['','2027-02-05']);
    expect(screen.queryByTestId('announced-route')).not.toBeInTheDocument();
    const routes = buildItineraryGroups(ship.routes.feed.sailings, ship.routes).filter(g => g.n === 7);
    expect(routes).toHaveLength(2);
    routes.forEach(g => expect(g.variants[0].ports).toEqual(['Santos','Rio de Janeiro','Salvador','Ilhabela','Santos']));
  });
  it('shows Divina five-night announcement without fabricating dated departures', () => {
    render(<CruiseShipPage ship={ships.find(s => s.shipSlug === 'msc-divina')!} hostname="review.preview.local" />);
    fireEvent.change(screen.getByLabelText('Duração'), { target: { value: '5' } });
    expect(screen.getByTestId('announced-route')).toHaveTextContent('Minicruzeiro de cinco noites');
    expect(screen.getByTestId('announced-route')).not.toHaveTextContent('Saídas anunciadas de Santos');
    fireEvent.click(screen.getByRole('button', { name: 'Consultar este roteiro' }));
    expect(screen.getByLabelText('Roteiro de interesse')).toHaveValue('announced:minicruzeiro-5');
  });
  it('keeps departure ports separate even when destinations and duration match', () => {
    const routes = ships[0].routes;
    const groups = buildItineraryGroups([
      { date: '2027-01-01', n: 3, ports: ['Santos', 'Búzios', 'Santos'], status: 'published' },
      { date: '2027-01-01', n: 3, ports: ['Rio de Janeiro', 'Búzios', 'Rio de Janeiro'], status: 'published' },
    ], routes);
    expect(groups).toHaveLength(2);
    expect(groups.map(g => g.title)).toEqual(['Búzios · Saída de Santos', 'Búzios · Saída de Rio de Janeiro']);
  });
  it('uses the selected departure port in the page and quote form', () => {
    const ship = ships.find(s => s.shipSlug === 'msc-virtuosa')!;
    const groups = buildItineraryGroups(ship.routes.feed.sailings, ship.routes);
    const salvador = groups.find(g => g.variants[0].ports[0] === 'Salvador')!;
    render(<CruiseShipPage ship={ship} hostname="review.preview.local" />);
    fireEvent.change(screen.getByLabelText('Duração'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('Destinos'), { target: { value: salvador.id } });
    expect(screen.getByTestId('route-details')).toHaveTextContent('Embarque em Salvador e desembarque em Salvador.');
    fireEvent.click(screen.getByText('Quero orçamento deste roteiro'));
    expect(screen.getByLabelText('Roteiro de interesse')).toHaveValue(salvador.id);
    const dates = Array.from((screen.getByLabelText('Data de saída') as HTMLSelectElement).options).map(o => o.value).filter(Boolean);
    expect(dates).toEqual(salvador.variants[0].sailings.map(s => s.date));
  });
  it('photo-only gallery wraps without displaying a nonexistent video', () => {
    const original = ships[0];
    const s = { ...original, hero: { ...original.hero, video: null } };
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
