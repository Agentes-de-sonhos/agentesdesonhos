/**
 * Helpers puros de imagem (sem APIs específicas do Deno) compartilhados pelas
 * Edge Functions e cobertos por testes no app.
 */
/**
 * Detecta o tipo real da imagem pela assinatura dos bytes.
 * Retorna `null` quando o conteúdo não é uma das imagens suportadas.
 */
export function sniffImageType(bytes: Uint8Array): string | null {
  const b = bytes;
  if (b.length < 12) return null;
  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) return "image/png";
  // GIF: GIF87a / GIF89a
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 && (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61) {
    return "image/gif";
  }
  const ascii = (start: number, len: number) =>
    String.fromCharCode(...b.slice(start, start + len)).toLowerCase();
  // WEBP: "RIFF"…"WEBP"
  if (ascii(0, 4) === "riff" && ascii(8, 4) === "webp") return "image/webp";
  // AVIF/HEIF-family: "ftyp" + brand
  if (ascii(4, 4) === "ftyp") {
    const brand = ascii(8, 4);
    if (brand === "avif" || brand === "avis") return "image/avif";
  }
  return null;
}

/**
 * Normalização canônica da URL de origem — base da identidade determinística
 * da importação (mesmo link ⇒ mesmo arquivo, sem duplicar no bucket).
 */
export function normalizeRemoteImageUrl(raw: string): string {
  const value = (raw || "").trim();
  try {
    const u = new URL(value);
    u.hash = "";
    u.hostname = u.hostname.toLowerCase();
    u.protocol = u.protocol.toLowerCase();
    const path = u.pathname.replace(/\/+$/, "");
    return `${u.protocol}//${u.host}${path}${u.search}`;
  } catch {
    return value;
  }
}

/** SHA-256 hex de um texto (identidade estável da URL de origem). */
export async function sha256Hex(input: string | Uint8Array): Promise<string> {
  const data = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function extensionForContentType(contentType: string): string {
  switch (contentType) {
    case "image/png": return "png";
    case "image/webp": return "webp";
    case "image/gif": return "gif";
    case "image/avif": return "avif";
    default: return "jpg";
  }
}
