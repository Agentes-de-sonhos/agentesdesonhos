import { isGoogleImageRef, parseGplaceRef } from "@/lib/serviceImages";

/**
 * Regras da galeria de fotos exclusiva do serviço HOSPEDAGEM (orçamentos).
 *
 * Os demais serviços permanecem no limite histórico de 5 fotos
 * (`MAX_IMAGES_PER_SERVICE` em ServiceForms). Aqui o total combinado
 * (Google + URL manual + upload local) é 5.
 */
export const MAX_HOTEL_GALLERY_IMAGES = 5;

export const HOTEL_GALLERY_TITLE = "Galeria de fotos";
export const HOTEL_GALLERY_SUGGESTIONS_TITLE = "Sugestões do Google";
export const HOTEL_GALLERY_LIMIT_MESSAGE =
  "Limite de 5 fotos atingido. Remova uma foto para adicionar outra.";
export const HOTEL_GALLERY_URL_PLACEHOLDER = "Cole aqui o link direto da imagem";

export type HotelGalleryOrigin = "google" | "upload" | "url";

/** Contador exato exibido nos dois modos (visualizar/editar). */
export function galleryCounterLabel(count: number): string {
  return `${count} de ${MAX_HOTEL_GALLERY_IMAGES} fotos selecionadas`;
}

/**
 * Normaliza uma referência para comparação de duplicados. Referências
 * `gplace://` são estáveis; URLs http(s) são normalizadas (host minúsculo,
 * barra final removida) sem perder query string relevante.
 */
export function normalizeImageRef(ref: string): string {
  const raw = (ref || "").trim();
  if (!raw) return "";
  if (parseGplaceRef(raw)) return raw;
  try {
    const u = new URL(raw);
    u.hostname = u.hostname.toLowerCase();
    u.hash = "";
    const path = u.pathname.replace(/\/+$/, "");
    return `${u.protocol}//${u.host}${path}${u.search}`;
  } catch {
    return raw;
  }
}

export function isSameImageRef(a: string, b: string): boolean {
  return normalizeImageRef(a) === normalizeImageRef(b);
}

export function containsImageRef(list: string[], ref: string): boolean {
  return (list || []).some((r) => isSameImageRef(r, ref));
}

/** Remove vazios e duplicados preservando a ordem original. */
export function dedupeImageRefs(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const ref of list || []) {
    const key = normalizeImageRef(ref);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(ref.trim());
  }
  return out;
}

export interface AddImageResult {
  ok: boolean;
  urls: string[];
  /** Motivo da recusa quando `ok` é falso. */
  error?: string;
}

/**
 * Adiciona uma referência ao rascunho respeitando limite e duplicidade.
 * Nunca trunca silenciosamente: devolve erro explícito.
 */
export function addImageRef(list: string[], ref: string): AddImageResult {
  const current = dedupeImageRefs(list);
  const candidate = (ref || "").trim();
  if (!candidate) return { ok: false, urls: current, error: "Informe um link de imagem." };
  if (containsImageRef(current, candidate)) {
    return { ok: false, urls: current, error: "Esta foto já está na galeria." };
  }
  if (current.length >= MAX_HOTEL_GALLERY_IMAGES) {
    return { ok: false, urls: current, error: HOTEL_GALLERY_LIMIT_MESSAGE };
  }
  return { ok: true, urls: [...current, candidate] };
}

export function removeImageRef(list: string[], ref: string): string[] {
  return dedupeImageRefs(list).filter((r) => !isSameImageRef(r, ref));
}

/**
 * Prefixo do nome de arquivo usado pela Edge Function `import-quote-image`
 * (`url-<sha256>.<ext>`): torna a origem "URL" reconhecível de forma
 * persistente, mesmo depois de salvar e reabrir o orçamento.
 */
export const URL_IMPORT_FILE_PREFIX = "url-";

/** Origem discreta exibida na miniatura, quando identificável. */
export function imageRefOrigin(ref: string): HotelGalleryOrigin {
  if (isGoogleImageRef(ref)) return "google";
  const bucketMatch = /\/storage\/v1\/object\/public\/quote-images\/(.+)$/i.exec((ref || "").trim());
  if (bucketMatch) {
    const fileName = decodeURIComponent(bucketMatch[1].split("?")[0]).split("/").pop() || "";
    return fileName.startsWith(URL_IMPORT_FILE_PREFIX) ? "url" : "upload";
  }
  return "url";
}

/** Compara duas listas de referências (ordem + conteúdo normalizados). */
export function isSameImageRefList(a: string[], b: string[]): boolean {
  const x = dedupeImageRefs(a || []).map(normalizeImageRef);
  const y = dedupeImageRefs(b || []).map(normalizeImageRef);
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

/** Há referências salvas que pertencem a outro hotel (inconsistência). */
export function hasStaleGoogleRefs(list: string[], placeId?: string | null): boolean {
  return (list || []).some((r) => isStaleGoogleRef(r, placeId));
}

export const ORIGIN_LABEL: Record<HotelGalleryOrigin, string> = {
  google: "Google",
  upload: "Upload",
  url: "URL",
};

/** Aceita somente http/https com host válido. */
export function isValidHttpImageUrl(value: string): boolean {
  try {
    const u = new URL((value || "").trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return !!u.hostname && u.hostname.includes(".");
  } catch {
    return false;
  }
}

/**
 * Referências Google de um place_id diferente do hotel atual: ao trocar de
 * hotel elas não podem ser resolvidas nem misturadas com as novas sugestões.
 */
export function isStaleGoogleRef(ref: string, placeId?: string | null): boolean {
  const parsed = parseGplaceRef(ref);
  if (!parsed) return false;
  return !!placeId && parsed.placeId !== placeId;
}

export function dropStaleGoogleRefs(list: string[], placeId?: string | null): string[] {
  return dedupeImageRefs(list).filter((r) => !isStaleGoogleRef(r, placeId));
}
