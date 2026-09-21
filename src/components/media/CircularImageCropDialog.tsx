import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Check, Crosshair, ImageUp, Loader2, Minus, Plus } from "lucide-react";
import {
  CROP_OUTPUT_SIZE,
  MAX_ZOOM,
  MIN_ZOOM,
  clampZoom,
  cropImageToSquareBlob,
  defaultCropState,
  outputMimeForSource,
  type CropArea,
} from "@/lib/circularCrop";

export interface CircularImageCropDialogProps {
  open: boolean;
  /** Data URL (ou URL pública) da imagem a enquadrar. */
  imageSrc: string;
  /** MIME de origem — define se a saída mantém transparência. */
  sourceMime?: string;
  title?: string;
  description?: string;
  /** Rótulo do botão de confirmação. */
  confirmLabel?: string;
  /** Mostra o botão "Trocar imagem" quando informado. */
  onReplace?: () => void;
  onCancel: () => void;
  onConfirm: (blob: Blob, mime: string) => void | Promise<void>;
  /** Indica upload/salvamento em andamento. */
  saving?: boolean;
}

/**
 * Editor reutilizável de enquadramento com máscara circular.
 * Usado pela foto do agente e pelo logotipo da agência.
 */
export function CircularImageCropDialog({
  open,
  imageSrc,
  sourceMime = "image/jpeg",
  title = "Ajustar imagem",
  description = "Arraste para reposicionar e use o zoom para definir o que aparece dentro do círculo.",
  confirmLabel = "Confirmar",
  onReplace,
  onCancel,
  onConfirm,
  saving = false,
}: CircularImageCropDialogProps) {
  const [{ crop, zoom }, setCropState] = useState(defaultCropState);
  const [croppedArea, setCroppedArea] = useState<CropArea | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (open) {
      setCropState(defaultCropState());
      setCroppedArea(null);
      setError(null);
    }
  }, [open, imageSrc]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  const setZoom = useCallback((next: number) => {
    setCropState((prev) => ({ ...prev, zoom: clampZoom(next) }));
  }, []);

  const handleRecenter = useCallback(() => {
    setCropState(defaultCropState());
  }, []);

  const handleConfirm = async () => {
    if (!croppedArea) return;
    setProcessing(true);
    setError(null);
    try {
      const mime = outputMimeForSource(sourceMime);
      const blob = await cropImageToSquareBlob(imageSrc, croppedArea, {
        size: CROP_OUTPUT_SIZE,
        mime,
      });
      await onConfirm(blob, mime);
    } catch {
      setError("Não foi possível preparar a imagem. Tente novamente ou escolha outro arquivo.");
    } finally {
      setProcessing(false);
    }
  };

  const busy = processing || saving;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onCancel()}>
      <DialogContent
        className="h-[100dvh] max-h-[100dvh] w-screen max-w-none gap-4 overflow-y-auto rounded-none px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:h-auto sm:max-h-[92vh] sm:w-full sm:max-w-lg sm:rounded-lg sm:p-6"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          confirmRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div
          className="relative mx-auto h-[260px] w-full max-w-sm overflow-hidden rounded-lg bg-muted sm:h-[320px]"
          data-testid="circular-crop-stage"
        >
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            restrictPosition={false}
            objectFit="contain"
            onCropChange={(next) => setCropState((prev) => ({ ...prev, crop: next }))}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="circular-crop-zoom" className="sr-only">
            Zoom da imagem
          </Label>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0 sm:h-9 sm:w-9"
            aria-label="Diminuir zoom"
            onClick={() => setZoom(zoom - 0.1)}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Slider
            id="circular-crop-zoom"
            aria-label="Zoom da imagem"
            value={[zoom]}
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.02}
            onValueChange={([value]) => setZoom(value)}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0 sm:h-9 sm:w-9"
            aria-label="Aumentar zoom"
            onClick={() => setZoom(zoom + 0.1)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            className="h-11 sm:h-9"
            onClick={handleRecenter}
            aria-label="Centralizar e restaurar o enquadramento"
          >
            <Crosshair className="mr-2 h-4 w-4" />
            Centralizar
          </Button>
          {onReplace && (
            <Button
              type="button"
              variant="ghost"
              className="h-11 sm:h-9"
              onClick={onReplace}
              aria-label="Trocar imagem"
            >
              <ImageUp className="mr-2 h-4 w-4" />
              Trocar imagem
            </Button>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 sm:h-9"
            onClick={onCancel}
            disabled={busy}
          >
            Cancelar
          </Button>
          <Button
            ref={confirmRef}
            type="button"
            className="h-11 sm:h-9"
            onClick={handleConfirm}
            disabled={busy || !croppedArea}
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            {busy ? "Salvando..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
