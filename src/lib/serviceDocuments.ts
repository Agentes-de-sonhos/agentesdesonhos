/**
 * Normalização de documentos/anexos de serviços da viagem.
 *
 * Formatos legados suportados (todos convergem para uma lista única, sem duplicatas):
 *  - service.voucher_url + service.voucher_name
 *  - service.attachments: [{ url, name }]
 *  - service.documents / service.files: [{ url|file_url|path, name|file_name, size|file_size }]
 *  - service_data.attachment_url | document_url | voucher_url | file_url (+ *_name)
 *  - service_data.attachments | documents | files (arrays de objetos ou strings)
 *  - service_data.document_urls | attachment_urls | file_urls (arrays de strings)
 */

export type ServiceDocumentKind = "pdf" | "image" | "doc" | "sheet" | "file";

export interface ServiceDocument {
  /** Caminho/URL original armazenado (usado pela resolução segura existente). */
  path: string;
  /** Nome legível do arquivo. */
  name: string;
  kind: ServiceDocumentKind;
  /** Extensão em maiúsculas, quando derivável do nome/caminho. */
  ext: string | null;
  /** Tamanho formatado, apenas quando o metadado já existe. */
  size: string | null;
}

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif", "heic", "bmp"]);
const DOC_EXT = new Set(["doc", "docx", "rtf", "txt", "odt"]);
const SHEET_EXT = new Set(["xls", "xlsx", "csv", "ods"]);

function baseName(pathOrUrl: string): string {
  const clean = pathOrUrl.split("?")[0].split("#")[0];
  const last = clean.split("/").filter(Boolean).pop() || "";
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

export function getDocumentExtension(nameOrPath: string): string | null {
  const base = baseName(nameOrPath);
  const idx = base.lastIndexOf(".");
  if (idx <= 0 || idx === base.length - 1) return null;
  const ext = base.slice(idx + 1).toLowerCase();
  if (!/^[a-z0-9]{1,6}$/.test(ext)) return null;
  return ext;
}

export function getDocumentKind(nameOrPath: string): ServiceDocumentKind {
  const ext = getDocumentExtension(nameOrPath);
  if (!ext) return "file";
  if (ext === "pdf") return "pdf";
  if (IMAGE_EXT.has(ext)) return "image";
  if (DOC_EXT.has(ext)) return "doc";
  if (SHEET_EXT.has(ext)) return "sheet";
  return "file";
}

export function formatDocumentSize(bytes: unknown): string | null {
  const n = typeof bytes === "number" ? bytes : Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Buckets conhecidos que podem aparecer como prefixo em caminhos relativos. */
const KNOWN_BUCKET_PREFIXES = [
  "vouchers",
  "traveler-documents",
  "ticket-attachments",
  "media-files",
];

/**
 * Chave de deduplicação: ignora querystring/assinatura e o prefixo do bucket,
 * de modo que "vouchers/u1/voucher.pdf" e
 * ".../storage/v1/object/sign/vouchers/u1/voucher.pdf?token=abc"
 * gerem a mesma chave — sem colapsar objetos realmente distintos.
 */
function dedupeKey(pathOrUrl: string): string {
  const clean = safeDecode(pathOrUrl.split("?")[0].split("#")[0]).trim();
  if (!clean) return "";

  // URLs do Storage: /storage/v1/object/{public|sign|authenticated}/<bucket>/<objeto>
  const storage = clean.match(
    /\/storage\/v1\/object\/(?:public|sign|authenticated)\/[^/]+\/(.+)$/i,
  );
  if (storage) return storage[1].replace(/^\/+/, "").toLowerCase();

  let rel = clean.replace(/^\/+/, "");

  // Caminho relativo com prefixo de bucket conhecido ("vouchers/u1/x.pdf").
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(rel)) {
    for (const bucket of KNOWN_BUCKET_PREFIXES) {
      const prefix = `${bucket}/`;
      if (rel.toLowerCase().startsWith(prefix)) {
        rel = rel.slice(prefix.length);
        break;
      }
    }
    return rel.replace(/^\/+/, "").toLowerCase();
  }

  // Outras URLs absolutas (compatibilidade): usa o caminho após o bucket
  // conhecido quando presente, senão a URL inteira sem query.
  for (const bucket of KNOWN_BUCKET_PREFIXES) {
    const marker = `/${bucket}/`;
    const idx = rel.toLowerCase().indexOf(marker);
    if (idx !== -1) return rel.slice(idx + marker.length).replace(/^\/+/, "").toLowerCase();
  }
  return rel.toLowerCase();
}

interface RawCandidate {
  path?: unknown;
  name?: unknown;
  size?: unknown;
}

function pushCandidate(list: RawCandidate[], value: unknown, fallbackName?: unknown) {
  if (!value) return;
  if (typeof value === "string") {
    list.push({ path: value, name: fallbackName });
    return;
  }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    const path = o.url ?? o.file_url ?? o.fileUrl ?? o.path ?? o.file_path ?? o.voucher_url;
    if (!path) return;
    list.push({
      path,
      name: o.name ?? o.file_name ?? o.fileName ?? o.label ?? o.title ?? fallbackName,
      size: o.size ?? o.file_size ?? o.fileSize ?? o.bytes,
    });
  }
}

function pushMany(list: RawCandidate[], value: unknown) {
  if (!Array.isArray(value)) return;
  for (const item of value) pushCandidate(list, item);
}

const DATA_SINGLE_FIELDS: Array<[string, string]> = [
  ["attachment_url", "attachment_name"],
  ["document_url", "document_name"],
  ["voucher_url", "voucher_name"],
  ["file_url", "file_name"],
];

const DATA_LIST_FIELDS = [
  "attachments",
  "documents",
  "files",
  "document_urls",
  "attachment_urls",
  "file_urls",
];

export function collectServiceDocuments(service: unknown): ServiceDocument[] {
  if (!service || typeof service !== "object") return [];
  const s = service as Record<string, any>;
  const raw: RawCandidate[] = [];

  pushCandidate(raw, s.voucher_url, s.voucher_name);
  pushMany(raw, s.attachments);
  pushMany(raw, s.documents);
  pushMany(raw, s.files);

  const data = s.service_data && typeof s.service_data === "object" ? s.service_data : {};
  for (const [urlField, nameField] of DATA_SINGLE_FIELDS) {
    pushCandidate(raw, data[urlField], data[nameField]);
  }
  for (const field of DATA_LIST_FIELDS) pushMany(raw, data[field]);

  const seen = new Set<string>();
  const out: ServiceDocument[] = [];
  for (const c of raw) {
    if (typeof c.path !== "string") continue;
    const path = c.path.trim();
    if (!path) continue;
    const key = dedupeKey(path);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const rawName = typeof c.name === "string" ? c.name.trim() : "";
    const name = rawName || baseName(path) || "Documento";
    const ext = getDocumentExtension(name) ?? getDocumentExtension(path);
    out.push({
      path,
      name,
      kind: getDocumentKind(name.includes(".") ? name : path),
      ext: ext ? ext.toUpperCase() : null,
      size: formatDocumentSize(c.size),
    });
  }
  return out;
}
