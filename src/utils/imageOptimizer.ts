/**
 * Client-side image optimization utility.
 * Resizes, compresses and converts images to WebP before upload.
 */

const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1600; // Allow taller images (vertical photos) without cropping
const QUALITY = 0.75;
const THUMB_WIDTH = 400;
const THUMB_QUALITY = 0.6;
const MAX_FILE_SIZE_MB = 10;

export interface OptimizedResult {
  full: Blob;
  thumb: Blob;
  originalSize: number;
  optimizedSize: number;
  width: number;
  height: number;
}

/** Validate file before processing */
export function validateImageFile(file: File): string | null {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    return "Formato não suportado. Use JPG, PNG ou WebP.";
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: ${MAX_FILE_SIZE_MB}MB.`;
  }
  return null;
}

/** Load an image from a File */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/** Resize proportionally (no cropping) and compress to WebP */
function processCanvas(
  img: HTMLImageElement,
  maxWidth: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Preserve original aspect ratio — no cropping.
    // Scale down so the longest side fits within the max bounds.
    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;
    const maxH = Math.round((maxWidth / MAX_WIDTH) * MAX_HEIGHT); // proportional cap for thumbs
    const scale = Math.min(1, maxWidth / srcW, maxH / srcH);
    const outW = Math.max(1, Math.round(srcW * scale));
    const outH = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return reject(new Error("Canvas not supported"));

    ctx.drawImage(img, 0, 0, srcW, srcH, 0, 0, outW, outH);

    // Try WebP first, fallback to JPEG
    canvas.toBlob(
      (blob) => {
        if (blob) return resolve(blob);
        // Fallback to JPEG
        canvas.toBlob(
          (jpgBlob) => {
            if (jpgBlob) resolve(jpgBlob);
            else reject(new Error("Failed to compress image"));
          },
          "image/jpeg",
          quality
        );
      },
      "image/webp",
      quality
    );
  });
}

/** Optimize an image file: resize proportionally, compress to WebP, generate thumbnail */
export async function optimizeImage(file: File): Promise<OptimizedResult> {
  const img = await loadImage(file);

  const [full, thumb] = await Promise.all([
    processCanvas(img, MAX_WIDTH, QUALITY),
    processCanvas(img, THUMB_WIDTH, THUMB_QUALITY),
  ]);

  URL.revokeObjectURL(img.src);

  const scale = Math.min(1, MAX_WIDTH / img.naturalWidth, MAX_HEIGHT / img.naturalHeight);
  return {
    full,
    thumb,
    originalSize: file.size,
    optimizedSize: full.size,
    width: Math.max(1, Math.round(img.naturalWidth * scale)),
    height: Math.max(1, Math.round(img.naturalHeight * scale)),
  };
}

/** Format bytes for display */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
