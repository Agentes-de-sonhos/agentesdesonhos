/**
 * Busca segura de uma imagem remota (anti-SSRF) para importação no Storage.
 *
 * Regras: somente http/https, bloqueio de localhost/loopback/link-local e
 * faixas privadas IPv4/IPv6, revalidação de cada redirect, timeout e limite
 * de tamanho, Content-Type de imagem permitido (sem SVG/HTML) e — decisivo —
 * validação da assinatura real dos bytes (magic bytes). Um servidor que
 * declara `image/png` mas devolve HTML/executável é rejeitado.
 */

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const FETCH_TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 3;

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

function isPrivateIPv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast/reserved
  return false;
}

function isPrivateIPv6(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (!h.includes(":")) return false;
  if (h === "::" || h === "::1") return true;
  if (h.startsWith("fe80") || h.startsWith("fc") || h.startsWith("fd")) return true;
  if (h.startsWith("::ffff:")) return isPrivateIPv4(h.slice(7));
  return false;
}

export function isBlockedHost(hostname: string): boolean {
  const host = (hostname || "").toLowerCase().replace(/\.$/, "");
  if (!host) return true;
  if (["localhost", "0.0.0.0", "metadata", "metadata.google.internal"].includes(host)) return true;
  if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost")) return true;
  if (isPrivateIPv4(host) || isPrivateIPv6(host)) return true;
  return false;
}

/** Valida a URL e, quando possível, também os IPs resolvidos do host. */
export async function assertSafeImageUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL((raw || "").trim());
  } catch {
    throw new Error("Link inválido.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Use apenas links http ou https.");
  }
  if (isBlockedHost(url.hostname)) throw new Error("Este endereço não é permitido.");

  const isLiteralIp = /^\[?[0-9a-f:.]+\]?$/i.test(url.hostname) && !/[a-z]/i.test(url.hostname.replace(/[a-f:]/gi, ""));
  if (!isLiteralIp) {
    try {
      const records = await Promise.allSettled([
        Deno.resolveDns(url.hostname, "A"),
        Deno.resolveDns(url.hostname, "AAAA"),
      ]);
      const ips = records.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
      if (ips.some((ip) => isBlockedHost(ip))) {
        throw new Error("Este endereço não é permitido.");
      }
    } catch (e) {
      if (e instanceof Error && e.message === "Este endereço não é permitido.") throw e;
      // Falha de resolução não deve bloquear: o fetch abaixo também falharia.
    }
  }
  return url;
}

export interface FetchedImage {
  bytes: Uint8Array;
  contentType: string;
}

/** Faz o download seguindo redirects manualmente e revalidando cada destino. */
export async function fetchRemoteImage(rawUrl: string): Promise<FetchedImage> {
  let current = await assertSafeImageUrl(rawUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let resp: Response;
    try {
      resp = await fetch(current.toString(), {
        redirect: "manual",
        signal: controller.signal,
        headers: { Accept: "image/*" },
      });
    } catch {
      clearTimeout(timer);
      throw new Error("Não foi possível carregar a imagem deste link.");
    }
    clearTimeout(timer);

    if (resp.status >= 300 && resp.status < 400) {
      const loc = resp.headers.get("location");
      await resp.body?.cancel();
      if (!loc) throw new Error("Não foi possível carregar a imagem deste link.");
      current = await assertSafeImageUrl(new URL(loc, current).toString());
      continue;
    }

    if (!resp.ok) {
      await resp.body?.cancel();
      throw new Error("Não foi possível carregar a imagem deste link.");
    }

    const contentType = (resp.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
      await resp.body?.cancel();
      throw new Error("O link não aponta para uma imagem compatível (JPG, PNG, WEBP, GIF ou AVIF).");
    }
    const declared = Number(resp.headers.get("content-length") || "0");
    if (declared && declared > MAX_IMAGE_BYTES) {
      await resp.body?.cancel();
      throw new Error("A imagem é muito grande (máx. 8 MB).");
    }

    const buf = new Uint8Array(await resp.arrayBuffer());
    if (buf.byteLength === 0) throw new Error("Não foi possível carregar a imagem deste link.");
    if (buf.byteLength > MAX_IMAGE_BYTES) throw new Error("A imagem é muito grande (máx. 8 MB).");

    // Header pode ser falsificado: o tipo real vem da assinatura dos bytes.
    const sniffed = sniffImageType(buf);
    if (!sniffed) {
      throw new Error("O conteúdo deste link não é uma imagem válida (JPG, PNG, WEBP, GIF ou AVIF).");
    }
    return { bytes: buf, contentType: sniffed };
  }

  throw new Error("Não foi possível carregar a imagem deste link.");
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
