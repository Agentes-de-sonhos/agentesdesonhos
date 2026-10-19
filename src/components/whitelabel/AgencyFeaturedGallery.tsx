import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { AgencyFeaturedImage } from "@/lib/agencySiteProfile";

/** Galeria elegante com troca automática (pausa ao passar o mouse/foco). */
export function AgencyFeaturedGallery({
  images,
  intervalMs = 6000,
  badge,
}: {
  images: AgencyFeaturedImage[];
  intervalMs?: number;
  badge?: AgencyFeaturedImage | null;
}) {
  const [index, setIndex] = useState(0);
  const [hover, setHover] = useState(false);
  const [paused, setPaused] = useState(false);
  const total = images.length;
  const go = useCallback((d: number) => setIndex((i) => (i + d + total) % total), [total]);

  useEffect(() => {
    if (paused || hover || total < 2) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = window.setTimeout(() => go(1), intervalMs);
    return () => window.clearTimeout(t);
  }, [index, paused, hover, total, intervalMs, go]);

  const current = images[index];

  return (
    <div
      className="relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      data-testid="featured-gallery"
    >
      <div
        className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-muted shadow-xl sm:aspect-[4/3]"
        role="region"
        aria-roledescription="carrossel"
        aria-label="Galeria de fotos"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") go(-1);
          if (e.key === "ArrowRight") go(1);
        }}
      >
        {images.map((img, i) => (
          <div
            key={img.src}
            className={`absolute inset-0 transition-opacity duration-1000 ${i === index ? "opacity-100" : "opacity-0"}`}
            aria-hidden={i !== index}
          >
            <img src={img.src} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl opacity-60" />
            <img
              src={img.src}
              alt={img.alt}
              loading={i < 2 ? "eager" : "lazy"}
              decoding="async"
              className="relative h-full w-full object-contain"
              style={{ objectPosition: img.position ?? "center" }}
            />
          </div>
        ))}

        {badge && (
          <img
            src={badge.src}
            alt={badge.alt}
            className="absolute right-4 top-4 z-10 w-28 max-w-[36%] rounded-xl bg-background/95 object-contain p-2 shadow-lg ring-1 ring-border/60 md:w-36"
          />
        )}

        {total > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Foto anterior"
              className="absolute left-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-background/85 text-foreground shadow-md backdrop-blur transition hover:bg-background">
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Próxima foto"
              className="absolute right-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-background/85 text-foreground shadow-md backdrop-blur transition hover:bg-background">
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
            <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-3 bg-gradient-to-t from-foreground/60 to-transparent px-4 pb-3 pt-10">
              <button type="button" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Retomar galeria" : "Pausar galeria"}
                className="grid h-8 w-8 place-items-center rounded-full bg-background/85 text-foreground">
                {paused ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
              </button>
              <div className="flex flex-wrap justify-end gap-1.5">
                {images.map((img, i) => (
                  <button key={img.src} type="button" onClick={() => setIndex(i)} aria-label={`Ver foto ${i + 1} de ${total}`}
                    aria-current={i === index}
                    className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-background" : "w-1.5 bg-background/60"}`} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      <p className="sr-only" aria-live="polite">{current ? `Foto ${index + 1} de ${total}: ${current.alt}` : ""}</p>
    </div>
  );
}
