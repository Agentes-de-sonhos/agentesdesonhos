import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Photo = { src: string; alt: string; caption?: string; position?: string };

/** Interactive "deck of cards" gallery: tap/drag to deal the next photo, arrows to go back. */
export function PhotoDeck({ photos, coverLabel = "Toque para revelar" }: { photos: Photo[]; coverLabel?: string }) {
  const [revealed, setRevealed] = useState(false);
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState<null | 1 | -1>(null);
  const [drag, setDrag] = useState(0);
  const [paused, setPaused] = useState(false);
  const start = useRef<number | null>(null);
  const total = photos.length;

  const go = (dir: 1 | -1) => {
    if (!revealed) { setRevealed(true); return; }
    if (total < 2 || leaving) return;
    setLeaving(dir);
    window.setTimeout(() => {
      setIndex((i) => (i + dir + total) % total);
      setLeaving(null);
      setDrag(0);
    }, 380);
  };

  useEffect(() => {
    if (!revealed || paused || total < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => go(1), 5000);
    return () => window.clearInterval(id);
  });

  const onDown = (e: React.PointerEvent) => { start.current = e.clientX; (e.target as Element).setPointerCapture?.(e.pointerId); };
  const onMove = (e: React.PointerEvent) => { if (start.current !== null) setDrag(e.clientX - start.current); };
  const onUp = () => {
    if (start.current === null) return;
    const d = drag; start.current = null;
    if (Math.abs(d) > 60) go(d < 0 ? 1 : -1);
    else { setDrag(0); if (Math.abs(d) < 6) go(1); }
  };

  const layers = Math.min(4, total);
  return (
    <div className="flex flex-col items-center gap-5" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="group relative aspect-[4/5] w-full max-w-[22rem] select-none [perspective:1200px]">
        {Array.from({ length: layers }).map((_, layer) => {
          const p = photos[(index + layer) % total];
          const isTop = layer === 0;
          const rot = [0, -5, 4, -2][layer];
          const fan = [0, -14, 14, -6][layer];
          let transform = `translate(${fan * 0.3}px, ${layer * 6}px) rotate(${rot}deg) scale(${1 - layer * 0.03})`;
          if (isTop && leaving) transform = `translate(${leaving * 130}%, -6%) rotate(${leaving * 18}deg)`;
          else if (isTop && drag) transform = `translateX(${drag}px) rotate(${drag / 18}deg)`;
          return (
            <figure
              key={`${p.src}-${layer}`}
              onPointerDown={isTop ? onDown : undefined}
              onPointerMove={isTop ? onMove : undefined}
              onPointerUp={isTop ? onUp : undefined}
              onPointerCancel={isTop ? onUp : undefined}
              className={`absolute inset-0 overflow-hidden rounded-2xl border-[6px] border-background bg-background shadow-xl ${isTop ? "cursor-grab active:cursor-grabbing touch-pan-y" : "pointer-events-none group-hover:[--fan:1]"} ${drag && isTop ? "" : "transition-transform duration-[380ms] ease-out"}`}
              style={{ transform, zIndex: layers - layer, opacity: isTop && leaving ? 0 : 1 }}
            >
              {revealed || !isTop ? (
                <>
                  <img src={p.src} alt={p.alt} draggable={false} loading="lazy" className={`h-full w-full object-cover ${revealed ? "" : "blur-sm brightness-75"}`} style={{ objectPosition: p.position ?? "center" }} />
                  {isTop && p.caption && <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/70 to-transparent p-4 text-sm font-semibold text-background">{p.caption}</figcaption>}
                </>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-primary text-primary-foreground">
                  <span className="rounded-full border border-primary-foreground/40 px-4 py-1 text-[11px] font-bold uppercase tracking-[0.2em]">{total} {total === 1 ? "foto" : "fotos"}</span>
                  <span className="text-lg font-semibold">{coverLabel}</span>
                </div>
              )}
            </figure>
          );
        })}
      </div>
      <div className="flex items-center gap-4">
        <button type="button" aria-label="Foto anterior" onClick={() => go(-1)} disabled={!revealed} className="grid h-10 w-10 place-items-center rounded-full border border-border bg-background text-primary transition hover:bg-primary hover:text-primary-foreground disabled:opacity-40">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[4rem] text-center text-xs font-semibold tabular-nums text-muted-foreground">
          {revealed ? `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}` : "Clique ou arraste"}
        </span>
        <button type="button" aria-label="Próxima foto" onClick={() => go(1)} className="grid h-10 w-10 place-items-center rounded-full border border-border bg-background text-primary transition hover:bg-primary hover:text-primary-foreground">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
