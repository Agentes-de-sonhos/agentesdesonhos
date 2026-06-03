import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Globe2, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PhotoCandidate {
  photo_url: string;
  thumb_url: string;
  source: string;
}

interface Props {
  /** Default search term (destination/location/attraction name). */
  query: string;
  /** Optional city/destination context to refine results. */
  destination?: string;
  location?: string | null;
  /** URLs already added — shown as disabled/selected to avoid duplicates. */
  existingUrls?: string[];
  /** Called with the selected URLs (multi-select). */
  onPick: (urls: string[]) => void;
  /** Optional trigger label. Defaults to "Buscar fotos da internet". */
  triggerLabel?: string;
  /** How many photos to request per search (max 18). */
  limit?: number;
}

/**
 * Multi-select internet photo picker — same backend as activity photos
 * (Google Places + Unsplash + Pexels via the `activity-photo` edge function).
 * Returns final-resolved URLs so they don't break when Google rotates
 * photo_reference tokens.
 */
export function InternetPhotosPicker({
  query,
  destination,
  location,
  existingUrls = [],
  onPick,
  triggerLabel = "Buscar fotos da internet",
  limit = 18,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<PhotoCandidate[]>([]);
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const cache = useRef<Map<string, PhotoCandidate[]>>(new Map());

  useEffect(() => {
    if (!open) return;
    const initial = [query, location].filter(Boolean).join(" ").trim();
    setSearch(initial);
    setPicked(new Set());
    runSearch(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const runSearch = async (term: string) => {
    const q = term.trim();
    if (q.length < 2) return;
    if (cache.current.has(q)) {
      setPhotos(cache.current.get(q)!);
      return;
    }
    setLoading(true);
    setPhotos([]);
    try {
      const { data, error } = await supabase.functions.invoke("activity-photo", {
        body: { query: q, destination, location, limit },
      });
      if (error) throw error;
      const list: PhotoCandidate[] = data?.photos ?? [];
      cache.current.set(q, list);
      setPhotos(list);
    } catch (e: any) {
      toast.error("Não foi possível buscar fotos", { description: e?.message });
    } finally {
      setLoading(false);
    }
  };

  const toggle = (url: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const handleConfirm = () => {
    if (picked.size === 0) return;
    onPick(Array.from(picked));
    toast.success(`${picked.size} foto(s) adicionada(s)`);
    setOpen(false);
    setPicked(new Set());
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <Globe2 className="h-3.5 w-3.5" />
        {triggerLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Selecionar fotos da internet</DialogTitle>
            <DialogDescription>
              Fotos reais do destino (Google Places, Unsplash e Pexels). Selecione uma ou várias.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              runSearch(search);
            }}
            className="flex gap-2"
          >
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ex: Paris, Torre Eiffel"
            />
            <Button type="submit" size="sm" disabled={loading} className="gap-1.5">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              Buscar
            </Button>
          </form>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading && photos.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : photos.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-12">
                Nenhuma foto encontrada. Tente refinar a busca.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {photos.map((p) => {
                  const already = existingUrls.includes(p.photo_url);
                  const isPicked = picked.has(p.photo_url);
                  return (
                    <button
                      type="button"
                      key={p.photo_url}
                      onClick={() => !already && toggle(p.photo_url)}
                      disabled={already}
                      className={cn(
                        "relative aspect-[4/3] overflow-hidden rounded-lg border-2 transition-all",
                        isPicked
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-transparent hover:border-border",
                        already && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <img
                        src={p.thumb_url || p.photo_url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      {isPicked && (
                        <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                          <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow">
                            <Check className="h-4 w-4" />
                          </div>
                        </div>
                      )}
                      {already && (
                        <span className="absolute top-1 left-1 text-[9px] uppercase tracking-wider bg-black/55 text-white rounded px-1 py-0.5">
                          Já adicionada
                        </span>
                      )}
                      <span className="absolute bottom-1 right-1 text-[9px] uppercase tracking-wider bg-black/55 text-white rounded px-1 py-0.5">
                        {p.source.replace("_", " ")}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" disabled={picked.size === 0} onClick={handleConfirm}>
              Usar {picked.size > 0 ? `${picked.size} foto(s)` : "fotos"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
