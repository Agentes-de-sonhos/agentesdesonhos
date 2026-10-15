import { supabase } from "@/integrations/supabase/client";

/**
 * Biblioteca de imagens da agência — URLs externas compartilhadas pelos
 * membros da mesma agência (isolamento por agência dona no servidor).
 * Nada é baixado: só a URL e metadados são guardados.
 */

export interface LibraryImage {
  id: string;
  url: string;
  name: string;
  folder_id: string | null;
  source: "manual" | "service_link";
  created_at: string;
}
export interface LibraryFolder { id: string; name: string }

const SENSITIVE_PATTERNS = [
  /\/storage\/v1\/object\/sign\//i,
  /[?&](x-amz-signature|x-amz-credential|signature|sig|token|access_token|expires|se|sp)=/i,
  /maps\.googleapis\.com/i,
  /places\.googleapis\.com/i,
  /lh\d?\.googleusercontent\.com\/p\//i,
  /^https?:\/\/(localhost|127\.|10\.|192\.168\.|169\.254\.)/i,
];

/** Trim apenas — nunca altera case de path/query nem remove parâmetros. */
export function normalizeLibraryUrl(raw: string): string | null {
  const v = (raw || "").trim();
  if (!v || v.length > 2048 || /\s/.test(v)) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".")) return null;
  } catch {
    return null;
  }
  return v;
}

/** URL aceita na biblioteca: http(s), sem URL assinada/temporária/Google Places. */
export function isLibraryEligibleUrl(raw: string): boolean {
  const v = normalizeLibraryUrl(raw);
  if (!v) return false;
  return !SENSITIVE_PATTERNS.some((re) => re.test(v));
}

export function defaultNameFromUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    const last = decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() || "");
    const base = last.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[-_]+/g, " ").trim();
    const name = base && base.length >= 3 ? base : u.hostname.replace(/^www\./, "");
    return name.slice(0, 120);
  } catch {
    return "Imagem";
  }
}

/* ───────── Origem "link" (proveniência em memória) ───────── */

/** URL guardada no serviço → URL externa original colada pelo usuário (só em memória). */
const linkProvenance = new Map<string, string>();

export function noteLinkImage(storedUrl: string, sourceUrl: string) {
  if (!storedUrl || !isLibraryEligibleUrl(sourceUrl)) return;
  linkProvenance.set(storedUrl, sourceUrl.trim());
}

/* ───────── Fila de nova tentativa persistida (por agência + usuário) ───────── */

const RETRY_PREFIX = "ads:image-library-retry:v1:";
const AGENCY_CACHE_PREFIX = "ads:image-library-agency:v1:";
const MAX_RETRY_ITEMS = 50;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface LibraryScope { agencyId: string; userId: string }
interface RetryItem { url: string; name: string }

function safeStorage(): Storage | null {
  try { return typeof window !== "undefined" ? window.localStorage : null; } catch { return null; }
}

export function retryStorageKey(scope: LibraryScope) {
  return `${RETRY_PREFIX}${scope.agencyId}:${scope.userId}`;
}

/** Agência + usuário atuais. Usa a agência resolvida pelo servidor; cache só do mesmo usuário. */
export async function resolveLibraryScope(): Promise<LibraryScope | null> {
  const { data: sess } = await supabase.auth.getSession();
  const userId = sess?.session?.user?.id;
  if (!userId || !UUID_RE.test(userId)) return null;
  const store = safeStorage();
  try {
    const { data, error } = await supabase.rpc("current_image_library_agency" as any);
    if (!error && typeof data === "string" && UUID_RE.test(data)) {
      store?.setItem(AGENCY_CACHE_PREFIX + userId, data);
      return { agencyId: data, userId };
    }
  } catch { /* offline: usa cache do mesmo usuário */ }
  const cached = store?.getItem(AGENCY_CACHE_PREFIX + userId);
  return cached && UUID_RE.test(cached) ? { agencyId: cached, userId } : null;
}

/** Lê com validação: itens inválidos/sensíveis são descartados silenciosamente. */
export function readRetryQueue(scope: LibraryScope): RetryItem[] {
  const store = safeStorage();
  if (!store) return [];
  try {
    const parsed = JSON.parse(store.getItem(retryStorageKey(scope)) || "[]");
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const out: RetryItem[] = [];
    for (const it of parsed) {
      const url = typeof it?.url === "string" ? normalizeLibraryUrl(it.url) : null;
      if (!url || !isLibraryEligibleUrl(url) || seen.has(url)) continue;
      seen.add(url);
      const name = typeof it?.name === "string" && it.name.trim() ? it.name.trim().slice(0, 120) : defaultNameFromUrl(url);
      out.push({ url, name });
    }
    return out.slice(0, MAX_RETRY_ITEMS);
  } catch {
    return [];
  }
}

function writeRetryQueue(scope: LibraryScope, items: RetryItem[]) {
  const store = safeStorage();
  if (!store) return;
  try {
    if (items.length === 0) store.removeItem(retryStorageKey(scope));
    else store.setItem(retryStorageKey(scope), JSON.stringify(items.slice(0, MAX_RETRY_ITEMS)));
  } catch { /* armazenamento cheio/bloqueado: mantém só a tentativa atual */ }
}

export async function getPendingLibraryRetries(): Promise<number> {
  const scope = await resolveLibraryScope();
  return scope ? readRetryQueue(scope).length : 0;
}

async function upsertMany(rows: Array<{ url: string; name: string; source: LibraryImage["source"] }>) {
  if (rows.length === 0) return;
  const { error } = await supabase
    .from("agency_image_library")
    .upsert(rows as any, { onConflict: "agency_id,url", ignoreDuplicates: true });
  if (error) throw error;
}

/**
 * Chamado SOMENTE depois que o serviço foi salvo com sucesso.
 * Registra apenas as fotos com origem link que continuam no serviço.
 * Nunca lança: falha vira pendência persistida (agência + usuário).
 * Upsert idempotente: URL já existente conta como registrada.
 */
export async function registerLinkImagesAfterSave(finalUrls: string[] | undefined | null): Promise<{ registered: number; failed: number }> {
  const stored = (finalUrls || []).filter((u) => linkProvenance.has(u));
  const sources = Array.from(new Set(stored.map((u) => linkProvenance.get(u)!).filter(isLibraryEligibleUrl)));
  stored.forEach((u) => linkProvenance.delete(u));
  if (sources.length === 0) return { registered: 0, failed: 0 };
  const rows = sources.map((url) => ({ url, name: defaultNameFromUrl(url), source: "service_link" as const }));
  try {
    await upsertMany(rows);
    return { registered: rows.length, failed: 0 };
  } catch {
    const scope = await resolveLibraryScope().catch(() => null);
    if (scope) {
      const merged = [...readRetryQueue(scope)];
      for (const r of rows) if (!merged.some((m) => m.url === r.url)) merged.push({ url: r.url, name: r.name });
      writeRetryQueue(scope, merged);
    }
    return { registered: 0, failed: rows.length };
  }
}

/** Reenvia só a fila da agência + usuário atuais; remove ao confirmar. */
export async function retryPendingLibraryRegistrations(): Promise<boolean> {
  const scope = await resolveLibraryScope();
  if (!scope) return false;
  const items = readRetryQueue(scope);
  if (items.length === 0) { writeRetryQueue(scope, []); return true; }
  try {
    await upsertMany(items.map((i) => ({ ...i, source: "service_link" as const })));
    writeRetryQueue(scope, []);
    return true;
  } catch {
    writeRetryQueue(scope, items);
    return false;
  }
}

/** Testes */
export function __resetLibraryProvenance() {
  linkProvenance.clear();
}

/* ───────── CRUD ───────── */

export async function listLibraryImages(): Promise<LibraryImage[]> {
  const { data, error } = await supabase
    .from("agency_image_library")
    .select("id,url,name,folder_id,source,created_at")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw error;
  return (data || []) as LibraryImage[];
}

export async function listLibraryFolders(): Promise<LibraryFolder[]> {
  const { data, error } = await supabase.from("agency_image_folders").select("id,name").order("name");
  if (error) throw error;
  return (data || []) as LibraryFolder[];
}

export async function addLibraryImage(url: string, name: string, folderId: string | null) {
  const v = normalizeLibraryUrl(url);
  if (!v || !isLibraryEligibleUrl(v)) throw new Error("Link inválido. Use um link http(s) público e permanente de imagem.");
  const { error } = await supabase
    .from("agency_image_library")
    .insert({ url: v, name: name.trim() || defaultNameFromUrl(v), folder_id: folderId, source: "manual" } as any);
  if (error) {
    if ((error as any).code === "23505") throw new Error("Esta imagem já está na biblioteca.");
    throw new Error("Não foi possível adicionar a imagem.");
  }
}

export async function updateLibraryImage(id: string, patch: Partial<Pick<LibraryImage, "name" | "url" | "folder_id">>) {
  if (patch.url !== undefined) {
    const v = normalizeLibraryUrl(patch.url);
    if (!v || !isLibraryEligibleUrl(v)) throw new Error("Link inválido. Use um link http(s) público e permanente de imagem.");
    patch = { ...patch, url: v };
  }
  const { error } = await supabase.from("agency_image_library").update(patch as any).eq("id", id);
  if (error) {
    if ((error as any).code === "23505") throw new Error("Já existe uma imagem com este link.");
    throw new Error("Não foi possível salvar a alteração.");
  }
}

/** Remove só o registro da biblioteca; serviços salvos mantêm suas URLs. */
export async function deleteLibraryImage(id: string) {
  const { error } = await supabase.from("agency_image_library").delete().eq("id", id);
  if (error) throw new Error("Não foi possível excluir a imagem.");
}

export async function createLibraryFolder(name: string) {
  const { error } = await supabase.from("agency_image_folders").insert({ name: name.trim() } as any);
  if (error) throw new Error((error as any).code === "23505" ? "Já existe uma pasta com esse nome." : "Não foi possível criar a pasta.");
}

export async function renameLibraryFolder(id: string, name: string) {
  const { error } = await supabase.from("agency_image_folders").update({ name: name.trim() }).eq("id", id);
  if (error) throw new Error((error as any).code === "23505" ? "Já existe uma pasta com esse nome." : "Não foi possível renomear a pasta.");
}

/** Imagens da pasta vão para "Sem pasta" (FK ON DELETE SET NULL). */
export async function deleteLibraryFolder(id: string) {
  const { error } = await supabase.from("agency_image_folders").delete().eq("id", id);
  if (error) throw new Error("Não foi possível excluir a pasta.");
}

export function filterLibraryImages(images: LibraryImage[], search: string, folder: string | "all" | "none") {
  const q = search.trim().toLowerCase();
  return images.filter((img) => {
    if (folder === "none" && img.folder_id) return false;
    if (folder !== "all" && folder !== "none" && img.folder_id !== folder) return false;
    return !q || img.name.toLowerCase().includes(q);
  });
}
