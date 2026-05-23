import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ImagePlus, Globe2, Paperclip, X, Check, FileText, Download, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  itineraryId?: string;
  activityId?: string;
  activityTitle: string;
  activityLocation?: string | null;
  destination?: string;
  photoUrl?: string | null;
  documentUrls?: string[];
  onChange: (updates: { photo_url?: string | null; document_urls?: string[] }) => void;
}

function fileNameOf(url: string) {
  try {
    return decodeURIComponent(url.split("/").pop()?.split("?")[0] || "arquivo");
  } catch {
    return "arquivo";
  }
}

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);
}

const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB

export function ActivityMediaActions({
  itineraryId,
  activityId,
  activityTitle,
  activityLocation,
  destination,
  photoUrl,
  documentUrls = [],
  onChange,
}: Props) {
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const handleUploadPhoto = async (file?: File) => {
    if (!file || !itineraryId || !activityId) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem JPG, PNG ou WEBP");
      return;
    }
    setUploadingPhoto(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `itinerary-activities/${itineraryId}/${activityId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("media-files")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("media-files").getPublicUrl(path);
      if (data?.publicUrl) {
        onChange({ photo_url: data.publicUrl });
        toast.success("Foto adicionada");
      }
    } catch (e: any) {
      toast.error("Erro ao enviar foto", { description: e.message });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleUploadDocument = async (file?: File) => {
    if (!file || !itineraryId || !activityId) return;
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const allowed = ["pdf", "jpg", "jpeg", "png", "webp"];
    if (!allowed.includes(ext)) {
      toast.error("Formato não permitido. Use PDF, JPG ou PNG.");
      return;
    }
    if (file.size > MAX_DOC_SIZE) {
      toast.error("Arquivo excede o limite de 10MB");
      return;
    }
    setUploadingDoc(true);
    try {
      const sanitized = file.name
        .replace(/\.[^.]+$/, "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]/g, "_");
      const path = `itinerary-activities/${itineraryId}/${activityId}/docs/${Date.now()}_${sanitized}.${ext}`;
      const { error } = await supabase.storage
        .from("media-files")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("media-files").getPublicUrl(path);
      if (data?.publicUrl) {
        const next = [...documentUrls, data.publicUrl];
        onChange({ document_urls: next });
        toast.success("Documento anexado");
      }
    } catch (e: any) {
      toast.error("Erro ao anexar documento", { description: e.message });
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleRemoveDocument = (url: string) => {
    onChange({ document_urls: documentUrls.filter((u) => u !== url) });
  };

  const handleRemovePhoto = () => onChange({ photo_url: null });

  return (
    <div className="mt-2 space-y-2">
      <input
        ref={photoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUploadPhoto(f);
          if (photoInputRef.current) photoInputRef.current.value = "";
        }}
      />
      <input
        ref={docInputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUploadDocument(f);
          if (docInputRef.current) docInputRef.current.value = "";
        }}
      />

      {/* Photo preview (if set) */}
      {/* Action buttons */}
      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => photoInputRef.current?.click()}
          disabled={uploadingPhoto || !activityId}
        >
          {uploadingPhoto ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <ImagePlus className="h-3 w-3" />
          )}
          {photoUrl ? "Trocar foto" : "Adicionar foto"}
        </Button>
        <InternetPhotoPickerButton
          query={activityTitle}
          location={activityLocation}
          destination={destination}
          onPick={(url) => onChange({ photo_url: url })}
        />
        {photoUrl && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={handleRemovePhoto}
          >
            <X className="h-3 w-3" />
            Remover foto
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => docInputRef.current?.click()}
          disabled={uploadingDoc || !activityId}
        >
          {uploadingDoc ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Paperclip className="h-3 w-3" />
          )}
          Anexar documento
        </Button>
      </div>

      {/* Document list */}
      {documentUrls.length > 0 && (
        <div className="space-y-1">
          {documentUrls.map((url) => {
            const name = fileNameOf(url);
            const img = isImageUrl(url);
            return (
              <div
                key={url}
                className="flex items-center gap-2 text-xs bg-muted/50 rounded-md px-2 py-1.5"
              >
                <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate text-muted-foreground">{name}</span>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline shrink-0"
                  title="Abrir"
                >
                  <Download className="h-3 w-3" />
                </a>
                <button
                  type="button"
                  onClick={() => handleRemoveDocument(url)}
                  className="text-destructive hover:text-destructive shrink-0"
                  title="Remover"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ───────────────── Internet photo picker ───────────────── */

interface PhotoCandidate {
  photo_url: string;
  thumb_url: string;
  source: string;
}

function InternetPhotoPickerButton({
  query,
  location,
  destination,
  onPick,
}: {
  query: string;
  location?: string | null;
  destination?: string;
  onPick: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<PhotoCandidate[]>([]);
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  // Cache results per search term during the dialog lifetime
  const cache = useRef<Map<string, PhotoCandidate[]>>(new Map());

  // Initial / on-query change
  useEffect(() => {
    if (!open) return;
    const initial = [query, location].filter(Boolean).join(" ").trim();
    setSearch(initial);
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
        body: { query: q, destination, location, limit: 12 },
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

  const handleConfirm = () => {
    if (picked) {
      onPick(picked);
      toast.success("Foto aplicada");
      setOpen(false);
      setPicked(null);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Globe2 className="h-3 w-3" />
        Buscar fotos da internet
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Selecionar foto da internet</DialogTitle>
            <DialogDescription>
              Fotos reais do destino (Google Places, Unsplash e Pexels).
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
              placeholder="Ex: Torre Eiffel, Paris"
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
                {photos.map((p) => (
                  <button
                    type="button"
                    key={p.photo_url}
                    onClick={() => setPicked(p.photo_url)}
                    className={cn(
                      "relative aspect-[4/3] overflow-hidden rounded-lg border-2 transition-all",
                      picked === p.photo_url
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-transparent hover:border-border"
                    )}
                  >
                    <img
                      src={p.thumb_url || p.photo_url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    {picked === p.photo_url && (
                      <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                        <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow">
                          <Check className="h-4 w-4" />
                        </div>
                      </div>
                    )}
                    <span className="absolute bottom-1 right-1 text-[9px] uppercase tracking-wider bg-black/55 text-white rounded px-1 py-0.5">
                      {p.source.replace("_", " ")}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" disabled={!picked} onClick={handleConfirm}>
              Usar imagem
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}