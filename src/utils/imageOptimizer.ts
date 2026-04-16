/**
 * Client-side image optimization utility.
 * Resizes, compresses and converts images to WebP before upload.
 */

const MAX_WIDTH = 1200;
const QUALITY = 0.75;
const THUMB_WIDTH = 400;
const THUMB_QUALITY = 0.6;
const MAX_FILE_SIZE_MB = 10;
const ASPECT_RATIO = 4 / 3; // target w/h

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

/** Center-crop to target aspect ratio, then resize and compress */
function processCanvas(
  img: HTMLImageElement,
  maxWidth: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Calculate center crop for 4:3
    let srcW = img.naturalWidth;
    let srcH = img.naturalHeight;
    let cropX = 0;
    let cropY = 0;

    const currentRatio = srcW / srcH;
    if (currentRatio > ASPECT_RATIO) {
      // Too wide — crop sides
      const newW = Math.round(srcH * ASPECT_RATIO);
      cropX = Math.round((srcW - newW) / 2);
      srcW = newW;
    } else if (currentRatio < ASPECT_RATIO) {
      // Too tall — crop top/bottom
      const newH = Math.round(srcW / ASPECT_RATIO);
      cropY = Math.round((srcH - newH) / 2);
      srcH = newH;
    }

    // Target dimensions
    let outW = srcW;
    let outH = srcH;
    if (outW > maxWidth) {
      outW = maxWidth;
      outH = Math.round(maxWidth / ASPECT_RATIO);
    }

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return reject(new Error("Canvas not supported"));

    ctx.drawImage(img, cropX, cropY, srcW, srcH, 0, 0, outW, outH);

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

/** Optimize an image file: resize, crop 4:3, compress to WebP, generate thumbnail */
export async function optimizeImage(file: File): Promise<OptimizedResult> {
  const img = await loadImage(file);

  const [full, thumb] = await Promise.all([
    processCanvas(img, MAX_WIDTH, QUALITY),
    processCanvas(img, THUMB_WIDTH, THUMB_QUALITY),
  ]);

  URL.revokeObjectURL(img.src);

  return {
    full,
    thumb,
    originalSize: file.size,
    optimizedSize: full.size,
    width: Math.min(img.naturalWidth, MAX_WIDTH),
    height: Math.round(Math.min(img.naturalWidth, MAX_WIDTH) / ASPECT_RATIO),
  };
}

/** Format bytes for display */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
