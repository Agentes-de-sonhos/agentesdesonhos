import { useCallback, useEffect, useRef, useState } from "react";
import type { AgencyFeaturedImage } from "@/lib/agencySiteProfile";

/**
 * Galeria no formato Stories: barras segmentadas no topo que preenchem
 * durante o tempo de cada foto; toque à esquerda volta, à direita avança;
 * passar o mouse ou segurar o toque pausa.
 */
export function AgencyStoriesGallery({
  images,
  intervalMs = 5000,
  badge,
}: {
  images: AgencyFeaturedImage[];
  intervalMs?: number;
  badge?: AgencyFeaturedImage | null;
}) {
  const total = images.length;
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0); // 0..1 da foto atual
  const [paused, setPaused] = useState(false);
  const [reduce, setReduce] = useState(false);
  const elapsedRef = useRef(0);

  useEffect(() => {
    setReduce(!!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const goTo = useCallback(
    (i: number) => {
      elapsedRef.current = 0;
      setProgress(0);
      setIndex(((i % total) + total) % total);
    },
    [total],
  );

  useEffect(() => {
    if (paused || reduce || total < 2) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      elapsedRef.current += now - last;
      last = now;
      const p = Math.min(elapsedRef.current / intervalMs, 1);
      setProgress(p);
      if (p >= 1) {
        goTo(index + 1);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [index, paused, reduce, total, intervalMs, goTo]);

  const current = images[index];

  return (
    <div className="relative" data-testid="featured-gallery-stories">
      <div
        className="relative aspect-[4/5] select-none overflow-hidden rounded-3xl bg-muted shadow-xl sm:aspect-[4/3]"
        role="region"
        aria-roledescription="carrossel"
        aria-label="Galeria de fotos"
        tabIndex={0}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") goTo(index - 1);
          if (e.key === "ArrowRight") goTo(index + 1);
          if (e.key === " ") {
            e.preventDefault();
            setPaused((p) => !p);
          }
        }}
      >
        {images.map((img, i) => (
          <div
            key={img.src}
            className={`absolute inset-0 transition-opacity duration-500 ${i === index ? "opacity-100" : "opacity-0"}`}
            aria-hidden={i !== index}
          >
            <img src={img.src} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl opacity-60" />
            <img
              src={img.src}
              alt={img.alt}
              loading={i < 2 ? "eager" : "lazy"}
              decoding="async"
              draggable={false}
              className="relative h-full w-full object-contain"
              style={{ objectPosition: img.position ?? "center" }}
            />
          </div>
        ))}

        {/* Sombra superior para legibilidade das barras */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-foreground/45 to-transparent" aria-hidden />

        {/* Áreas de toque: esquerda volta, direita avança */}
        {total > 1 && (
          <>
            <button
              type="button"
              aria-label="Foto anterior"
              className="absolute inset-y-0 left-0 z-10 w-1/3 cursor-w-resize focus:outline-none"
              onClick={() => goTo(index - 1)}
              onPointerDown={(e) => e.pointerType === "touch" && setPaused(true)}
              onPointerUp={(e) => e.pointerType === "touch" && setPaused(false)}
              onPointerCancel={() => setPaused(false)}
            />
            <button
              type="button"
              aria-label="Próxima foto"
              className="absolute inset-y-0 right-0 z-10 w-2/3 cursor-e-resize focus:outline-none"
              onClick={() => goTo(index + 1)}
              onPointerDown={(e) => e.pointerType === "touch" && setPaused(true)}
              onPointerUp={(e) => e.pointerType === "touch" && setPaused(false)}
              onPointerCancel={() => setPaused(false)}
            />
          </>
        )}

        {/* Barras de progresso */}
        {total > 1 && (
          <div className="absolute inset-x-3 top-3 z-20 flex gap-1 md:inset-x-4">
            {images.map((img, i) => {
              const fill = i < index ? 1 : i === index ? (reduce ? 1 : progress) : 0;
              return (
                <button
                  key={img.src}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Ver foto ${i + 1} de ${total}`}
                  aria-current={i === index}
                  className="flex-1 py-1.5"
                >
                  <span className="block h-[3px] overflow-hidden rounded-full bg-background/40">
                    <span className="block h-full rounded-full bg-background" style={{ width: `${fill * 100}%` }} />
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {badge && (
          <img
            src={badge.src}
            alt={badge.alt}
            className="pointer-events-none absolute right-4 top-9 z-20 w-28 max-w-[36%] rounded-xl bg-background/95 object-contain p-2 shadow-lg ring-1 ring-border/60 md:top-10 md:w-36"
          />
        )}
      </div>
      <p className="sr-only" aria-live="polite">{current ? `Foto ${index + 1} de ${total}: ${current.alt}` : ""}</p>
    </div>
  );
}
