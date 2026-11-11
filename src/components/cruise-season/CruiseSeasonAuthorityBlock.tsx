import { ArrowRight, Compass } from 'lucide-react';
import { agencySiteHref } from '@/lib/agencyContextLink';
import { cruiseShipPath } from '@/lib/cruiseShips';
import { SEASON_PATH, SEASON_SHIPS } from '@/lib/cruiseShips/season';

/** Season gallery shown inside the dark cruise (authority) section; opt-in per profile. */
export function CruiseSeasonAuthorityBlock({ container }: { container: string }) {
  return (
    <div className={`${container} pt-14 pb-10 md:pt-24 md:pb-14`} data-testid="cruise-season-authority">
      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--wl-red))]">Temporada brasileira 2026–2027</p>
          <h2 id="cruise-home-title" className="mt-4 text-3xl font-semibold leading-tight text-background md:text-[2.6rem]">Seu próximo destino começa a bordo.</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-background/80 md:text-base">Oito navios. Diferentes formas de viver o mar. Conheça as experiências, as cabines e os roteiros da MSC, Costa e Corazul para a temporada brasileira.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row md:shrink-0">
          <a href={agencySiteHref(SEASON_PATH)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">Ver os oito navios <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
          <a href={agencySiteHref(`${SEASON_PATH}#cs-assistente`)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-background/40 px-5 py-3 text-sm font-semibold text-background transition-colors hover:bg-background/10"><Compass className="h-4 w-4" aria-hidden="true" />Qual cruzeiro combina com você?</a>
        </div>
      </div>
      <ul aria-label="Galeria dos oito navios" className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 md:grid md:grid-cols-4 md:gap-5 md:overflow-visible md:pb-0">
        {SEASON_SHIPS.map(ship => (
          <li key={ship.shipSlug} className="w-[78%] shrink-0 snap-start sm:w-[45%] md:w-auto">
            <a href={agencySiteHref(cruiseShipPath(ship))} className="group block overflow-hidden rounded-2xl bg-background shadow-lg ring-1 ring-background/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
              <div className="aspect-[4/3] overflow-hidden">
                <img src={ship.assets[ship.hero.image] || ship.hero.image} alt={ship.hero.alt} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
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
        ))}
      </ul>
      <p className="mt-4 text-xs text-background/60">Imagens de divulgação de {Array.from(new Set(SEASON_SHIPS.map(s => s.lineName))).join(' · ')}</p>
    </div>
  );
}
