import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** ISO codes for flag images; unknown names render a text-only card. */
const FLAG_CODES: Record<string, string> = {
  Brasil: "br", "Estados Unidos": "us", Canadá: "ca", México: "mx", Itália: "it", Suíça: "ch",
  Espanha: "es", Portugal: "pt", Inglaterra: "gb-eng", Montenegro: "me", Croácia: "hr", França: "fr",
  Argentina: "ar", Chile: "cl", Paraguai: "py", Bahamas: "bs", "República Dominicana": "do",
  Colômbia: "co", Indonésia: "id", Vaticano: "va",
};

export function VisitedFlagsCarousel({ title, names }: { title: string; names: string[] }) {
  const track = useRef<HTMLUListElement>(null);
  const [paused, setPaused] = useState(false);

  const scroll = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const step = el.clientWidth * 0.8;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    if (dir === 1 && atEnd) el.scrollTo({ left: 0, behavior: "smooth" });
    else el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => scroll(1), 3500);
    return () => window.clearInterval(id);
  }, [paused]);

  return (
    <div className="mt-8 w-full min-w-0 overflow-hidden border-t border-border pt-6" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <div className="flex gap-2">
          <button type="button" aria-label="Países anteriores" onClick={() => scroll(-1)} className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background text-primary transition hover:bg-primary hover:text-primary-foreground">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Próximos países" onClick={() => scroll(1)} className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background text-primary transition hover:bg-primary hover:text-primary-foreground">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <ul ref={track} className="mt-4 flex snap-x gap-3 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {names.map((n) => {
          const code = FLAG_CODES[n];
          return (
            <li key={n} className="w-[5.5rem] shrink-0 snap-start">
              <div className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-background p-2.5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md">
                {code ? (
                  <img src={`https://flagcdn.com/w160/${code}.png`} alt={`Bandeira: ${n}`} loading="lazy" width={64} height={44} className="h-11 w-16 rounded-md object-cover ring-1 ring-border transition duration-300 group-hover:scale-105" />
                ) : <span className="h-11 w-16 rounded-md bg-muted" aria-hidden="true" />}
                <span className="text-center text-[11px] font-semibold leading-tight text-muted-foreground group-hover:text-foreground">{n}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
