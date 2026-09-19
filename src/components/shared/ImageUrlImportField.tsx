import { useCallback, useId, useState } from "react";
import { Link2, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  HOTEL_GALLERY_URL_PLACEHOLDER,
  containsImageRef,
  isValidHttpImageUrl,
} from "@/lib/quoteHotelGallery";

export const IMAGE_URL_TRIGGER_LABEL = "Adicionar link da internet";
export const IMAGE_URL_INVALID_MESSAGE = "Informe um link http ou https válido de imagem.";
export const IMAGE_URL_DUPLICATE_MESSAGE = "Esta foto já está na lista.";
export const IMAGE_URL_FAILED_MESSAGE =
  "Não foi possível carregar a imagem deste link. Tente novamente.";

interface Props {
  /** Fotos já presentes na coleção do serviço (para evitar duplicidade). */
  existingUrls: string[];
  /** Recebe a URL importada (já hospedada no bucket de orçamentos). */
  onAdd: (url: string) => void;
  /** Limite atingido: bloqueia o botão e a confirmação. */
  disabled?: boolean;
  /** Mensagem exibida quando o limite de fotos foi atingido. */
  limitMessage?: string;
}

/**
 * Bloco inline de "adicionar imagem por link da internet".
 *
 * Reutiliza a mesma validação (`isValidHttpImageUrl`), a mesma Edge Function de
 * importação (`import-quote-image`, anti-SSRF + validação de bytes) e a mesma
 * identidade visual do fluxo já existente na galeria de hospedagem.
 */
export function ImageUrlImportField({ existingUrls, onAdd, disabled, limitMessage }: Props) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setValue("");
    setError(null);
  }, []);

  const handleAdd = useCallback(async () => {
    const candidate = value.trim();
    if (!isValidHttpImageUrl(candidate)) {
      setError(IMAGE_URL_INVALID_MESSAGE);
      return;
    }
    if (containsImageRef(existingUrls || [], candidate)) {
      setError(IMAGE_URL_DUPLICATE_MESSAGE);
      return;
    }
    if (disabled) {
      setError(limitMessage || null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("import-quote-image", {
        body: { url: candidate },
      });
      const importedUrl: string | undefined = (data as { url?: string } | null)?.url;
      if (fnError || !importedUrl) {
        setError((data as { error?: string } | null)?.error || IMAGE_URL_FAILED_MESSAGE);
        return;
      }
      if (containsImageRef(existingUrls || [], importedUrl)) {
        setError(IMAGE_URL_DUPLICATE_MESSAGE);
        return;
      }
      onAdd(importedUrl);
      close();
    } catch {
      setError(IMAGE_URL_FAILED_MESSAGE);
    } finally {
      setLoading(false);
    }
  }, [value, existingUrls, disabled, limitMessage, onAdd, close]);

  return (
    <div className="space-y-2" data-testid="image-url-import">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        aria-label={IMAGE_URL_TRIGGER_LABEL}
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        disabled={disabled}
      >
        <Link2 className="h-3.5 w-3.5" />
        {IMAGE_URL_TRIGGER_LABEL}
      </Button>

      {open && (
        <div
          className="space-y-2 rounded-lg border border-border bg-muted/30 p-3"
          data-testid="image-url-import-form"
        >
          <Label htmlFor={inputId} className="text-xs text-muted-foreground">
            Link direto da imagem
          </Label>
          <Input
            id={inputId}
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(null); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); void handleAdd(); }
              if (e.key === "Escape") { e.preventDefault(); close(); }
            }}
            placeholder={HOTEL_GALLERY_URL_PLACEHOLDER}
            aria-label="Link direto da imagem"
            inputMode="url"
            disabled={loading}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleAdd}
              disabled={loading || disabled}
              aria-label="Adicionar foto do link"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              {loading ? "Importando…" : "Adicionar foto"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={close}
              disabled={loading}
              aria-label="Fechar adição por link"
            >
              Cancelar
            </Button>
          </div>
          {error && (
            <p className="text-xs text-destructive" role="status" data-testid="image-url-import-error">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
