import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Camera } from "lucide-react";
import { makeGplaceRef } from "@/lib/serviceImages";

interface GooglePhoto {
  url: string;
  thumb_url: string;
  width: number;
  height: number;
}

interface GoogleHotelPhotosProps {
  placeId: string | null;
  onPhotosSelected: (urls: string[]) => void;
  /** Called when a photo is deselected. If omitted, deselection only updates local state. */
  onPhotoRemoved?: (url: string) => void;
  existingUrls?: string[];
  autoShow?: boolean;
  /** Loading message. Default "Buscando fotos do hotel..." */
  loadingLabel?: string;
  /** Closed-state button label. Default "Sugerir fotos do Google ({n})" */
  buttonLabel?: string;
  /** Open-state heading. Default "Fotos do Google" */
  headingLabel?: string;
  /** Controlled use: always render the gallery open, without the toggle button. */
  alwaysOpen?: boolean;
  /** Controlled use: blocks new selections (e.g. gallery limit reached). */
  disabled?: boolean;
  /** Controlled use: hides the internal selected counter. */
  hideCounter?: boolean;
}

// In-memory cache to avoid re-fetching
const photoCache = new Map<string, GooglePhoto[]>();

export function GoogleHotelPhotos({
  placeId,
  onPhotosSelected,
  onPhotoRemoved,
  existingUrls = [],
  autoShow = false,
  loadingLabel = "Buscando fotos do hotel...",
  buttonLabel,
  headingLabel = "Fotos do Google",
  alwaysOpen = false,
  disabled = false,
  hideCounter = false,
}: GoogleHotelPhotosProps) {
  const [photos, setPhotos] = useState<GooglePhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const fetchedRef = useRef<string | null>(null);

  const [requested, setRequested] = useState(autoShow || alwaysOpen);

  useEffect(() => {
    // Nova seleção de lugar: descarta o estado anterior e NÃO busca fotos
    // automaticamente (cada busca é cobrada pelo Google).
    if (!placeId) return;
    if (placeId !== fetchedRef.current) {
      setPhotos([]);
      setShowGallery(false);
      setRequested(autoShow || alwaysOpen);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeId]);

  useEffect(() => {
    if (!placeId || !requested || placeId === fetchedRef.current) return;

    const cached = photoCache.get(placeId);
    if (cached) {
      setPhotos(cached);
      fetchedRef.current = placeId;
      if (cached.length > 0) setShowGallery(true);
      return;
    }

    fetchedRef.current = placeId;
    setLoading(true);
    setPhotos([]);

    supabase.functions.invoke("hotel-photos", { body: { place_id: placeId } })
      .then(({ data }) => {
        const fetched = data?.photos || [];
        setPhotos(fetched);
        photoCache.set(placeId, fetched);
        if (fetched.length > 0) setShowGallery(true);
      })
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false));
  }, [placeId, requested]);

  const togglePhoto = useCallback((index: number) => {
    const photo = photos[index];
    if (!photo || !placeId) return;
    // Persistimos apenas a referência estável — nunca a URL temporária do Google.
    const ref = makeGplaceRef(placeId, index);
    const isSelected = existingUrls.includes(ref) || existingUrls.includes(photo.url);
    if (isSelected) {
      onPhotoRemoved?.(existingUrls.includes(ref) ? ref : photo.url);
    } else {
      if (disabled) return;
      onPhotosSelected([ref]);
    }
  }, [photos, existingUrls, onPhotosSelected, onPhotoRemoved, placeId, disabled]);

  const isPhotoSelected = useCallback(
    (photo: GooglePhoto, index: number) =>
      (!!placeId && existingUrls.includes(makeGplaceRef(placeId, index))) || existingUrls.includes(photo.url),
    [existingUrls, placeId],
  );

  const selectedCount = photos.filter((p, i) => isPhotoSelected(p, i)).length;

  if (!placeId) return null;

  if (!requested) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setRequested(true)}
        className="text-xs gap-1.5 h-8"
      >
        <Camera className="h-3.5 w-3.5" />
        {buttonLabel ?? "Buscar fotos do Google"}
      </Button>
    );
  }

  if (!loading && photos.length === 0) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>{loadingLabel}</span>
      </div>
    );
  }

  if (!showGallery && !alwaysOpen) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setShowGallery(true)}
        className="text-xs gap-1.5 h-8"
      >
        <Camera className="h-3.5 w-3.5" />
        {buttonLabel ?? `Sugerir fotos do Google (${photos.length})`}
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <Camera className="h-4 w-4 text-primary" />
            {headingLabel}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Selecione as fotos que deseja utilizar. As fotos são adicionadas automaticamente conforme forem selecionadas.
          </p>
        </div>
        {!alwaysOpen && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowGallery(false)} className="text-xs h-7 shrink-0">
            Fechar
          </Button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {photos.map((photo, i) => {
          const isSelected = isPhotoSelected(photo, i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => togglePhoto(i)}
              aria-label={isSelected ? `Remover foto ${i + 1} da galeria` : `Selecionar foto ${i + 1}`}
              aria-pressed={isSelected}
              disabled={disabled && !isSelected}
              className={`relative shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                isSelected
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-transparent hover:border-primary/40"
              } ${disabled && !isSelected ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <img
                src={photo.thumb_url}
                alt={`Foto ${i + 1}`}
                className="h-20 w-28 object-cover"
                loading="lazy"
                decoding="async"
              />
              {isSelected && (
                <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {!hideCounter && (
        <div className="flex items-center justify-end">
          <span className="text-xs text-muted-foreground">
            {selectedCount} foto{selectedCount === 1 ? "" : "s"} selecionada{selectedCount === 1 ? "" : "s"}
          </span>
        </div>
      )}
    </div>
  );
}
