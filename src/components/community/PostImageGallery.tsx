import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PostImageGalleryProps {
  images: string[];
  onOpenImage?: (url: string) => void;
  authorName?: string | null;
}

export function PostImageGallery({ images, onOpenImage, authorName }: PostImageGalleryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (!images || images.length === 0) return null;

  const scrollTo = (i: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const clamped = Math.max(0, Math.min(images.length - 1, i));
    const child = container.children[clamped] as HTMLElement | undefined;
    if (child) {
      container.scrollTo({ left: child.offsetLeft, behavior: "smooth" });
      setIndex(clamped);
    }
  };

  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;
    const w = container.clientWidth || 1;
    const i = Math.round(container.scrollLeft / w);
    if (i !== index) setIndex(i);
  };

  const single = images.length === 1;

  return (
    <div className="relative w-full bg-muted/40 group">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-none"
        style={{ scrollbarWidth: "none" }}
      >
        {images.map((url, i) => (
          <button
            key={`${url}-${i}`}
            type="button"
            onClick={() => onOpenImage?.(url)}
            className="snap-center shrink-0 w-full flex items-center justify-center"
            aria-label="Ampliar imagem"
          >
            <img
              src={url}
              alt={`Imagem ${i + 1} da publicação${authorName ? ` de ${authorName}` : ""}`}
              className="max-h-[320px] w-auto max-w-full object-contain"
              loading="lazy"
              decoding="async"
            />
          </button>
        ))}
      </div>

      {!single && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              scrollTo(index - 1);
            }}
            disabled={index === 0}
            className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 items-center justify-center rounded-full bg-background/80 border border-border/60 shadow-sm opacity-0 group-hover:opacity-100 transition disabled:opacity-0"
            aria-label="Imagem anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              scrollTo(index + 1);
            }}
            disabled={index === images.length - 1}
            className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 items-center justify-center rounded-full bg-background/80 border border-border/60 shadow-sm opacity-0 group-hover:opacity-100 transition disabled:opacity-0"
            aria-label="Próxima imagem"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[11px] font-medium">
            {index + 1} de {images.length}
          </div>
        </>
      )}
    </div>
  );
}

export function postImages(post: { image_urls?: string[] | null; image_url?: string | null }): string[] {
  if (post.image_urls && post.image_urls.length > 0) return post.image_urls;
  if (post.image_url) return [post.image_url];
  return [];
}