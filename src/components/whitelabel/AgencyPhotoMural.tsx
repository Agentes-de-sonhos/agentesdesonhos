import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Mural panorâmico em loop: arrastar (mouse/toque) ou setas. */
export function AgencyPhotoMural({ src, alt }: { src: string; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number } | null>(null);

  const segment = () => (ref.current ? ref.current.scrollWidth / 3 : 0);
  const wrap = () => {
    const el = ref.current;
    const w = segment();
    if (!el || !w) return;
    if (el.scrollLeft < w * 0.5) el.scrollLeft += w;
    else if (el.scrollLeft > w * 1.5) el.scrollLeft -= w;
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const init = () => { el.scrollLeft = segment(); };
    const img = el.querySelector("img");
    if (img?.complete) init(); else img?.addEventListener("load", init, { once: true });
  }, [src]);

  const step = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    wrap();
    el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: "smooth" });
  };

  return (
    <div className="relative overflow-hidden rounded-xl bg-muted">
      <div
        ref={ref}
        role="region"
        aria-label={`${alt}. Arraste ou use as setas para navegar.`}
        tabIndex={0}
        onScroll={wrap}
        onKeyDown={(e) => { if (e.key === "ArrowRight") step(1); if (e.key === "ArrowLeft") step(-1); }}
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse" || !ref.current) return;
          drag.current = { x: e.clientX, left: ref.current.scrollLeft };
          ref.current.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current || !ref.current) return;
          ref.current.scrollLeft = drag.current.left - (e.clientX - drag.current.x);
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
        className="flex aspect-square cursor-grab select-none overflow-x-auto active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        {[0, 1, 2].map((i) => (
          <img
            key={i}
            src={src}
            alt={i === 1 ? alt : ""}
            aria-hidden={i === 1 ? undefined : true}
            draggable={false}
            loading="lazy"
            className="h-full w-auto max-w-none shrink-0"
          />
        ))}
      </div>
      {([-1, 1] as const).map((dir) => (
        <button
          key={dir}
          type="button"
          onClick={() => step(dir)}
          aria-label={dir === 1 ? "Ver próximas fotos" : "Ver fotos anteriores"}
          className={`absolute top-1/2 ${dir === 1 ? "right-3" : "left-3"} flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-md backdrop-blur transition hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary`}
        >
          {dir === 1 ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      ))}
    </div>
  );
}
