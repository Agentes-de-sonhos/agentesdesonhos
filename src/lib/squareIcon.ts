/**
 * Centraliza um logo (qualquer proporção) num quadrado com fundo branco e
 * retorna um PNG em data URL. Atalhos da tela inicial exigem ícones 1:1.
 */
export function buildSquareIcon(src: string, size = 512, padding = 0.12): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no-canvas"));
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size, size);
        const box = size * (1 - padding * 2);
        const ratio = Math.min(box / img.width, box / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error("load-failed"));
    img.src = src;
  });
}
