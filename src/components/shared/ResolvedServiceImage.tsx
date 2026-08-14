import type { ReactNode } from "react";
import { ImageOff, Loader2 } from "lucide-react";
import { useServiceImages } from "@/hooks/useServiceImages";
import { cn } from "@/lib/utils";

/**
 * Primitiva compartilhada para exibir uma referência de imagem de serviço.
 *
 * Aceita URLs estáveis do Storage e referências `gplace://{place_id}/{index}`,
 * resolvendo-as em tempo de execução via `useServiceImages`. Nunca entrega o
 * valor bruto (`gplace://…`) ao `<img src>` — em caso de falha, aplica um
 * fallback visual e marca a referência como indisponível.
 */
export function useResolvedServiceImage(imageRef?: string | null, placeId?: string | null) {
  const refs = imageRef ? [imageRef] : [];
  const { usable, loading, markFailed } = useServiceImages(refs, placeId);
  const item = usable[0];
  return {
    src: item?.src ?? null,
    ref: item?.ref ?? null,
    loading,
    markFailed,
    onError: () => item?.ref && markFailed(item.ref),
  };
}

interface ResolvedServiceThumbProps {
  /** Valor persistido: URL do Storage ou referência `gplace://`. */
  imageRef?: string | null;
  placeId?: string | null;
  alt: string;
  /** Classes aplicadas ao <img> e ao fallback (mesma caixa visual). */
  className?: string;
  /** Fallback customizado quando não houver imagem utilizável. */
  fallback?: ReactNode;
  eager?: boolean;
}

export function ResolvedServiceThumb({
  imageRef,
  placeId,
  alt,
  className,
  fallback,
  eager,
}: ResolvedServiceThumbProps) {
  const { src, loading, onError } = useResolvedServiceImage(imageRef, placeId);

  if (!src) {
    if (fallback !== undefined) return <>{fallback}</>;
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-1 bg-muted/50 text-muted-foreground",
          className,
        )}
        role="img"
        aria-label={alt}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImageOff className="h-4 w-4 opacity-60" />
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={onError}
      className={className}
    />
  );
}
