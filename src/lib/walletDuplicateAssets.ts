/**
 * Duplicação de Carteira Digital — cópia independente dos arquivos.
 *
 * Regra de segurança: a carteira duplicada NUNCA aponta para o mesmo objeto
 * do storage da carteira de origem. Como remover um voucher/anexo apaga o
 * objeto físico (ver `useTrips`), cada arquivo é copiado para um novo caminho
 * `${userId}/${newTripId}/<uuid>.<ext>` dentro do bucket `vouchers`.
 */
import { safeUuid } from "@/lib/safeUuid";

export const VOUCHER_BUCKET = "vouchers";

export interface StorageBucketLike {
  copy: (from: string, to: string) => Promise<{ error: unknown }>;
  download: (path: string) => Promise<{ data: Blob | null; error: unknown }>;
  upload: (
    path: string,
    body: Blob,
    options?: { contentType?: string; upsert?: boolean },
  ) => Promise<{ error: unknown }>;
  remove: (paths: string[]) => Promise<{ error: unknown }>;
}

export interface StorageClientLike {
  storage: { from: (bucket: string) => StorageBucketLike };
}

/** Caminho interno do bucket `vouchers` (nunca URL pública/externa). */
export function isVoucherStoragePath(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const raw = value.trim();
  if (!raw) return false;
  if (/^(https?:|data:|blob:)/i.test(raw)) return false;
  if (raw.startsWith("/") || raw.includes("..") || raw.includes("\\")) return false;
  return raw.includes("/");
}

function extensionOf(path: string): string {
  const name = path.split("/").pop() || "";
  const idx = name.lastIndexOf(".");
  if (idx <= 0 || idx === name.length - 1) return "";
  const ext = name.slice(idx + 1);
  return /^[a-z0-9]{1,8}$/i.test(ext) ? ext.toLowerCase() : "";
}

/** Novo caminho, sempre dentro da pasta da carteira duplicada. */
export function buildDuplicatedVoucherPath(
  userId: string,
  newTripId: string,
  sourcePath: string,
): string {
  const ext = extensionOf(sourcePath);
  return `${userId}/${newTripId}/${safeUuid()}${ext ? `.${ext}` : ""}`;
}

/** Registro de tudo que foi copiado, para limpeza compensatória em falhas. */
export interface AssetCopyTracker {
  copiedPaths: string[];
}

export function createAssetCopyTracker(): AssetCopyTracker {
  return { copiedPaths: [] };
}

/**
 * Copia um arquivo do storage para a nova carteira e devolve o novo caminho.
 * Valores que não são caminhos do bucket (URLs externas) são devolvidos sem
 * alteração — não há arquivo próprio para duplicar.
 */
export async function duplicateVoucherFile(
  client: StorageClientLike,
  sourceValue: string,
  userId: string,
  newTripId: string,
  tracker: AssetCopyTracker,
): Promise<string> {
  if (!isVoucherStoragePath(sourceValue)) return sourceValue;
  const target = buildDuplicatedVoucherPath(userId, newTripId, sourceValue);
  const bucket = client.storage.from(VOUCHER_BUCKET);

  const copyResult = await bucket.copy(sourceValue, target);
  if (!copyResult?.error) {
    tracker.copiedPaths.push(target);
    return target;
  }

  // Fallback quando `copy` não está disponível/permitido: baixa e reenvia.
  const { data, error } = await bucket.download(sourceValue);
  if (error || !data) throw new Error("Não foi possível copiar um dos anexos da carteira.");
  const uploaded = await bucket.upload(target, data, {
    contentType: (data as Blob).type || undefined,
    upsert: false,
  });
  if (uploaded?.error) throw new Error("Não foi possível copiar um dos anexos da carteira.");
  tracker.copiedPaths.push(target);
  return target;
}

/** Remove os arquivos já copiados (usado quando a duplicação falha no meio). */
export async function rollbackCopiedAssets(
  client: StorageClientLike,
  tracker: AssetCopyTracker,
): Promise<void> {
  if (tracker.copiedPaths.length === 0) return;
  try {
    await client.storage.from(VOUCHER_BUCKET).remove([...tracker.copiedPaths]);
  } catch {
    // Limpeza best-effort: o erro original é o que importa para o usuário.
  }
  tracker.copiedPaths = [];
}

export interface DuplicatedAttachment {
  url: string;
  name: string;
  [key: string]: unknown;
}

/** Duplica a lista de anexos preservando nome, metadados e ordem. */
export async function duplicateAttachmentList(
  client: StorageClientLike,
  attachments: unknown,
  userId: string,
  newTripId: string,
  tracker: AssetCopyTracker,
): Promise<DuplicatedAttachment[]> {
  if (!Array.isArray(attachments)) return [];
  const out: DuplicatedAttachment[] = [];
  for (const raw of attachments) {
    if (!raw || typeof raw !== "object") continue;
    const att = raw as DuplicatedAttachment;
    const url = typeof att.url === "string" ? att.url : "";
    if (!url) continue;
    const newUrl = await duplicateVoucherFile(client, url, userId, newTripId, tracker);
    out.push({ ...att, url: newUrl });
  }
  return out;
}

/** Duplica arrays de URLs (fotos/documentos), copiando só o que é do bucket. */
export async function duplicateUrlList(
  client: StorageClientLike,
  urls: unknown,
  userId: string,
  newTripId: string,
  tracker: AssetCopyTracker,
): Promise<string[] | null> {
  if (!Array.isArray(urls)) return null;
  const out: string[] = [];
  for (const value of urls) {
    if (typeof value !== "string" || !value) continue;
    out.push(await duplicateVoucherFile(client, value, userId, newTripId, tracker));
  }
  return out;
}
