import { ArrowRight, Compass } from 'lucide-react';
import { agencySiteHref } from '@/lib/agencyContextLink';
import { cruiseShipPath } from '@/lib/cruiseShips';
import { SEASON_PATH, SEASON_SHIPS } from '@/lib/cruiseShips/season';
import diademaExterior from '@/assets/cruise-season/costa-diadema-exterior.jpg';
import buenavistaExterior from '@/assets/cruise-season/buenavista-exterior.jpg';
import aerialA from '@/assets/cruise-season/msc-ship-aerial-a.jpg';
import aerialB from '@/assets/cruise-season/msc-ship-aerial-b.jpg';
import aerialC from '@/assets/cruise-season/msc-ship-aerial-c.jpg';
import costaAerial from '@/assets/cruise-season/costa-ship-aerial.jpg';

/** Uniform card photo standard: whole ship at sea. `illustrative` = no official exterior photo yet. */
const CARD_PHOTOS: Record<string, { src?: string; asset?: string; illustrative?: boolean }> = {
  'msc-virtuosa': { asset: 'hero' },
  'msc-musica': { asset: 'hero' },
  'msc-divina': { src: aerialA, illustrative: true },
  'msc-splendida': { src: aerialB, illustrative: true },
  'msc-seaview': { src: aerialC, illustrative: true },
  'costa-diadema': { src: diademaExterior },
  'costa-serena': { src: costaAerial, illustrative: true },
  buenavista: { src: buenavistaExterior },
};

/** Season gallery shown inside the dark cruise (authority) section; opt-in per profile. */
export function CruiseSeasonAuthorityBlock({ container }: { container: string }) {
  return (
    <div className={`${container} pt-14 pb-10 md:pt-20 md:pb-4`} data-testid="cruise-season-authority">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-background/30 bg-background/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-background">
            <span className="h-2 w-2 rounded-full bg-[hsl(var(--wl-red))]" aria-hidden="true" />Temporada brasileira 2026/2027
          </p>
          <h2 id="cruise-home-title" className="mt-5 text-3xl font-semibold leading-tight text-background md:text-[2.4rem] lg:whitespace-nowrap">O próximo destino começa a bordo.</h2>
          <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-background/80 md:text-base">Oito navios. Diferentes formas de viver o mar. Conheça as experiências, as cabines e os roteiros da MSC, Costa e Corazul para a temporada brasileira.</p>
        </div>
        <a href={agencySiteHref(SEASON_PATH)} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 self-start rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 lg:self-end">Ver os oito navios <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
      </div>
      <ul aria-label="Galeria dos oito navios" className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 md:grid md:grid-cols-4 md:gap-5 md:overflow-visible md:pb-0">
        {SEASON_SHIPS.map(ship => {
          const photo = CARD_PHOTOS[ship.shipSlug];
          const src = photo?.src ?? (photo?.asset ? ship.assets[photo.asset] : undefined) ?? ship.assets[ship.hero.image] ?? ship.hero.image;
          return (
            <li key={ship.shipSlug} className="w-[78%] shrink-0 snap-start sm:w-[45%] md:w-auto">
              <a href={agencySiteHref(cruiseShipPath(ship))} className="group block overflow-hidden rounded-2xl bg-background shadow-lg ring-1 ring-background/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img src={src} alt={`${ship.shipName} navegando`} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  {photo?.illustrative && <span className="absolute bottom-2 right-2 rounded bg-foreground/60 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-background">Imagem ilustrativa</span>}
                </div>
                <div className="flex items-center justify-between gap-2 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{ship.lineName}</p>
                    <p className="truncate text-base font-semibold text-foreground">{ship.shipName}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </div>
              </a>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs text-background/60">Imagens de divulgação de {Array.from(new Set(SEASON_SHIPS.map(s => s.lineName))).join(' · ')}</p>
      <div className="mt-10 flex flex-col items-center justify-center gap-4 rounded-2xl border border-background/15 bg-background/5 px-6 py-5 text-center sm:flex-row sm:text-left">
        <p className="text-base text-background/90">Em dúvida sobre o navio ideal para você?</p>
        <a href={agencySiteHref(`${SEASON_PATH}#cs-assistente`)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-background/40 px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-background/10"><Compass className="h-4 w-4" aria-hidden="true" />Qual cruzeiro combina com você?</a>
      </div>
    </div>
  );
}
