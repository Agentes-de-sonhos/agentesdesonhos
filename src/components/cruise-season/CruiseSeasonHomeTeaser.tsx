import { ArrowRight, Compass } from 'lucide-react';
import { agencySiteHref } from '@/lib/agencyContextLink';
import { SeasonGalleries } from './SeasonGalleries';
import { SEASON_PATH, SEASON_SHIPS } from '@/lib/cruiseShips/season';

/** Home opt-in is owned by AgencySiteHome; all branding comes from the tenant. */
export function CruiseSeasonHomeTeaser({ container }: { container: string }) {
  const hero = SEASON_SHIPS.find(s => s.shipSlug === 'msc-virtuosa')!;
  return <section id="temporada-cruzeiros" aria-labelledby="cruise-home-title" className="bg-background">
    <div className={`${container} py-14 md:py-24`}>
      <div className="grid min-w-0 overflow-hidden rounded-2xl border border-border bg-[color-mix(in_srgb,var(--brand-secondary)_6%,white)] lg:grid-cols-2">
        <div className="flex min-w-0 flex-col justify-center p-6 md:p-10 lg:p-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--brand-primary)]">Temporada brasileira 2026–2027</p>
          <h2 id="cruise-home-title" className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl">Seu próximo destino<br/>começa a bordo.</h2>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">Oito navios. Diferentes formas de viver o mar. Conheça as experiências, as cabines e os roteiros da MSC, Costa e Corazul para a temporada brasileira.</p>
          <div className="mt-7 flex flex-col gap-3 md:flex-row md:flex-wrap">
            <a href={agencySiteHref(SEASON_PATH)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[var(--brand-primary)] px-5 py-3 text-sm font-semibold text-[var(--brand-on-primary)] transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--brand-primary)]">Ver os oito navios <ArrowRight className="h-4 w-4" aria-hidden="true"/></a>
            <a href={agencySiteHref(`${SEASON_PATH}#cs-assistente`)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[var(--brand-primary)] px-5 py-3 text-sm font-semibold text-[var(--brand-primary)] transition-colors hover:bg-background"><Compass className="h-4 w-4" aria-hidden="true"/>Qual cruzeiro combina com você?</a>
          </div>
        </div>
        <figure className="hidden flex-col md:flex"><div className="relative min-h-[250px] flex-1 lg:min-h-[380px]">
          <img src={hero.assets[hero.hero.image]} alt="MSC Virtuosa em navegação" loading="lazy" className="h-full w-full object-cover absolute inset-0"/>
          </div><figcaption className="bg-background px-4 py-3 text-xs text-muted-foreground">MSC Virtuosa · Imagem: MSC Cruzeiros / Divulgação</figcaption></figure>
      </div>
      <SeasonGalleries />
    </div>
  </section>;
}
