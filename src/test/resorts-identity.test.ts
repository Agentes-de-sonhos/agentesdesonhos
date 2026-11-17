import { describe, it, expect } from 'vitest';
import { getResortPage } from '@/components/hotel-page/resortsCatalog';
import { BRAZIL_RESORTS } from '@/components/resorts-brasil/resortsData';

describe('shared resort identities', () => {
  it('keeps Clara Ibiúna content separate from Dourado', () => {
    const p = getResortPage('clara-resorts')!;
    expect(p.name).toContain('Ibiúna');
    expect(p.city).toContain('Ibiúna');
    expect(JSON.stringify(p.description)).not.toMatch(/Dourado|Vila do Lago/);
    expect(JSON.stringify(p.description)).toContain('Itupararanga');
  });
  it('does not assign Curitiba photos or reviews to Mabu Thermas', () => {
    const p = getResortPage('mabu-hoteis-resorts')!;
    expect(p.name).toBe('Mabu Thermas Grand Resort');
    expect(p.city).toBe('Foz do Iguaçu');
    expect(p.google).toBeUndefined();
    expect(p.photos.length).toBeGreaterThan(0);
    expect(p.photos.every(x => x.url.startsWith('/resorts/mabu-thermas/'))).toBe(true);
    expect(p.location?.mapsUrl).toContain('Thermas');
  });
  it('resolves every historical catalog slug without duplicates', () => {
    expect(new Set(BRAZIL_RESORTS.map(r => r.slug)).size).toBe(BRAZIL_RESORTS.length);
    for (const r of BRAZIL_RESORTS) expect(getResortPage(r.slug),r.slug).not.toBeNull();
  });
  it('qualifies complex descriptions with the actual unit', () => {
    expect(getResortPage('rio-quente-resorts')?.description[0]).toContain('Hotel Pousada');
    expect(getResortPage('costa-do-sauipe-resorts')?.description[0]).toContain('Terra Resort');
  });
});
