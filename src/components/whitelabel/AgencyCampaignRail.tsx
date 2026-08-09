import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

export interface AgencyCampaignItem {
  key: string;
  title: string;
  text: string;
  service: string;
  imageSrc: string;
}

/**
 * Faixa editorial de campanhas do site white label (preset travel-editorial).
 * Rail único com scroll-snap: 3 itens visíveis no desktop, 4 em telas largas e
 * cards confortáveis no mobile. Setas discretas apenas como atalho — o rail é
 * navegável por teclado (cada card é um botão) e respeita reduced-motion.
 */
export function AgencyCampaignRail({
  items,
  onSelect,
}: {
  items: AgencyCampaignItem[];
  onSelect: (service: string) => void;
}) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 8);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    sync();
  }, [sync, items.length]);

  const scrollByPage = useCallback((direction: -1 | 1) => {
    const el = railRef.current;
    if (!el) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    el.scrollBy({
      left: direction * el.clientWidth * 0.85,
      behavior: reduced ? "auto" : "smooth",
    });
  }, []);

  return (
    <div className="relative">
      <div className="mb-5 hidden justify-end gap-2 md:flex">
        <button
          type="button"
          aria-label="Campanhas anteriores"
          onClick={() => scrollByPage(-1)}
          disabled={atStart}
          className="grid h-10 w-10 place-items-center rounded-full border border-foreground/15 text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-35 disabled:hover:border-foreground/15 disabled:hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Próximas campanhas"
          onClick={() => scrollByPage(1)}
          disabled={atEnd}
          className="grid h-10 w-10 place-items-center rounded-full border border-foreground/15 text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-35 disabled:hover:border-foreground/15 disabled:hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div
        ref={railRef}
        onScroll={sync}
        className="wl-rail -mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-2 md:mx-0 md:px-0"
      >
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(item.service)}
            className="group relative w-[78vw] shrink-0 snap-start overflow-hidden rounded-xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-[46vw] md:w-[calc((100%-2.5rem)/3)] xl:w-[calc((100%-3.75rem)/4)]"
          >
            <div className="relative aspect-[4/5] w-full overflow-hidden">
              <img
                src={item.imageSrc}
                alt={item.title}
                loading="lazy"
                width={800}
                height={1000}
                className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(220_12%_8%/0.88)] via-[hsl(220_12%_8%/0.3)] to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <h3 className="text-xl font-bold leading-tight text-background">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-background/80">{item.text}</p>
                <span className="mt-4 inline-flex items-center border-b border-background/40 pb-0.5 text-sm font-semibold text-background">
                  Solicitar atendimento
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
