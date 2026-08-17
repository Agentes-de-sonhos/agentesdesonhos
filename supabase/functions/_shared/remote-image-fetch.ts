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

import {
  sniffImageType,
  extensionForContentType,
  normalizeRemoteImageUrl,
  sha256Hex,
} from "./image-signature.ts";

export { sniffImageType, extensionForContentType, normalizeRemoteImageUrl, sha256Hex };

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const FETCH_TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 3;

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

