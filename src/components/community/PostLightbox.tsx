import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PostGallerySocialPanel, type PostGallerySocial } from "./PostGallerySocialPanel";

interface PostLightboxProps {
  images: string[];
  /** Índice inicial; `null` mantém a galeria fechada. */
  startIndex: number | null;
  onClose: () => void;
  authorName?: string | null;
  /** Dados/ações sociais da publicação (autor, curtidas, comentários, envio). */
  social?: PostGallerySocial;
}

const SWIPE_THRESHOLD = 40;

/**
 * Galeria em tela cheia: fundo escuro, imagem completa (object-contain),
 * gesto horizontal no touch, setas no desktop, teclado, indicador e fechar.
 * Fica acima da barra inferior mobile (z-index dedicado).
 */
export function PostLightbox({ images, startIndex, onClose, authorName, social }: PostLightboxProps) {
  const open = startIndex !== null && images.length > 0;
  const [index, setIndex] = useState(startIndex ?? 0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (startIndex !== null) setIndex(Math.min(Math.max(startIndex, 0), Math.max(images.length - 1, 0)));
  }, [startIndex, images.length]);

  const go = useCallback(
    (delta: number) => {
      setIndex((current) => {
        const next = current + delta;
        if (next < 0) return 0;
        if (next > images.length - 1) return images.length - 1;
        return next;
      });
    },
    [images.length],
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, go]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Galeria de imagens da publicação"
      data-post-lightbox
      className="fixed inset-0 z-[120] flex flex-col bg-foreground/95 lg:flex-row"
      onClick={onClose}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStartX.current;
        touchStartX.current = null;
        if (start === null) return;
        const delta = (event.changedTouches[0]?.clientX ?? start) - start;
        if (Math.abs(delta) < SWIPE_THRESHOLD) return;
        go(delta < 0 ? 1 : -1);
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-medium text-background" data-post-lightbox-indicator aria-live="polite">
          {index + 1} / {images.length}
        </span>
        <button
          type="button"
          aria-label="Fechar galeria"
          data-post-lightbox-close
          className="flex h-10 w-10 items-center justify-center rounded-full bg-background/15 text-background hover:bg-background/25"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-2 pb-6" onClick={(e) => e.stopPropagation()}>
        <img
          src={images[index]}
          alt={`Imagem ${index + 1} de ${images.length}${authorName ? ` da publicação de ${authorName}` : ""}`}
          className="max-h-full max-w-full object-contain"
        />

        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Imagem anterior"
              data-post-lightbox-prev
              disabled={index === 0}
              onClick={() => go(-1)}
              className={cn(
                "absolute left-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/15 text-background hover:bg-background/25 sm:flex",
                index === 0 && "opacity-30",
              )}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              aria-label="Próxima imagem"
              data-post-lightbox-next
              disabled={index === images.length - 1}
              onClick={() => go(1)}
              className={cn(
                "absolute right-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/15 text-background hover:bg-background/25 sm:flex",
                index === images.length - 1 && "opacity-30",
              )}
            >
              <ChevronRight className="h-6 w-6" />
            </button>

            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
              {images.map((url, i) => (
                <button
                  key={`${url}-dot-${i}`}
                  type="button"
                  aria-label={`Ir para a imagem ${i + 1}`}
                  aria-current={i === index}
                  onClick={() => setIndex(i)}
                  className={cn(
                    "h-2 w-2 rounded-full bg-background/40",
                    i === index && "w-4 bg-background",
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
      </div>

      {social && <PostGallerySocialPanel {...social} />}
    </div>
  );
}
