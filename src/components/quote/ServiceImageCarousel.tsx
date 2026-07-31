import { useState, useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, X, ImageOff, Loader2 } from "lucide-react";
import { useServiceImages } from "@/hooks/useServiceImages";

interface ServiceImageCarouselProps {
  /** URLs do Storage e/ou referências `gplace://{place_id}/{i}` */
  images: string[];
  alt: string;
  disableExpand?: boolean;
  /** Place ID do Google, quando o serviço estiver vinculado a um lugar */
  placeId?: string | null;
  /** Oculta o bloco de fallback quando não houver nenhuma imagem utilizável */
  hideFallback?: boolean;
}

function ImageFallback({ alt, loading }: { alt: string; loading?: boolean }) {
  return (
    <div className="w-full aspect-[4/3] sm:h-56 lg:h-52 sm:aspect-auto rounded-xl border border-border/30 bg-gradient-to-br from-muted via-muted/60 to-primary/10 flex flex-col items-center justify-center gap-2 text-muted-foreground">
      {loading ? <Loader2 className="h-6 w-6 animate-spin opacity-60" /> : <ImageOff className="h-6 w-6 opacity-50" />}
      <span className="text-xs font-medium opacity-70 px-3 text-center line-clamp-2">{alt}</span>
      {!loading && <span className="text-[10px] uppercase tracking-wide opacity-60">Imagem ilustrativa</span>}
    </div>
  );
}

function GoogleAttribution({ attributions }: { attributions: string[] }) {
  return (
    <p className="mt-1 text-[10px] text-muted-foreground/80 leading-snug">
      Fotos: Google Maps
      {attributions.length > 0 && (
        <>
          {" · "}
          <span
            className="[&_a]:underline [&_a]:text-muted-foreground/80"
            dangerouslySetInnerHTML={{ __html: attributions.join(" · ") }}
          />
        </>
      )}
    </p>
  );
}

export function ServiceImageCarousel({ images, alt, disableExpand = false, placeId, hideFallback }: ServiceImageCarouselProps) {
  const { usable, loading, markFailed, hasGoogleImage, attributions } = useServiceImages(images, placeId);
  const srcs = usable.map((u) => u.src as string);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    dragFree: true,
    containScroll: "trimSnaps",
    align: "start",
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, onSelect]);

  useEffect(() => { emblaApi?.reInit(); }, [emblaApi, srcs.length]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => setLightboxOpen(false);

  const lightboxPrev = () => setLightboxIndex((prev) => (prev - 1 + srcs.length) % srcs.length);
  const lightboxNext = () => setLightboxIndex((prev) => (prev + 1) % srcs.length);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") lightboxPrev();
      if (e.key === "ArrowRight") lightboxNext();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [lightboxOpen, srcs.length]);

  if ((images || []).filter(Boolean).length === 0) return null;

  // Nenhuma imagem utilizável — nunca deixar ícone quebrado ou espaço vazio
  if (srcs.length === 0) {
    if (hideFallback && !loading) return null;
    return <ImageFallback alt={alt} loading={loading} />;
  }

  // Single image — no carousel needed
  if (srcs.length === 1) {
    return (
      <>
        <div
          className={`rounded-xl overflow-hidden border border-border/30 bg-muted ${!disableExpand ? "cursor-pointer" : ""}`}
          onClick={!disableExpand ? () => openLightbox(0) : undefined}
        >
          <img
            src={srcs[0]}
            alt={alt}
            className="w-full aspect-[4/3] sm:h-56 lg:h-52 sm:aspect-auto object-cover hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={() => markFailed(usable[0].ref)}
          />
        </div>
        {hasGoogleImage && <GoogleAttribution attributions={attributions} />}
        {!disableExpand && lightboxOpen && (
          <Lightbox
            images={srcs}
            index={lightboxIndex}
            onClose={closeLightbox}
            onPrev={lightboxPrev}
            onNext={lightboxNext}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="relative group">
        {/* Carousel */}
        <div ref={emblaRef} className="overflow-hidden rounded-xl">
          <div className="flex gap-2 sm:gap-3">
            {srcs.map((url, i) => (
              <div
                key={usable[i].ref}
                className={`flex-[0_0_88%] sm:flex-[0_0_55%] lg:flex-[0_0_38%] min-w-0 rounded-xl overflow-hidden border border-border/30 bg-muted ${!disableExpand ? "cursor-pointer" : ""}`}
                onClick={!disableExpand ? () => openLightbox(i) : undefined}
              >
                <img
                  src={url}
                  alt={`${alt} ${i + 1}`}
                  className="w-full aspect-[4/3] sm:h-56 lg:h-52 sm:aspect-auto object-cover hover:scale-[1.02] transition-transform duration-300"
                  loading="lazy"
                  onError={() => markFailed(usable[i].ref)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Navigation arrows — visible on hover / always on touch */}
        <button
          onClick={(e) => { e.stopPropagation(); scrollPrev(); }}
          className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/60 sm:flex hidden"
          aria-label="Anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); scrollNext(); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/60 sm:flex hidden"
          aria-label="Próxima"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Counter badge */}
        <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full pointer-events-none">
          {selectedIndex + 1} / {srcs.length}
        </div>
      </div>

      {hasGoogleImage && <GoogleAttribution attributions={attributions} />}

      {!disableExpand && lightboxOpen && (
        <Lightbox
          images={srcs}
          index={lightboxIndex}
          onClose={closeLightbox}
          onPrev={lightboxPrev}
          onNext={lightboxNext}
        />
      )}
    </>
  );
}

function Lightbox({
  images,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  images: string[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
        aria-label="Fechar"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Prev */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
          aria-label="Anterior"
        >
          <ChevronLeft className="h-7 w-7" />
        </button>
      )}

      {/* Image */}
      <img
        src={images[index]}
        alt={`Imagem ${index + 1}`}
        className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Next */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
          aria-label="Próxima"
        >
          <ChevronRight className="h-7 w-7" />
        </button>
      )}

      {/* Counter */}
      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-full">
          {index + 1} / {images.length}
        </div>
      )}
    </div>
  );
}
