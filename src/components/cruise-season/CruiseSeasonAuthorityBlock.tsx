import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Compass } from 'lucide-react';
import { agencySiteHref } from '@/lib/agencyContextLink';
import { cruiseShipPath } from '@/lib/cruiseShips';
import { SEASON_PATH, SEASON_SHIPS } from '@/lib/cruiseShips/season';
import { seasonCardPhoto } from '@/lib/cruiseShips/seasonCardPhotos';

/** Season gallery shown inside the dark cruise (authority) section; opt-in per profile. */
export function CruiseSeasonAuthorityBlock({ container }: { container: string }) {
  const listRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const update = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [update]);
  const scrollBy = (dir: 1 | -1) => {
    const el = listRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };
  const arrowCls = 'inline-flex h-11 w-11 items-center justify-center rounded-full border border-background/30 bg-background/10 text-background transition hover:bg-background hover:text-[hsl(var(--wl-navy))] disabled:pointer-events-none disabled:opacity-30';
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
      <div className="relative mt-8">
      <ul
        ref={listRef}
        onScroll={update}
        onPointerDown={e => { if (e.pointerType !== 'mouse' || !listRef.current) return; drag.current = { x: e.clientX, left: listRef.current.scrollLeft, moved: false }; }}
        onPointerMove={e => { const d = drag.current; const el = listRef.current; if (!d || !el) return; const dx = e.clientX - d.x; if (Math.abs(dx) > 5) { d.moved = true; el.style.scrollSnapType = 'none'; } el.scrollLeft = d.left - dx; }}
        onPointerUp={() => { if (listRef.current) listRef.current.style.scrollSnapType = ''; setTimeout(() => { drag.current = null; }, 0); }}
        onPointerLeave={() => { if (listRef.current) listRef.current.style.scrollSnapType = ''; if (drag.current && !drag.current.moved) drag.current = null; }}
        onClickCapture={e => { if (drag.current?.moved) { e.preventDefault(); e.stopPropagation(); } drag.current = null; }}
        onDragStart={e => e.preventDefault()}
        aria-label="Galeria dos oito navios"
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 md:gap-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SEASON_SHIPS.map(ship => {
          const src = seasonCardPhoto(ship);
          return (
            <li key={ship.shipSlug} className="w-[78%] shrink-0 snap-start sm:w-[45%] md:w-[30%] lg:w-[23.5%]">
              <a href={agencySiteHref(cruiseShipPath(ship))} className="group block overflow-hidden rounded-2xl bg-background shadow-lg ring-1 ring-background/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img src={src} alt={`${ship.shipName} navegando`} draggable={false} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
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
        <button type="button" aria-label="Navios anteriores" className={`${arrowCls} absolute left-0 top-[calc(50%-1.5rem)] z-10 hidden -translate-x-1/2 -translate-y-1/2 shadow-lg md:inline-flex`} disabled={edges.start} onClick={() => scrollBy(-1)}><ChevronLeft className="h-5 w-5" /></button>
        <button type="button" aria-label="Próximos navios" className={`${arrowCls} absolute right-0 top-[calc(50%-1.5rem)] z-10 hidden translate-x-1/2 -translate-y-1/2 shadow-lg md:inline-flex`} disabled={edges.end} onClick={() => scrollBy(1)}><ChevronRight className="h-5 w-5" /></button>
      </div>
      <p className="mt-4 text-xs text-background/60">Imagens de divulgação e Wikimedia Commons · {Array.from(new Set(SEASON_SHIPS.map(s => s.lineName))).join(' · ')}</p>
      <div className="mt-10 flex flex-col items-center justify-center gap-4 rounded-2xl border border-background/15 bg-background/5 px-6 py-5 text-center sm:flex-row sm:text-left">
        <p className="text-xl font-semibold text-background md:text-2xl">Em dúvida sobre o navio ideal para você?</p>
        <a href={agencySiteHref(`${SEASON_PATH}#cs-assistente`)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-background px-6 py-3 text-base font-semibold text-[hsl(var(--wl-navy))] shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"><Compass className="h-4 w-4" aria-hidden="true" />Qual cruzeiro combina com você?</a>
      </div>
    </div>
  );
}
