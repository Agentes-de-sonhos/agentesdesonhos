/**
 * Utilitários compartilhados do editor de enquadramento circular
 * (foto do agente e logotipo da agência).
 *
 * Regras:
 * - Sempre preserva a proporção original da imagem (o recorte é quadrado, o zoom é uniforme).
 * - A saída é um quadrado otimizado; PNG/WebP mantêm transparência, JPEG continua JPEG.
 * - O arquivo original é guardado num caminho separado para reenquadramento futuro,
 *   sem alterar colunas de banco (nenhuma migration necessária).
 */

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ACCEPTED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const CROP_OUTPUT_SIZE = 512;
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

export type CircularImageKind = "avatar" | "logo";

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropState {
  crop: { x: number; y: number };
  zoom: number;
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; reason: "format" | "size"; title: string; message: string };

export function validateCircularImageFile(file: {
  name: string;
  type: string;
  size: number;
}): ValidationResult {
  const extension = "." + (file.name.split(".").pop() || "").toLowerCase();
  const typeOk = (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type);
  const extensionOk = (ACCEPTED_IMAGE_EXTENSIONS as readonly string[]).includes(extension);

  if (!typeOk || !extensionOk) {
    return {
      ok: false,
      reason: "format",
      title: "Formato inválido",
      message: "Use apenas JPG, PNG ou WebP",
    };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      reason: "size",
      title: "Arquivo muito grande",
      message: "O tamanho máximo é 5MB",
    };
  }

  return { ok: true };
}

export function clampZoom(zoom: number, min = MIN_ZOOM, max = MAX_ZOOM): number {
  if (!Number.isFinite(zoom)) return min;
  return Math.min(max, Math.max(min, zoom));
}

/** Estado neutro: imagem centralizada, sem zoom. Usado no "Centralizar". */
export function defaultCropState(): CropState {
  return { crop: { x: 0, y: 0 }, zoom: MIN_ZOOM };
}

/** Mantém transparência de PNG/WebP; qualquer outro formato sai como JPEG. */
export function outputMimeForSource(sourceMime: string): "image/png" | "image/webp" | "image/jpeg" {
  if (sourceMime === "image/png") return "image/png";
  if (sourceMime === "image/webp") return "image/webp";
  return "image/jpeg";
}

export function extensionForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

/**
 * Caminhos no bucket `avatars`.
 * - `croppedPath` mantém o nome histórico (`<user>/avatar.<ext>` | `<user>/logo.<ext>`),
 *   preservando compatibilidade e o isolamento por usuário/agência.
 * - `originalPath` guarda o arquivo enviado, para reenquadrar depois.
 */
export function circularImageStoragePaths(params: {
  userId: string;
  kind: CircularImageKind;
  outputMime: string;
  originalMime: string;
  timestamp?: number;
}): { croppedPath: string; originalPath: string } {
  const { userId, kind, outputMime, originalMime } = params;
  const stamp = params.timestamp ?? Date.now();
  return {
    croppedPath: `${userId}/${kind}.${extensionForMime(outputMime)}`,
    originalPath: `${userId}/originals/${kind}-${stamp}.${extensionForMime(originalMime)}`,
  };
}

/** Acrescenta cache-busting sem perder query string existente. */
export function withCacheBuster(url: string, stamp: number = Date.now()): string {
  const [base] = url.split("?");
  return `${base}?t=${stamp}`;
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (event) => reject(event));
    img.setAttribute("crossOrigin", "anonymous");
    img.src = url;
  });
}

/**
 * Lê o arquivo respeitando a orientação EXIF (quando o navegador suporta
 * `createImageBitmap` com `imageOrientation`), devolvendo uma data URL pronta
 * para o editor.
 */
export async function readImageAsOrientedDataUrl(file: File): Promise<string> {
  if (typeof createImageBitmap === "function" && typeof document !== "undefined") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close?.();
        return canvas.toDataURL(outputMimeForSource(file.type));
      }
      bitmap.close?.();
    } catch {
      // segue para o fallback abaixo
    }
  }

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Falha ao ler a imagem"));
    reader.readAsDataURL(file);
  });
}

/**
 * Gera o recorte quadrado otimizado. Não deforma: copia exatamente a área
 * quadrada selecionada e reamostra para `size` x `size`.
 */
export async function cropImageToSquareBlob(
  imageSrc: string,
  area: CropArea,
  options: { size?: number; mime?: string; quality?: number } = {}
): Promise<Blob> {
  const size = options.size ?? CROP_OUTPUT_SIZE;
  const mime = options.mime ?? "image/jpeg";
  const quality = options.quality ?? 0.92;

  const image = await createImage(imageSrc);
  const side = Math.max(1, Math.round(Math.min(area.width, area.height)));

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");

  if (mime === "image/jpeg") {
    // JPEG não tem alfa: fundo neutro apenas na apresentação do arquivo final.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, Math.round(area.x), Math.round(area.y), side, side, 0, 0, size, size);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível gerar a imagem"))),
      mime,
      quality
    );
  });
}
