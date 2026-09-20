import { cn } from "@/lib/utils";

interface PostMediaGridProps {
  images: string[];
  onOpenImage?: (index: number) => void;
  authorName?: string | null;
}

export const POST_GRID_MAX_VISIBLE = 4;

/**
 * Grade de fotos no padrão das redes sociais:
 * 1 foto grande · 2 equilibradas · 3 (uma maior + duas menores) · 4 em 2x2 ·
 * mais de 4 mostra as quatro primeiras com overlay "+N" na última.
 */
export function PostMediaGrid({ images, onOpenImage, authorName }: PostMediaGridProps) {
  if (!images || images.length === 0) return null;

  const visible = images.slice(0, POST_GRID_MAX_VISIBLE);
  const remaining = images.length - visible.length;
  const count = images.length;

  const tile = (url: string, index: number, className?: string, ratio?: string) => {
    const isOverlay = remaining > 0 && index === POST_GRID_MAX_VISIBLE - 1;
    return (
      <button
        key={`${url}-${index}`}
        type="button"
        data-post-media-tile
        aria-label={isOverlay ? `Ver todas as ${count} imagens` : `Ampliar imagem ${index + 1} de ${count}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onOpenImage?.(index);
        }}
        className={cn("relative block w-full overflow-hidden bg-muted/40", ratio, className)}
      >
        <img
          src={url}
          alt={`Imagem ${index + 1} da publicação${authorName ? ` de ${authorName}` : ""}`}
          className={cn(
            count === 1
              ? "mx-auto max-h-[520px] w-auto max-w-full object-contain"
              : "absolute inset-0 h-full w-full object-cover",
          )}
          loading="lazy"
          decoding="async"
        />
        {isOverlay && (
          <span
            data-post-media-overlay
            className="absolute inset-0 flex items-center justify-center bg-foreground/60 text-lg font-semibold text-background"
          >
            +{remaining}
          </span>
        )}
      </button>
    );
  };

  if (count === 1) {
    return (
      <div className="w-full" data-post-media-grid="1">
        {tile(visible[0], 0)}
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="grid grid-cols-2 gap-0.5" data-post-media-grid="2">
        {visible.map((url, i) => tile(url, i, undefined, "aspect-square"))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="grid grid-cols-3 gap-0.5" data-post-media-grid="3">
        {tile(visible[0], 0, "col-span-2 row-span-2", "aspect-square")}
        <div className="col-span-1 grid grid-rows-2 gap-0.5">
          {tile(visible[1], 1, undefined, "aspect-square")}
          {tile(visible[2], 2, undefined, "aspect-square")}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-0.5" data-post-media-grid={remaining > 0 ? "4+" : "4"}>
      {visible.map((url, i) => tile(url, i, undefined, "aspect-square"))}
    </div>
  );
}
