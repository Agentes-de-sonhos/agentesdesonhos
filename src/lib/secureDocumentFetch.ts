import {
  extractVoucherPath,
  buildPublicVoucherProxyUrl,
  getSignedVoucherUrl,
  getPublicVoucherUrl,
} from "@/lib/secureVoucher";
import { getDocumentKind, type ServiceDocumentKind } from "@/lib/serviceDocuments";

export interface SecureDocumentSource {
  filePath: string;
  fileName: string;
  mode: "public" | "authenticated";
  shareToken?: string;
  slug?: string;
  password?: string;
}

export interface SecureDocumentBlob {
  /** Local object URL (blob:) — never a Supabase URL. */
  objectUrl: string;
  blob: Blob;
  contentType: string;
  fileName: string;
  kind: ServiceDocumentKind;
}

export const SECURE_DOCUMENT_ERROR =
  "Não foi possível abrir este arquivo. Tente novamente.";

/** Resolve the internal (never displayed) endpoint that serves the bytes. */
async function resolveInternalUrl(source: SecureDocumentSource): Promise<string | null> {
  if (source.mode === "public") {
    // Caminho rápido: proxy permanente quando há share_token válido.
    const proxy = buildPublicVoucherProxyUrl(source.filePath, source.shareToken);
    if (proxy) return proxy;
    // Formato público legado (slug/senha): obtém URL assinada apenas para uso interno.
    if (source.slug || source.shareToken || source.password) {
      return getPublicVoucherUrl(source.filePath, {
        slug: source.slug,
        share_token: source.shareToken,
        password: source.password,
      });
    }
    return null;
  }
  return getSignedVoucherUrl(source.filePath);
}

/** Pick a display kind from the response content-type, falling back to the name. */
export function resolveDocumentKind(fileName: string, contentType?: string | null): ServiceDocumentKind {
  const ct = (contentType || "").toLowerCase();
  if (ct.includes("pdf")) return "pdf";
  if (ct.startsWith("image/")) return "image";
  return getDocumentKind(fileName);
}

/**
 * Fetch a protected document and expose it as a local blob URL.
 * The Supabase endpoint is only ever used inside fetch — never in navigation.
 */
export async function fetchSecureDocument(
  source: SecureDocumentSource,
): Promise<SecureDocumentBlob> {
  const url = await resolveInternalUrl(source);
  if (!url) throw new Error(SECURE_DOCUMENT_ERROR);

  let response: Response;
  try {
    response = await fetch(url, { method: "GET", cache: "no-store" });
  } catch {
    throw new Error(SECURE_DOCUMENT_ERROR);
  }
  if (!response.ok) throw new Error(SECURE_DOCUMENT_ERROR);

  const blob = await response.blob();
  if (!blob || blob.size === 0) throw new Error(SECURE_DOCUMENT_ERROR);

  const headerType = response.headers.get("content-type");
  const disposition = response.headers.get("content-disposition");
  const fileName =
    source.fileName ||
    fileNameFromDisposition(disposition) ||
    extractVoucherPath(source.filePath).split("/").pop() ||
    "documento";
  const contentType = blob.type || headerType || "application/octet-stream";

  return {
    objectUrl: URL.createObjectURL(blob),
    blob,
    contentType,
    fileName,
    kind: resolveDocumentKind(fileName, contentType),
  };
}

export function fileNameFromDisposition(disposition?: string | null): string | null {
  if (!disposition) return null;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim());
    } catch {
      return star[1].trim();
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  return plain?.[1]?.trim() || null;
}

export function revokeObjectUrl(objectUrl?: string | null) {
  if (objectUrl && objectUrl.startsWith("blob:")) URL.revokeObjectURL(objectUrl);
}

/**
 * Download without navigating: fetch → blob → temporary anchor → revoke.
 */
export async function downloadSecureDocument(source: SecureDocumentSource): Promise<void> {
  const doc = await fetchSecureDocument(source);
  try {
    const a = document.createElement("a");
    a.href = doc.objectUrl;
    a.download = doc.fileName;
    a.rel = "noopener noreferrer";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // Give the browser a tick to start the download before releasing memory.
    setTimeout(() => revokeObjectUrl(doc.objectUrl), 10_000);
  }
}