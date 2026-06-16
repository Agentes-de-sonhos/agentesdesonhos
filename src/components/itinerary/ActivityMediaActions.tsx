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
import {
  Loader2,
  Upload,
  Globe2,
  Paperclip,
  X,
  Check,
  FileText,
  Download,
  Search,
  ImageIcon,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useActivityPhoto } from "@/hooks/useActivityPhoto";

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

/* ───────────────────── Shared upload helpers ───────────────────── */

async function uploadPhotoFile(
  file: File,
  itineraryId?: string,
  activityId?: string,
) {
  if (!file || !itineraryId || !activityId) return null;
  if (!file.type.startsWith("image/")) {
    toast.error("Selecione uma imagem JPG, PNG ou WEBP");
    return null;
  }
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `itinerary-activities/${itineraryId}/${activityId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("media-files")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("media-files").getPublicUrl(path);
  return data?.publicUrl ?? null;
}

/* ───────────────────── Photo editor (with overlay) ───────────────────── */

interface PhotoEditorProps {
  itineraryId?: string;
  activityId?: string;
  activityTitle: string;
  activityLocation?: string | null;
  destination?: string;
  photoUrl?: string | null;
  onChange: (updates: { photo_url?: string | null }) => void;
  /** If true and there is no photo, auto-fetch a suggestion in the background. */
  autoFetch?: boolean;
}

/**
 * Renders the activity thumbnail with overlaid action icons:
 *  - Excluir foto (X)
 *  - Buscar foto na internet (Globe2)
 *  - Trocar / Enviar foto (Upload)
 *
 * On desktop the icons appear on hover; on touch devices they are always visible.
 */
export function ActivityPhotoEditor({
  itineraryId,
  activityId,
  activityTitle,
  activityLocation,
  destination,
  photoUrl,
  onChange,
  autoFetch = true,
}: PhotoEditorProps) {
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Auto-fetch a suggestion when no photo is set yet
  const { data: suggestion, loading: suggestionLoading } = useActivityPhoto({
    query: autoFetch && !photoUrl ? activityTitle : "",
    location: activityLocation,
    destination,
  });

  useEffect(() => {
    if (!photoUrl && autoFetch && suggestion?.photo_url && activityId) {
      onChange({ photo_url: suggestion.photo_url });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestion?.photo_url]);

  const handleUploadPhoto = async (file?: File) => {
    if (!file || !itineraryId || !activityId) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadPhotoFile(file, itineraryId, activityId);
      if (url) {
        onChange({ photo_url: url });
        toast.success("Foto adicionada");
      }
    } catch (e: any) {
      toast.error("Erro ao enviar foto", { description: e.message });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    onChange({ photo_url: null });
    toast.success("Foto removida");
  };

  const hasPhoto = !!photoUrl;

  return (
    <div className="shrink-0">
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
      <div
        className={cn(
          "group relative overflow-hidden rounded-md border bg-muted/50",
          "h-16 w-16 sm:h-20 sm:w-20",
        )}
      >
        {hasPhoto ? (
          <img
            src={photoUrl!}
            alt={activityTitle}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : suggestionLoading ? (
          <div className="h-full w-full animate-pulse bg-muted" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageIcon className="h-5 w-5 opacity-40" />
          </div>
        )}

        {/* Overlay actions */}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 flex items-end justify-center gap-1 p-1",
            "bg-gradient-to-t from-black/55 via-black/10 to-transparent",
            // Always visible on touch; hover-only on desktop
            "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity",
          )}
        >
          {hasPhoto && (
            <button
              type="button"
              title="Excluir foto"
              aria-label="Excluir foto"
              onClick={handleRemovePhoto}
              disabled={!activityId}
              className="pointer-events-auto h-6 w-6 inline-flex items-center justify-center rounded-md bg-background/90 text-destructive shadow-sm hover:bg-background"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
          <button
            type="button"
            title="Buscar foto na internet"
            aria-label="Buscar foto na internet"
            onClick={() => setPickerOpen(true)}
            disabled={!activityId}
            className="pointer-events-auto h-6 w-6 inline-flex items-center justify-center rounded-md bg-background/90 text-foreground shadow-sm hover:bg-background"
          >
            <Globe2 className="h-3 w-3" />
          </button>
          <button
            type="button"
            title={hasPhoto ? "Trocar foto" : "Enviar foto"}
            aria-label={hasPhoto ? "Trocar foto" : "Enviar foto"}
            onClick={() => photoInputRef.current?.click()}
            disabled={uploadingPhoto || !activityId}
            className="pointer-events-auto h-6 w-6 inline-flex items-center justify-center rounded-md bg-background/90 text-foreground shadow-sm hover:bg-background"
          >
            {uploadingPhoto ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Upload className="h-3 w-3" />
            )}
          </button>
        </div>
      </div>

      <InternetPhotoPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        query={activityTitle}
        location={activityLocation}
        destination={destination}
        onPick={(url) => onChange({ photo_url: url })}
      />
    </div>
  );
}

/* ───────────────────── Documents (button + list) ───────────────────── */

interface DocumentsButtonProps {
  itineraryId?: string;
  activityId?: string;
  documentUrls: string[];
  onChange: (updates: { document_urls?: string[] }) => void;
  className?: string;
}

export function ActivityDocumentsButton({
  itineraryId,
  activityId,
  documentUrls,
  onChange,
  className,
}: DocumentsButtonProps) {
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

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

  return (
    <>
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
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8", className)}
        onClick={() => docInputRef.current?.click()}
        disabled={uploadingDoc || !activityId}
        title="Anexar documento"
        aria-label="Anexar documento"
      >
        {uploadingDoc ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Paperclip className="h-4 w-4" />
        )}
      </Button>
    </>
  );
}

interface DocumentsListProps {
  documentUrls: string[];
  onChange: (updates: { document_urls?: string[] }) => void;
}

export function ActivityDocumentsList({ documentUrls, onChange }: DocumentsListProps) {
  if (!documentUrls.length) return null;
  const handleRemoveDocument = (url: string) => {
    onChange({ document_urls: documentUrls.filter((u) => u !== url) });
  };
  return (
    <div className="mt-2 space-y-1">
      {documentUrls.map((url) => {
            const name = fileNameOf(url);
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
  );
}

/* Legacy wrapper kept for backward-compatibility (renders nothing). */
export function ActivityMediaActions(_props: Props) {
  return null;
}

/* ───────────────── Internet photo picker ───────────────── */

interface PhotoCandidate {
  photo_url: string;
  thumb_url: string;
  source: string;
}

function InternetPhotoPickerDialog({
  open,
  onOpenChange,
  query,
  location,
  destination,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  query: string;
  location?: string | null;
  destination?: string;
  onPick: (url: string) => void;
}) {
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
      onOpenChange(false);
      setPicked(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button size="sm" disabled={!picked} onClick={handleConfirm}>
              Usar imagem
            </Button>
          </div>
        </DialogContent>
      </Dialog>
  );
}