import { useEffect, useState } from "react";
import { Loader2, Star, Trash2, Plus, ImageIcon, Link2 } from "lucide-react";
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
import { InternetPhotosPicker } from "@/components/shared/InternetPhotosPicker";
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
  mode?: "publish" | "edit";
}

export function PublishReviewDialog({
  open,
  onOpenChange,
  itinerary,
  onConfirm,
  mode = "publish",
}: PublishReviewDialogProps) {
  const [introText, setIntroText] = useState(itinerary.destinationIntroText || "");
  const [images, setImages] = useState<string[]>(itinerary.destinationIntroImages || []);
  const [coverUrl, setCoverUrl] = useState<string | null>(
    itinerary.coverImageUrl || itinerary.destinationIntroImages?.[0] || null
  );
  const [showIntro, setShowIntro] = useState(itinerary.showDestinationIntro !== false);
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setIntroText(itinerary.destinationIntroText || "");
      setImages(itinerary.destinationIntroImages || []);
      setCoverUrl(itinerary.coverImageUrl || itinerary.destinationIntroImages?.[0] || null);
      setShowIntro(itinerary.showDestinationIntro !== false);
    }
  }, [open, itinerary]);

  const handlePickedPhotos = (picked: string[]) => {
    const merged = Array.from(new Set([...images, ...picked]));
    setImages(merged);
    if (!coverUrl && merged[0]) setCoverUrl(merged[0]);
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
          <DialogTitle>
            {mode === "publish" ? "Revisar antes de publicar" : "Apresentação do destino"}
          </DialogTitle>
          <DialogDescription>
            {mode === "publish"
              ? "Revise a apresentação do destino, capa e galeria. O cliente verá esse material no link público."
              : "Edite o texto gerado pela IA, gerencie a galeria de fotos e escolha a capa do destino."}
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
              <InternetPhotosPicker
                query={itinerary.destination}
                destination={itinerary.destination}
                existingUrls={images}
                onPick={handlePickedPhotos}
                triggerLabel="Buscar fotos da internet"
              />
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
            ) : mode === "publish" ? (
              <Link2 className="h-4 w-4 mr-2" />
            ) : null}
            {mode === "publish" ? "Publicar roteiro" : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}