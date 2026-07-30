import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { GALLERY_COPY, GALLERY_MEDIA, type AgencyConfig } from "./content";
import videoAsset from "@/assets/landing/comandatuba/gallery/comandatuba-tour-aereo.mp4.asset.json";
import poster from "@/assets/landing/comandatuba/gallery/video-poster.webp";
import aerea from "@/assets/landing/comandatuba/gallery/aerea.webp";
import familia from "@/assets/landing/comandatuba/gallery/familia.webp";
import piscina from "@/assets/landing/comandatuba/gallery/piscina.webp";
import esporte from "@/assets/landing/comandatuba/gallery/esporte.webp";
import bemEstar from "@/assets/landing/comandatuba/gallery/bem-estar.webp";

const SOURCES: Record<string, string> = {
  "video-aereo": poster,
  aerea,
  familia,
  piscina,
  esporte,
  "bem-estar": bemEstar,
};

export function MediaGallery({ agency }: { agency: AgencyConfig }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);

  const total = GALLERY_MEDIA.length;
  const media = GALLERY_MEDIA[index];
  const isVideo = media.kind === "video";

  const go = useCallback(
    (dir: -1 | 1) => setIndex((c) => (c + dir + total) % total),
    [total]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    }
  };

  const openMedia = (e: React.MouseEvent<HTMLButtonElement>) => {
    triggerRef.current = e.currentTarget;
    setOpen(true);
  };

  // Pause + reset the video and restore focus when the dialog closes.
  useEffect(() => {
    if (open) return;
    const v = videoRef.current;
    if (v) {
      v.pause();
      try {
        v.currentTime = 0;
      } catch {
        /* noop */
      }
    }
    triggerRef.current?.focus();
  }, [open]);

  return (
    <div>
      <div
        className="group relative overflow-hidden rounded-2xl bg-slate-100 shadow-md"
        role="region"
        aria-roledescription="carrossel"
        aria-label={GALLERY_COPY.ariaLabel}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
          touchDeltaX.current = 0;
        }}
        onTouchMove={(e) => {
          touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
        }}
        onTouchEnd={() => {
          if (touchDeltaX.current < -50) go(1);
          else if (touchDeltaX.current > 50) go(-1);
          touchDeltaX.current = 0;
        }}
      >
        <button
          type="button"
          onClick={openMedia}
          aria-label={
            isVideo ? GALLERY_COPY.openVideo : GALLERY_COPY.openPhoto(media.caption)
          }
          className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{ ["--tw-ring-color" as string]: agency.primaryColor }}
        >
          <span className="block aspect-[3/4] w-full sm:aspect-[4/5] lg:aspect-[3/4]">
            <img
              src={SOURCES[media.key]}
              alt={media.alt}
              loading="lazy"
              width={1200}
              height={1600}
              className="h-full w-full object-cover transition-opacity duration-300 motion-reduce:transition-none"
              style={{ objectPosition: media.position }}
            />
          </span>
          {isVideo && (
            <>
              <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none">
                <Play className="h-6 w-6 translate-x-[1px]" style={{ color: agency.primaryColor }} />
              </span>
              <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                {GALLERY_COPY.videoBadge}
              </span>
            </>
          )}
        </button>

        <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          {index + 1} de {total}
        </span>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent pb-3 pt-10">
          <p className="px-4 text-[12.5px] font-medium leading-snug text-white">
            {media.caption}
          </p>
        </div>

        <button
          type="button"
          onClick={() => go(-1)}
          aria-label={GALLERY_COPY.prev}
          className="absolute left-2 top-1/2 flex h-10 w-10 min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-slate-800 shadow transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label={GALLERY_COPY.next}
          className="absolute right-2 top-1/2 flex h-10 w-10 min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-slate-800 shadow transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2">
        {GALLERY_MEDIA.map((m, i) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Ir para: ${m.caption}`}
            aria-current={i === index}
            className="h-2.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 motion-reduce:transition-none"
            style={{
              width: i === index ? 22 : 10,
              backgroundColor: i === index ? agency.primaryColor : "#cbd5e1",
              ["--tw-ring-color" as string]: agency.primaryColor,
            }}
          />
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl overflow-hidden border-0 bg-black p-0 [&>button]:hidden">
          <DialogTitle className="sr-only">{media.caption}</DialogTitle>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fechar"
            className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none"
          >
            <X className="h-5 w-5" />
          </button>
          {open && isVideo ? (
            <video
              ref={videoRef}
              src={videoAsset.url}
              poster={poster}
              controls
              playsInline
              preload="metadata"
              className="max-h-[80vh] w-full bg-black"
            />
          ) : (
            <img
              src={SOURCES[media.key]}
              alt={media.alt}
              className="max-h-[80vh] w-full bg-black object-contain"
            />
          )}
          <p className="bg-black px-4 py-3 text-center text-[13px] text-white/90">
            {media.caption}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}