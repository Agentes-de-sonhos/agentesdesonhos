import { useEffect, useState } from "react";
import { Loader2, Star, Trash2, Plus, ImageIcon, Link2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Itinerary, ItineraryDay } from "@/types/itinerary";

interface PublishReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itinerary: Itinerary & { days: ItineraryDay[] };
  onConfirm: (data: {
    introText: string | null;
    images: string[];
    coverUrl: string | null;
    showIntro: boolean;
  }) => Promise<void>;
}

export function PublishReviewDialog({
  open,
  onOpenChange,
  itinerary,
  onConfirm,
}: PublishReviewDialogProps) {
  const [introText, setIntroText] = useState(itinerary.destinationIntroText || "");
  const [images, setImages] = useState<string[]>(itinerary.destinationIntroImages || []);
  const [coverUrl, setCoverUrl] = useState<string | null>(
    itinerary.coverImageUrl || itinerary.destinationIntroImages?.[0] || null
  );
  const [showIntro, setShowIntro] = useState(itinerary.showDestinationIntro !== false);
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (open) {
      setIntroText(itinerary.destinationIntroText || "");
      setImages(itinerary.destinationIntroImages || []);
      setCoverUrl(itinerary.coverImageUrl || itinerary.destinationIntroImages?.[0] || null);
      setShowIntro(itinerary.showDestinationIntro !== false);
    }
  }, [open, itinerary]);

  const handleSearchPhotos = async () => {
    setSearching(true);
    try {
      // Step 1: autocomplete to get a place_id
      const { data: ac, error: acErr } = await supabase.functions.invoke("places-autocomplete", {
        body: { input: itinerary.destination, place_type: "city" },
      });
      if (acErr) throw acErr;
      const placeId = ac?.predictions?.[0]?.place_id;
      if (!placeId) {
        toast.info("Nenhuma foto encontrada para este destino.");
        return;
      }
      // Step 2: fetch details to get photo_urls
      const { data: det, error: detErr } = await supabase.functions.invoke("places-autocomplete", {
        body: { fetch_details: true, place_id: placeId },
      });
      if (detErr) throw detErr;
      const photos: string[] = (det?.place?.photo_urls || []).filter(Boolean);
      if (photos.length === 0) {
        toast.info("Nenhuma foto encontrada para este destino.");
      } else {
        const merged = Array.from(new Set([...images, ...photos]));
        setImages(merged);
        if (!coverUrl && merged[0]) setCoverUrl(merged[0]);
        toast.success(`${photos.length} foto(s) adicionada(s).`);
      }
    } catch (e: any) {
      toast.error("Erro ao buscar fotos do destino.");
    } finally {
      setSearching(false);
    }
  };

  const handleAddUrl = () => {
    if (!newUrl.trim()) return;
    if (!/^https?:\/\//i.test(newUrl)) {
      toast.error("Use uma URL válida (http/https).");
      return;
    }
    if (images.includes(newUrl)) {
      toast.info("Imagem já adicionada.");
      return;
    }
    const next = [...images, newUrl.trim()];
    setImages(next);
    if (!coverUrl) setCoverUrl(newUrl.trim());
    setNewUrl("");
  };

  const handleRemove = (url: string) => {
    const next = images.filter((u) => u !== url);
    setImages(next);
    if (coverUrl === url) setCoverUrl(next[0] || null);
  };

  const move = (url: string, dir: -1 | 1) => {
    const idx = images.indexOf(url);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[idx], next[target]] = [next[target], next[idx]];
    setImages(next);
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm({
        introText: introText.trim() || null,
        images,
        coverUrl: coverUrl || images[0] || null,
        showIntro,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisar antes de publicar</DialogTitle>
          <DialogDescription>
            Revise a apresentação do destino, capa e galeria. O cliente verá esse material no link público.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="show-intro" className="font-semibold">
                Exibir apresentação do destino
              </Label>
              <p className="text-xs text-muted-foreground">
                Mostra o texto e a galeria de fotos no topo do roteiro público.
              </p>
            </div>
            <Switch id="show-intro" checked={showIntro} onCheckedChange={setShowIntro} />
          </div>

          <div className="space-y-2">
            <Label className="font-semibold">Descrição do destino</Label>
            <Textarea
              value={introText}
              onChange={(e) => setIntroText(e.target.value)}
              rows={5}
              placeholder="Apresentação do destino..."
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">{introText.length} caracteres</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-semibold flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Galeria de fotos
              </Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleSearchPhotos}
                disabled={searching}
              >
                {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Buscar fotos do destino
              </Button>
            </div>

            {images.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-6 text-center">
                Nenhuma foto adicionada. Busque automaticamente ou cole uma URL abaixo.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((url) => (
                  <div
                    key={url}
                    className={`group relative aspect-[4/3] overflow-hidden rounded-lg border-2 ${
                      coverUrl === url ? "border-primary ring-2 ring-primary/30" : "border-border"
                    }`}
                  >
                    <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    {coverUrl === url && (
                      <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
                        Capa
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="h-7 w-7"
                        onClick={() => setCoverUrl(url)}
                        title="Definir como capa"
                      >
                        <Star className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="h-7 w-7"
                        onClick={() => move(url, -1)}
                        title="Mover para esquerda"
                      >
                        ←
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="h-7 w-7"
                        onClick={() => move(url, 1)}
                        title="Mover para direita"
                      >
                        →
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="h-7 w-7"
                        onClick={() => handleRemove(url)}
                        title="Remover"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://... (cole uma URL de imagem)"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddUrl();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={handleAddUrl}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Link2 className="h-4 w-4 mr-2" />
            )}
            Publicar roteiro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}