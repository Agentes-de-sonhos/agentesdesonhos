import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ImageIcon, Loader2, Camera } from "lucide-react";

interface GooglePhoto {
  url: string;
  thumb_url: string;
  width: number;
  height: number;
}

interface GoogleHotelPhotosProps {
  placeId: string | null;
  onPhotosSelected: (urls: string[]) => void;
  existingUrls?: string[];
}

// In-memory cache to avoid re-fetching
const photoCache = new Map<string, GooglePhoto[]>();

export function GoogleHotelPhotos({ placeId, onPhotosSelected, existingUrls = [] }: GoogleHotelPhotosProps) {
  const [photos, setPhotos] = useState<GooglePhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const fetchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!placeId || placeId === fetchedRef.current) return;

    const cached = photoCache.get(placeId);
    if (cached) {
      setPhotos(cached);
      fetchedRef.current = placeId;
      setSelected(new Set());
      setShowGallery(false);
      return;
    }

    fetchedRef.current = placeId;
    setLoading(true);
    setPhotos([]);
    setSelected(new Set());
    setShowGallery(false);

    supabase.functions.invoke("hotel-photos", { body: { place_id: placeId } })
      .then(({ data }) => {
        const fetched = data?.photos || [];
        setPhotos(fetched);
        photoCache.set(placeId, fetched);
      })
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false));
  }, [placeId]);

  const togglePhoto = useCallback((index: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(photos.map((_, i) => i)));
  }, [photos]);

  const handleAdd = useCallback(() => {
    const urls = Array.from(selected).sort().map(i => photos[i].url);
    // Filter out already existing URLs
    const newUrls = urls.filter(u => !existingUrls.includes(u));
    if (newUrls.length > 0) {
      onPhotosSelected(newUrls);
    }
    setShowGallery(false);
    setSelected(new Set());
  }, [selected, photos, existingUrls, onPhotosSelected]);

  if (!placeId || (!loading && photos.length === 0)) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Buscando fotos do hotel...</span>
      </div>
    );
  }

  if (!showGallery) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setShowGallery(true)}
        className="text-xs gap-1.5 h-8"
      >
        <Camera className="h-3.5 w-3.5" />
        Sugerir fotos do Google ({photos.length})
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium flex items-center gap-1.5">
          <Camera className="h-4 w-4 text-primary" />
          Fotos do Google
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={selectAll} className="text-xs h-7">
            Selecionar todas
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowGallery(false)} className="text-xs h-7">
            Fechar
          </Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {photos.map((photo, i) => {
          const isSelected = selected.has(i);
          const alreadyAdded = existingUrls.includes(photo.url);
          return (
            <button
              key={i}
              type="button"
              disabled={alreadyAdded}
              onClick={() => togglePhoto(i)}
              className={`relative shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                alreadyAdded
                  ? "border-muted opacity-50 cursor-not-allowed"
                  : isSelected
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-transparent hover:border-primary/40"
              }`}
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
              {alreadyAdded && (
                <Badge className="absolute bottom-1 left-1 text-[9px] bg-muted text-muted-foreground">
                  Adicionada
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {selected.size} foto{selected.size > 1 ? "s" : ""} selecionada{selected.size > 1 ? "s" : ""}
          </span>
          <Button type="button" size="sm" onClick={handleAdd} className="text-xs h-7 gap-1">
            <ImageIcon className="h-3 w-3" />
            Adicionar selecionadas
          </Button>
        </div>
      )}
    </div>
  );
}
