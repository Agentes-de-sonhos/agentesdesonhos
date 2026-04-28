import { useState, useCallback, useEffect, useRef } from "react";
import { Loader2, Sparkles, MapPin, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
    setText(introText || "");
    setImages(introImages || []);
  }, [showIntro, introText, introImages]);

  const saveToDb = useCallback(
    async (updates: Record<string, any>) => {
      const { error } = await supabase
        .from("quotes")
        .update(updates as any)
        .eq("id", quoteId);
      if (error) {
        toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      }
    },
    [quoteId, toast]
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
    return (
      <div className="space-y-4">
        {/* Toggle inside the collapsible body */}
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="show-destination-embedded" className="text-sm font-medium cursor-pointer">
              Exibir apresentação do destino para o cliente
            </Label>
          </div>
          <Switch
            id="show-destination-embedded"
            checked={enabled}
            onCheckedChange={handleToggle}
          />
        </div>

        {enabled && (
          <>
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
            </div>

            <Textarea
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Descrição curta e envolvente do destino..."
              rows={3}
              className="resize-none text-sm"
            />
          </>
        )}
      </div>
    );
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
