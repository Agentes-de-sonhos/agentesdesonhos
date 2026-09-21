import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  CROP_MASK_RATIO,
  CROP_OUTPUT_SIZE,
  cropMaskSide,
  initialZoomForMedia,
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
  /**
   * Enquadramento inicial (mesmo componente para os dois casos):
   * - "contain" (padrão do logotipo): o logotipo inteiro cabe no círculo;
   * - "cover" (foto do agente): o círculo já começa preenchido.
   */
  fitMode?: "contain" | "cover";
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
  fitMode = "contain",
}: CircularImageCropDialogProps) {
  const [{ crop, zoom }, setCropState] = useState(defaultCropState);
  const [croppedArea, setCroppedArea] = useState<CropArea | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [mediaSize, setMediaSize] = useState<{ width: number; height: number } | null>(null);

  // Máscara REAL do recorte: ~88% da menor dimensão do palco medido
  // (mesma área usada no preview e na imagem exportada).
  const maskSide = cropMaskSide(stageSize);
  // identidade estável: um objeto novo a cada render faz o Cropper recalcular
  // em laço (o recálculo dispara onCropComplete e volta a renderizar).
  const cropSize = useMemo(
    () => (maskSide > 0 ? { width: maskSide, height: maskSide } : undefined),
    [maskSide],
  );
  const fitZoom = mediaSize
    ? initialZoomForMedia({
        mediaWidth: mediaSize.width,
        mediaHeight: mediaSize.height,
        maskSide,
        mode: fitMode,
      })
    : 1;

  const observerRef = useRef<ResizeObserver | null>(null);

  /**
   * Mede o palco assim que ele existe (ref de callback: o diálogo monta em
   * portal, então um efeito pode rodar antes do elemento estar no layout).
   */
  const attachStage = useCallback((el: HTMLDivElement | null) => {
    stageRef.current = el;
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!el) return;
    const measure = () => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      setStageSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    };
    measure();
    // segunda medição no próximo frame: durante a animação de abertura o
    // elemento pode ainda estar com altura zero
    requestAnimationFrame(measure);
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(measure);
      observer.observe(el);
      observerRef.current = observer;
    }
  }, []);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  useEffect(() => {
    if (open) {
      setCropState(defaultCropState());
      setCroppedArea(null);
      setMediaSize(null);
      setError(null);
    }
  }, [open, imageSrc]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedArea((prev) =>
      prev &&
      prev.x === pixels.x &&
      prev.y === pixels.y &&
      prev.width === pixels.width &&
      prev.height === pixels.height
        ? prev
        : pixels,
    );
  }, []);

  const setZoom = useCallback((next: number) => {
    setCropState((prev) => {
      const zoom = clampZoom(next);
      return Math.abs(prev.zoom - zoom) < 0.0001 ? prev : { ...prev, zoom };
    });
  }, []);

  const setCrop = useCallback((next: { x: number; y: number }) => {
    setCropState((prev) =>
      Math.abs(prev.crop.x - next.x) < 0.0001 && Math.abs(prev.crop.y - next.y) < 0.0001
        ? prev
        : { ...prev, crop: next },
    );
  }, []);

  const handleRecenter = useCallback(() => {
    setCropState(defaultCropState(fitZoom));
  }, [fitZoom]);

  /** Ao carregar a mídia, o zoom parte do enquadramento útil (nunca minúsculo). */
  const handleMediaLoaded = useCallback(
    (size: { width: number; height: number }) => {
      setMediaSize({ width: size.width, height: size.height });
      const next = initialZoomForMedia({
        mediaWidth: size.width,
        mediaHeight: size.height,
        maskSide: cropMaskSide(
          stageRef.current
            ? { width: stageRef.current.clientWidth, height: stageRef.current.clientHeight }
            : stageSize,
        ),
        mode: fitMode,
      });
      setCropState(defaultCropState(next));
    },
    [fitMode, stageSize],
  );

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
          ref={attachStage}
          className="relative mx-auto h-[320px] w-full max-w-sm overflow-hidden rounded-lg bg-muted sm:h-[360px]"
          data-testid="circular-crop-stage"
          data-mask-ratio={CROP_MASK_RATIO}
          data-mask-side={maskSide || undefined}
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
            {...(cropSize ? { cropSize } : {})}
            onMediaLoaded={handleMediaLoaded}
            onCropChange={setCrop}
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
