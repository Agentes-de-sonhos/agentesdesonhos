/**
 * Utilitários de importação de materiais a partir de pastas do Google Drive.
 * Fase 1: apenas leitura de pastas compartilhadas publicamente.
 */

export const DRIVE_ALLOWED_HOSTS = [
  "drive.google.com",
  "docs.google.com",
  "drive.usercontent.google.com",
];

export type DriveFolderParseResult =
  | { ok: true; folderId: string; normalizedUrl: string }
  | { ok: false; error: string };

const FOLDER_ID_RE = /^[A-Za-z0-9_-]{10,}$/;

/**
 * Aceita URLs de pasta do Google Drive (ou o próprio ID) e devolve o ID normalizado.
 */
export function parseDriveFolderUrl(input: string): DriveFolderParseResult {
  const raw = (input || "").trim();
  if (!raw) return { ok: false, error: "Informe o link da pasta do Google Drive." };

  // ID puro colado direto
  if (!raw.includes("/") && !raw.includes(".") && FOLDER_ID_RE.test(raw)) {
    return { ok: true, folderId: raw, normalizedUrl: driveFolderUrl(raw) };
  }

  let url: URL;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return { ok: false, error: "Link inválido. Cole a URL completa da pasta do Google Drive." };
  }

  if (url.protocol !== "https:") {
    return { ok: false, error: "Use um link https do Google Drive." };
  }

  const host = url.hostname.toLowerCase();
  if (!DRIVE_ALLOWED_HOSTS.includes(host)) {
    return { ok: false, error: "O link precisa ser de uma pasta do Google Drive." };
  }

  const fromPath = url.pathname.match(/\/folders\/([A-Za-z0-9_-]+)/);
  const candidate = fromPath?.[1] || url.searchParams.get("id") || "";

  if (!candidate || !FOLDER_ID_RE.test(candidate)) {
    return {
      ok: false,
      error: "Não encontramos o ID da pasta no link. Use o link do tipo drive.google.com/drive/folders/…",
    };
  }

  return { ok: true, folderId: candidate, normalizedUrl: driveFolderUrl(candidate) };
}

export function driveFolderUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${folderId}`;
}

export function driveFileUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

/** Tipos MIME suportados na fase 1. */
export const SUPPORTED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;

export function isSupportedMimeType(mime?: string | null): boolean {
  if (!mime) return false;
  return (SUPPORTED_MIME_TYPES as readonly string[]).includes(mime.toLowerCase().split(";")[0].trim());
}

/** Converte o MIME em um material_type usado pela galeria de Materiais. */
export function materialTypeFromMime(mime?: string | null): "Imagem" | "PDF" {
  return (mime || "").toLowerCase().startsWith("image/") ? "Imagem" : "PDF";
}

export interface ImportFileOutcome {
  fileId: string;
  fileName: string;
  mimeType?: string | null;
  status: "added" | "existing" | "ignored" | "failed";
  message?: string;
}

export interface ImportSummary {
  totalFound: number;
  added: number;
  existing: number;
  ignored: number;
  failed: number;
}

export function summarizeImportOutcomes(outcomes: ImportFileOutcome[]): ImportSummary {
  return {
    totalFound: outcomes.length,
    added: outcomes.filter((o) => o.status === "added").length,
    existing: outcomes.filter((o) => o.status === "existing").length,
    ignored: outcomes.filter((o) => o.status === "ignored").length,
    failed: outcomes.filter((o) => o.status === "failed").length,
  };
}

export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const IMPORT_STATUS_LABEL: Record<string, string> = {
  a_revisar: "A revisar",
  aprovado: "Aprovado",
  descartado: "Descartado",
};
