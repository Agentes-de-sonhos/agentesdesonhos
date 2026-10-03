import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { HotelPhoto } from "./types";

export function HotelGallery({ photos, hotelName }: { photos: HotelPhoto[]; hotelName: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const total = photos.length;

  const go = useCallback(
    (delta: number) => setOpen((i) => (i === null ? i : (i + delta + total) % total)),
    [total],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  const [touchX, setTouchX] = useState<number | null>(null);

  if (!total) return null;
  const [main, side1, side2] = photos;
  const thumbs = photos.slice(3, 8);

  const Tile = ({ i, className, eager }: { i: number; className?: string; eager?: boolean }) => (
    <button
      type="button"
      onClick={() => setOpen(i)}
      className={`group relative overflow-hidden rounded-xl bg-muted ${className ?? ""}`}
      aria-label={`Ampliar foto ${i + 1}`}
    >
      <img
        src={photos[i].url}
        alt={photos[i].alt}
        loading={eager ? "eager" : "lazy"}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
    </button>
  );

  return (
    <>
      {/* Mobile: carrossel deslizante */}
      <div className="md:hidden">
        <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {photos.map((p, i) => (
            <button key={i} type="button" onClick={() => setOpen(i)} className="relative aspect-[4/3] w-[85%] shrink-0 snap-center overflow-hidden rounded-xl bg-muted">
              <img src={p.url} alt={p.alt} loading={i ? "lazy" : "eager"} className="h-full w-full object-cover" />
              <span className="absolute bottom-2 right-2 rounded-full bg-foreground/70 px-2 py-0.5 text-xs text-background">{i + 1}/{total}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: mosaico */}
      <div className="hidden gap-2 md:grid">
        <div className="grid h-[420px] grid-cols-[2.2fr_1fr] gap-2">
          <Tile i={0} eager className="h-full" />
          <div className="grid grid-rows-2 gap-2">
            {side1 ? <Tile i={1} /> : <div className="rounded-xl bg-muted" />}
            {side2 ? <Tile i={2} /> : <div className="rounded-xl bg-muted" />}
          </div>
        </div>
        {thumbs.length > 0 && (
          <div className="grid h-[140px] grid-cols-5 gap-2">
            {thumbs.map((_, k) => {
              const i = k + 3;
              const last = k === thumbs.length - 1;
              return last ? (
                <button key={i} type="button" onClick={() => setOpen(0)} className="relative overflow-hidden rounded-xl bg-muted">
                  <img src={photos[i].url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  <span className="absolute inset-0 grid place-items-center bg-foreground/45 text-sm font-semibold text-background">
                    <span className="flex items-center gap-1.5"><Images className="h-4 w-4" />Ver todas as fotos</span>
                  </span>
                </button>
              ) : (
                <Tile key={i} i={i} />
              );
            })}
          </div>
        )}
      </div>
      {total > 1 && (
        <button type="button" onClick={() => setOpen(0)} className="mt-2 flex items-center gap-1.5 text-sm font-medium text-primary md:hidden">
          <Images className="h-4 w-4" /> Ver todas as {total} fotos
        </button>
      )}
      {void main}

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-5xl border-0 bg-foreground p-0 text-background [&>button]:hidden">
          <DialogTitle className="sr-only">Fotos de {hotelName}</DialogTitle>
          {open !== null && (
            <div
              className="relative"
              onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
              onTouchEnd={(e) => {
                if (touchX === null) return;
                const dx = e.changedTouches[0].clientX - touchX;
                if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
                setTouchX(null);
              }}
            >
              <img src={photos[open].url} alt={photos[open].alt} className="max-h-[80vh] w-full rounded-t-lg object-contain" />
              <button type="button" onClick={() => setOpen(null)} aria-label="Fechar" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-background/90 text-foreground">
                <X className="h-4 w-4" />
              </button>
              {total > 1 && (
                <>
                  <button type="button" onClick={() => go(-1)} aria-label="Foto anterior" className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-background/90 text-foreground">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button type="button" onClick={() => go(1)} aria-label="Próxima foto" className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-background/90 text-foreground">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <span>{photos[open].alt}</span>
                <span>{open + 1} / {total}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
