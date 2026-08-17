import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ImageIcon, Link2, Loader2, Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { GoogleHotelPhotos } from "@/components/shared/GoogleHotelPhotos";
import { ResolvedServiceThumb } from "@/components/shared/ResolvedServiceImage";
import { optimizeImage, validateImageFile } from "@/utils/imageOptimizer";
import {
  HOTEL_GALLERY_LIMIT_MESSAGE,
  HOTEL_GALLERY_SUGGESTIONS_TITLE,
  HOTEL_GALLERY_TITLE,
  HOTEL_GALLERY_URL_PLACEHOLDER,
  MAX_HOTEL_GALLERY_IMAGES,
  ORIGIN_LABEL,
  addImageRef,
  containsImageRef,
  dedupeImageRefs,
  dropStaleGoogleRefs,
  galleryCounterLabel,
  hasStaleGoogleRefs,
  imageRefOrigin,
  isSameImageRefList,
  isValidHttpImageUrl,
  removeImageRef,
} from "@/lib/quoteHotelGallery";
import type { AddImageResult } from "@/lib/quoteHotelGallery";

export const HOTEL_GALLERY_PENDING_MESSAGE =
  "A galeria de fotos está em edição. Clique em “Salvar galeria” para confirmar as fotos desta hospedagem.";
export const HOTEL_GALLERY_STALE_MESSAGE =
  "As fotos salvas pertencem ao hotel anterior. Revise a galeria e clique em “Salvar galeria”.";

interface HotelPhotoGalleryProps {
  /** Fotos confirmadas (fonte da verdade do formulário). */
  imageUrls: string[];
  /** Chamado APENAS ao confirmar a galeria ("Salvar galeria"). */
  onImageUrlsChange: (urls: string[]) => void;
  placeId?: string | null;
  /** `true` quando o serviço já existe (edição) — evita abrir edição sozinho. */
  hasSavedService?: boolean;
  /**
   * Informa ao formulário que a galeria tem alterações não confirmadas ou está
   * inconsistente com o hotel atual — o submit deve ser bloqueado até Salvar.
   */
  onPendingChange?: (pending: boolean) => void;
}

/**
 * Galeria de fotos exclusiva do serviço HOSPEDAGEM nos orçamentos.
 *
 * Trabalha com dois estados: `imageUrls` (salvas) e `draft` (rascunho do modo
 * de edição). Nenhuma seleção/remoção do rascunho toca em `onImageUrlsChange`
 * — apenas "Salvar galeria" confirma, e "Cancelar" descarta.
 */
export function HotelPhotoGallery({
  imageUrls,
  onImageUrlsChange,
  placeId,
  hasSavedService,
  onPendingChange,
}: HotelPhotoGalleryProps) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const seenPlace = useRef<string | null | undefined>(undefined);

  const [mode, setMode] = useState<"view" | "edit">("view");
  const [draft, setDraft] = useState<string[]>([]);
  const draftRef = useRef<string[]>([]);
  const [feedback, setFeedback] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const [urlOpen, setUrlOpen] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const saved = useMemo(() => dedupeImageRefs(imageUrls || []), [imageUrls]);
  const active = mode === "edit" ? draft : saved;
  const atLimit = active.length >= MAX_HOTEL_GALLERY_IMAGES;

  const applyDraft = useCallback((next: string[]) => {
    draftRef.current = next;
    setDraft(next);
  }, []);

  const openEdit = useCallback(
    (base?: string[]) => {
      applyDraft(dedupeImageRefs(base ?? imageUrls ?? []));
      setFeedback(null);
      setUrlOpen(false);
      setUrlValue("");
      setMode("edit");
    },
    [imageUrls, applyDraft],
  );

  // Primeiro hotel selecionado → abre edição e busca sugestões.
  // Troca de hotel → limpa as referências Google antigas SOMENTE no rascunho.
  // As fotos confirmadas nunca são alteradas fora de "Salvar galeria".
  useEffect(() => {
    if (!placeId) {
      seenPlace.current = placeId ?? null;
      return;
    }
    const previous = seenPlace.current;
    seenPlace.current = placeId;
    if (previous && previous !== placeId) {
      openEdit(dropStaleGoogleRefs(imageUrls || [], placeId));
      return;
    }
    if (!previous && !hasSavedService) openEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeId]);

  /**
   * Adição determinística: calcula o resultado a partir do rascunho atual
   * (ref sincronizada) — nunca depende do retorno do updater do setState.
   */
  const tryAdd = useCallback((ref: string): AddImageResult => {
    const res = addImageRef(draftRef.current, ref);
    applyDraft(res.urls);
    setFeedback(res.ok ? null : { tone: "error", text: res.error || HOTEL_GALLERY_LIMIT_MESSAGE });
    return res;
  }, [applyDraft]);

  const handleRemove = useCallback((ref: string) => {
    applyDraft(removeImageRef(draftRef.current, ref));
    setFeedback(null);
  }, [applyDraft]);

  const handleGoogleSelected = useCallback((urls: string[]) => {
    urls.forEach((u) => tryAdd(u));
  }, [tryAdd]);

  const handleAddUrl = useCallback(async () => {
    const candidate = urlValue.trim();
    if (!isValidHttpImageUrl(candidate)) {
      setFeedback({ tone: "error", text: "Informe um link http ou https válido de imagem." });
      return;
    }
    if (containsImageRef(draftRef.current, candidate)) {
      setFeedback({ tone: "error", text: "Esta foto já está na galeria." });
      return;
    }
    if (draftRef.current.length >= MAX_HOTEL_GALLERY_IMAGES) {
      setFeedback({ tone: "error", text: HOTEL_GALLERY_LIMIT_MESSAGE });
      return;
    }
    setUrlLoading(true);
    setFeedback(null);
    try {
      const { data, error } = await supabase.functions.invoke("import-quote-image", {
        body: { url: candidate },
      });
      const importedUrl: string | undefined = data?.url;
      if (error || !importedUrl) {
        // Importação falhou: NÃO gravamos hotlink externo como importado.
        setFeedback({
          tone: "error",
          text: data?.error || "Não foi possível carregar a imagem deste link. Tente novamente.",
        });
        return;
      }
      // A importação é idempotente: a mesma URL de origem devolve sempre o
      // mesmo arquivo. Comparamos antes de adicionar para não duplicar.
      const res = tryAdd(importedUrl);
      if (res.ok) {
        setUrlValue("");
        setUrlOpen(false);
      }
    } catch {
      setFeedback({ tone: "error", text: "Não foi possível carregar a imagem deste link. Tente novamente." });
    } finally {
      setUrlLoading(false);
    }
  }, [urlValue, tryAdd]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    const invalid = validateImageFile(file);
    if (invalid) {
      setFeedback({ tone: "error", text: invalid });
      return;
    }
    if (draftRef.current.length >= MAX_HOTEL_GALLERY_IMAGES) {
      setFeedback({ tone: "error", text: HOTEL_GALLERY_LIMIT_MESSAGE });
      return;
    }
    if (!user?.id) {
      setFeedback({ tone: "error", text: "Sessão expirada. Faça login novamente." });
      return;
    }
    setUploading(true);
    setFeedback({ tone: "info", text: "Otimizando e enviando…" });
    try {
      const result = await optimizeImage(file);
      const fileId = crypto.randomUUID();
      const fullPath = `${user.id}/quotes/${fileId}.webp`;
      const { error } = await supabase.storage
        .from("quote-images")
        .upload(fullPath, result.full, { upsert: true, contentType: "image/webp" });
      if (error) {
        setFeedback({ tone: "error", text: "Erro ao enviar a foto. Tente novamente." });
        return;
      }
      await supabase.storage
        .from("quote-images")
        .upload(`${user.id}/quotes/thumb_${fileId}.webp`, result.thumb, { upsert: true, contentType: "image/webp" });
      const { data: urlData } = supabase.storage.from("quote-images").getPublicUrl(fullPath);
      const res = tryAdd(urlData.publicUrl);
      if (res.ok) setFeedback(null);
    } catch {
      setFeedback({ tone: "error", text: "Erro ao processar a imagem." });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    onImageUrlsChange(dedupeImageRefs(draftRef.current));
    setFeedback(null);
    setUrlOpen(false);
    setUrlValue("");
    setMode("view");
  };

  const handleCancel = () => {
    applyDraft([]);
    setFeedback(null);
    setUrlOpen(false);
    setUrlValue("");
    setMode("view");
  };

  // Pendência = rascunho diferente das salvas, ou fotos salvas de outro hotel.
  const staleSaved = hasStaleGoogleRefs(saved, placeId);
  const dirtyDraft = mode === "edit" && !isSameImageRefList(draft, saved);
  const pending = staleSaved || dirtyDraft;
  useEffect(() => {
    onPendingChange?.(pending);
  }, [pending, onPendingChange]);
  useEffect(() => () => onPendingChange?.(false), [onPendingChange]);

  const showSection = !!placeId || saved.length > 0;
  if (!showSection) {
    return (
      <div className="space-y-1" data-testid="hotel-gallery-empty">
        <p className="text-sm font-medium">{HOTEL_GALLERY_TITLE}</p>
        <p className="text-xs text-muted-foreground italic">
          Selecione um hotel acima para carregar fotos automaticamente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="hotel-gallery">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{HOTEL_GALLERY_TITLE}</p>
          <p className="text-xs text-muted-foreground" data-testid="hotel-gallery-counter">
            {galleryCounterLabel(active.length)}
          </p>
        </div>
        {mode === "view" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            aria-label="Editar galeria de fotos"
            onClick={() => openEdit()}
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar galeria
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              aria-label="Cancelar edição da galeria"
              onClick={handleCancel}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              aria-label="Salvar galeria de fotos"
              onClick={handleSave}
            >
              <Check className="h-3.5 w-3.5" />
              Salvar galeria
            </Button>
          </div>
        )}
      </div>

      {active.length > 0 && (
        <div
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5"
          data-testid="hotel-gallery-grid"
        >
          {active.map((ref) => (
            <div key={ref} className="relative group">
              <ResolvedServiceThumb
                imageRef={ref}
                placeId={placeId}
                alt="Foto da hospedagem"
                className="aspect-[4/3] w-full rounded-lg border border-border object-cover"
              />
              <span className="absolute bottom-1 left-1 rounded bg-background/85 px-1 py-0.5 text-[10px] text-muted-foreground">
                {ORIGIN_LABEL[imageRefOrigin(ref)]}
              </span>
              {mode === "edit" && (
                <>
                  <span className="absolute top-1 left-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 text-primary-foreground" />
                  </span>
                  <button
                    type="button"
                    aria-label="Remover foto da galeria"
                    onClick={() => handleRemove(ref)}
                    className="absolute top-1 right-1 h-5 w-5 shadow-sm rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-90 hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {mode === "view" && active.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nenhuma foto selecionada. Use “Editar galeria” para escolher as fotos.
        </p>
      )}

      {mode === "edit" && (
        <div className="space-y-3">
          {placeId && (
            <GoogleHotelPhotos
              placeId={placeId}
              onPhotosSelected={handleGoogleSelected}
              onPhotoRemoved={handleRemove}
              existingUrls={draft}
              autoShow
              alwaysOpen
              hideCounter
              disabled={atLimit}
              headingLabel={HOTEL_GALLERY_SUGGESTIONS_TITLE}
              loadingLabel="Buscando sugestões do Google…"
            />
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              aria-label="Adicionar foto por URL"
              onClick={() => setUrlOpen((v) => !v)}
              disabled={atLimit}
            >
              <Link2 className="h-3.5 w-3.5" />
              Adicionar foto por URL
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              aria-label="Enviar foto do computador"
              onClick={() => fileRef.current?.click()}
              disabled={atLimit || uploading}
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
              {uploading ? "Enviando…" : "Enviar foto"}
            </Button>
          </div>

          {urlOpen && (
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3" data-testid="hotel-gallery-url-form">
              <Input
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                placeholder={HOTEL_GALLERY_URL_PLACEHOLDER}
                aria-label="Link direto da imagem"
                disabled={urlLoading}
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={handleAddUrl}
                  disabled={urlLoading || atLimit}
                  aria-label="Adicionar foto"
                >
                  {urlLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  {urlLoading ? "Importando…" : "Adicionar foto"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => { setUrlOpen(false); setUrlValue(""); }}
                  disabled={urlLoading}
                  aria-label="Fechar adição por URL"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      )}

      {mode === "edit" && atLimit && (
        <p className="text-xs text-destructive" data-testid="hotel-gallery-limit">
          {HOTEL_GALLERY_LIMIT_MESSAGE}
        </p>
      )}
      {staleSaved && (
        <p className="text-xs text-destructive" data-testid="hotel-gallery-stale">
          {HOTEL_GALLERY_STALE_MESSAGE}
        </p>
      )}
      {feedback && (
        <p
          className={feedback.tone === "error" ? "text-xs text-destructive" : "text-xs text-muted-foreground"}
          data-testid="hotel-gallery-feedback"
          role="status"
        >
          {feedback.text}
        </p>
      )}
    </div>
  );
}
