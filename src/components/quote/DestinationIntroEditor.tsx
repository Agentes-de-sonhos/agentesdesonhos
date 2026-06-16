import { useState, useCallback, useEffect, useRef } from "react";
import { Loader2, Sparkles, MapPin, X, Upload, Pencil, Images, Star, Link2, Info } from "lucide-react";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { InternetPhotosPicker } from "@/components/shared/InternetPhotosPicker";

interface DestinationIntroEditorProps {
  quoteId: string;
  destination: string;
  showIntro: boolean;
  introText: string | null;
  introImages: string[];
  onUpdate: () => void;
  /** When true, renders content only (no Card wrapper, no header toggle).
   *  The parent is responsible for the collapsible shell and the on/off switch. */
  embedded?: boolean;
}

export function DestinationIntroEditor({
  quoteId,
  destination,
  showIntro,
  introText,
  introImages,
  onUpdate,
  embedded = false,
}: DestinationIntroEditorProps) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(showIntro);
  const [text, setText] = useState(introText || "");
  const [images, setImages] = useState<string[]>(introImages || []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFetchingPhotos, setIsFetchingPhotos] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEnabled(showIntro);
  }, [showIntro]);

  // Only sync text from props when it actually differs (avoids wiping local edits
  // when the parent re-renders with a new array/string reference).
  useEffect(() => {
    const incoming = introText || "";
    setText((prev) => (prev === incoming ? prev : incoming));
  }, [introText]);

  useEffect(() => {
    const incoming = introImages || [];
    setImages((prev) => {
      if (prev.length === incoming.length && prev.every((u, i) => u === incoming[i])) {
        return prev;
      }
      return incoming;
    });
  }, [introImages]);

  const saveToDb = useCallback(
    async (updates: Record<string, any>) => {
      const { error } = await supabase
        .from("quotes")
        .update(updates as any)
        .eq("id", quoteId);
      if (error) {
        toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
        return;
      }
      onUpdate?.();
    },
    [quoteId, toast, onUpdate]
  );

  const debouncedSaveText = useCallback(
    (newText: string) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveToDb({ destination_intro_text: newText || null });
      }, 1500);
    },
    [saveToDb]
  );

  const handleToggle = async (checked: boolean) => {
    setEnabled(checked);
    await saveToDb({ show_destination_intro: checked });
    if (checked && !text && images.length === 0) {
      handleGenerate();
    }
  };

  const handleTextChange = (newText: string) => {
    setText(newText);
    debouncedSaveText(newText);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setIsFetchingPhotos(true);

    try {
      const { data: aiData, error: aiError } = await supabase.functions.invoke(
        "generate-destination-intro",
        { body: { destination } }
      );
      if (!aiError && aiData?.text) {
        setText(aiData.text);
        await saveToDb({ destination_intro_text: aiData.text });
      } else {
        toast({ title: "Não foi possível gerar o texto", description: "Tente novamente ou escreva manualmente.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao gerar texto", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }

    try {
      // Support multi-destination strings ("Paris, Roma, Florença").
      const cities = destination.split(",").map((s) => s.trim()).filter(Boolean);
      const MAX_PHOTOS = 5;
      // Photos per city: distribute fairly, min 1 each.
      const perCity = Math.max(1, Math.floor(MAX_PHOTOS / cities.length));
      const collected: string[] = [];

      for (const city of cities) {
        if (collected.length >= MAX_PHOTOS) break;
        const { data: placeData, error: placeError } = await supabase.functions.invoke(
          "places-autocomplete",
          { body: { input: city, place_type: "city" } }
        );
        if (placeError || !placeData?.predictions?.length) continue;
        const { data: detailsData } = await supabase.functions.invoke(
          "places-autocomplete",
          { body: { fetch_details: true, place_id: placeData.predictions[0].place_id, place_type: "city" } }
        );
        const urls: string[] = detailsData?.details?.photo_urls || [];
        if (urls.length > 0) {
          collected.push(...urls.slice(0, perCity));
        }
      }

      const photos = collected.slice(0, MAX_PHOTOS);
      if (photos.length > 0) {
        setImages(photos);
        await saveToDb({ destination_intro_images: photos });
      }
    } catch {
      // Photos are optional
    } finally {
      setIsFetchingPhotos(false);
    }
  };

  const handleRemoveImage = async (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    await saveToDb({ destination_intro_images: newImages });
  };

  const handleUploadImages = async (files: FileList) => {
    setIsUploading(true);
    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const ext = file.name.split(".").pop() || "jpg";
      const path = `destination-intro/${quoteId}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage.from("media-files").upload(path, file, { upsert: true });
      if (error) {
        toast({ title: "Erro ao enviar imagem", description: error.message, variant: "destructive" });
        continue;
      }
      const { data: urlData } = supabase.storage.from("media-files").getPublicUrl(path);
      if (urlData?.publicUrl) newUrls.push(urlData.publicUrl);
    }

    if (newUrls.length > 0) {
      const updated = [...images, ...newUrls];
      setImages(updated);
      await saveToDb({ destination_intro_images: updated });
    }
    setIsUploading(false);
  };

  const handleAddGooglePhotos = async (urls: string[]) => {
    const newOnes = urls.filter((u) => !images.includes(u));
    if (newOnes.length === 0) return;
    const updated = [...images, ...newOnes];
    setImages(updated);
    await saveToDb({ destination_intro_images: updated });
  };


  if (!enabled && !embedded) {
    return (
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="show-destination" className="text-sm font-medium cursor-pointer">
                Apresentação do Destino
              </Label>
            </div>
            <Switch id="show-destination" checked={enabled} onCheckedChange={handleToggle} />
          </div>
          <p className="text-xs text-muted-foreground mt-1 ml-6">
            Exiba imagens e uma descrição do destino antes dos serviços.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (embedded) {
    return <EmbeddedDestinationIntro
      destination={destination}
      enabled={enabled}
      onToggle={handleToggle}
      text={text}
      onTextChange={handleTextChange}
      images={images}
      onRemoveImage={handleRemoveImage}
      onAddGooglePhotos={handleAddGooglePhotos}
      onUploadImages={handleUploadImages}
      onSetCover={async (index) => {
        if (index === 0) return;
        const reordered = [images[index], ...images.filter((_, i) => i !== index)];
        setImages(reordered);
        await saveToDb({ destination_intro_images: reordered });
      }}
      onAddByUrl={async (url) => {
        if (!url || images.includes(url)) return;
        const updated = [...images, url];
        setImages(updated);
        await saveToDb({ destination_intro_images: updated });
      }}
      onGenerate={handleGenerate}
      isGenerating={isGenerating}
      isFetchingPhotos={isFetchingPhotos}
      isUploading={isUploading}
    />;
  }

  return (
    <Card>
      <CardContent className="py-4 px-4 space-y-4">
        {/* Header with toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <Label htmlFor="show-destination-on" className="text-sm font-semibold cursor-pointer">
              Apresentação do Destino
            </Label>
          </div>
          <Switch id="show-destination-on" checked={enabled} onCheckedChange={handleToggle} />
        </div>

        {/* Images */}
        {images.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((url, i) => (
              <div key={i} className="relative shrink-0 group">
                <img
                  src={url}
                  alt={`${destination} ${i + 1}`}
                  className="h-20 w-28 rounded-lg object-cover border border-border/40"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(i)}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ) : isFetchingPhotos ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Buscando fotos do destino...
          </div>
        ) : null}

        {/* Upload button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleUploadImages(e.target.files)}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="gap-2"
          >
            {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Adicionar imagem
          </Button>
          <InternetPhotosPicker
            query={destination}
            destination={destination}
            existingUrls={images}
            onPick={handleAddGooglePhotos}
            triggerLabel="Buscar fotos da internet"
          />
        </div>

        {/* Text */}
        <Textarea
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Descrição curta e envolvente do destino..."
          rows={3}
          className="resize-none text-sm"
        />

        {/* Generate button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={isGenerating || isFetchingPhotos}
          className="gap-2"
        >
          {isGenerating || isFetchingPhotos ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {text || images.length > 0 ? "Regenerar com IA" : "Gerar com IA"}
        </Button>
      </CardContent>
    </Card>
  );
}

interface EmbeddedProps {
  destination: string;
  enabled: boolean;
  onToggle: (checked: boolean) => void;
  text: string;
  onTextChange: (value: string) => void;
  images: string[];
  onRemoveImage: (index: number) => void;
  onAddGooglePhotos: (urls: string[]) => void;
  onUploadImages: (files: FileList) => void;
  onSetCover: (index: number) => void;
  onAddByUrl: (url: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  isFetchingPhotos: boolean;
  isUploading: boolean;
}

function EmbeddedDestinationIntro(props: EmbeddedProps) {
  const {
    destination, enabled, onToggle, text, onTextChange, images,
    onRemoveImage, onAddGooglePhotos, onUploadImages, onSetCover, onAddByUrl,
    onGenerate, isGenerating, isFetchingPhotos, isUploading,
  } = props;

  const [textOpen, setTextOpen] = useState(false);
  const [photosOpen, setPhotosOpen] = useState(false);
  const [draftText, setDraftText] = useState(text);
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textOpen) setDraftText(text);
  }, [textOpen, text]);

  const handleSaveText = () => {
    onTextChange(draftText);
    setTextOpen(false);
  };

  const handleAddByUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    onAddByUrl(trimmed);
    setUrlInput("");
  };

  const charCount = draftText.length;

  return (
    <TooltipProvider>
    <div className="space-y-4">
      {/* Action buttons + compact toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setTextOpen(true)} className="gap-2">
            <Pencil className="h-3.5 w-3.5" />
            Editar descrição
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPhotosOpen(true)} className="gap-2">
            <Images className="h-3.5 w-3.5" />
            Capa e fotos
            {images.length > 0 && (
              <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
                {images.length}
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onGenerate}
            disabled={isGenerating || isFetchingPhotos}
            className="gap-2"
          >
            {isGenerating || isFetchingPhotos ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {text || images.length > 0 ? "Regenerar com IA" : "Gerar com IA"}
          </Button>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {enabled ? "Exibindo" : "Oculto"}
              </span>
              <Switch id="show-destination-inline" checked={enabled} onCheckedChange={onToggle} />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="end">
            <p className="max-w-[260px]">
              Mostra o texto e a galeria de fotos no topo do roteiro público.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Preview summary */}
      <div className="rounded-lg border border-dashed bg-muted/20 p-3 space-y-2">
        {text ? (
          <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{text}</p>
        ) : (
          <p className="text-xs italic text-muted-foreground">Nenhuma descrição adicionada.</p>
        )}
        {images.length > 0 ? (
          <div className="flex gap-1.5 overflow-x-auto">
            {images.slice(0, 6).map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`${destination} ${i + 1}`}
                className="h-12 w-16 rounded object-cover border border-border/40 shrink-0"
              />
            ))}
            {images.length > 6 && (
              <div className="h-12 w-16 rounded border border-border/40 bg-muted flex items-center justify-center text-[10px] text-muted-foreground shrink-0">
                +{images.length - 6}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs italic text-muted-foreground">Nenhuma imagem adicionada.</p>
        )}
      </div>

      {/* Text-only modal */}
      <Dialog open={textOpen} onOpenChange={setTextOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar descrição do destino</DialogTitle>
            <DialogDescription>
              Texto exibido na apresentação do destino do orçamento.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder="Descrição curta e envolvente do destino..."
            rows={8}
            className="resize-none text-sm"
          />
          <div className="text-xs text-muted-foreground text-right">{charCount} caracteres</div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTextOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveText}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photos-only modal */}
      <Dialog open={photosOpen} onOpenChange={setPhotosOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Capa e fotos do destino</DialogTitle>
            <DialogDescription>
              A primeira imagem é usada como capa. Reordene definindo outra como capa.
            </DialogDescription>
          </DialogHeader>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && onUploadImages(e.target.files)}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="gap-2"
            >
              {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Adicionar imagem
            </Button>
            <InternetPhotosPicker
              query={destination}
              destination={destination}
              existingUrls={images}
              onPick={onAddGooglePhotos}
              triggerLabel="Buscar fotos da internet"
            />
          </div>

          <div className="flex gap-2 items-center">
            <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Cole uma URL de imagem..."
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddByUrl(); } }}
            />
            <Button size="sm" variant="secondary" onClick={handleAddByUrl} disabled={!urlInput.trim()}>
              Adicionar
            </Button>
          </div>

          {images.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((url, i) => (
                <div key={i} className="relative group rounded-lg overflow-hidden border border-border/40">
                  <img src={url} alt={`${destination} ${i + 1}`} className="h-28 w-full object-cover" />
                  {i === 0 && (
                    <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                      <Star className="h-2.5 w-2.5 fill-current" /> Capa
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 flex items-center justify-between gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {i !== 0 ? (
                      <button
                        type="button"
                        onClick={() => onSetCover(i)}
                        className="text-[10px] text-white bg-white/10 hover:bg-white/20 rounded px-1.5 py-0.5"
                      >
                        Definir como capa
                      </button>
                    ) : <span />}
                    <button
                      type="button"
                      onClick={() => onRemoveImage(i)}
                      className="h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                      aria-label="Remover imagem"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : isFetchingPhotos ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando fotos do destino...
            </div>
          ) : (
            <p className="text-xs italic text-muted-foreground text-center py-6">
              Nenhuma imagem adicionada ainda.
            </p>
          )}

          <DialogFooter>
            <Button onClick={() => setPhotosOpen(false)}>Concluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}
