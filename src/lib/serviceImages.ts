import { supabase } from "@/integrations/supabase/client";

/**
 * Estabilidade de imagens de serviços (hospedagem, atrações, etc.)
 *
 * Problema histórico: fotos do Google Places eram persistidas como a URL final
 * resolvida (`lh3.googleusercontent.com/place-photos/...`). Essas URLs são
 * temporárias — a geração de tokens `AJRVUZ…` foi revogada pelo Google e passou
 * a responder 403, quebrando orçamentos publicados.
 *
 * Arquitetura atual:
 * - Imagens próprias/licenciadas → URL estável do Storage (persistida).
 * - Imagens do Google Places → persistimos APENAS uma referência estável
 *   `gplace://{place_id}/{index}` e resolvemos a foto em tempo de execução pela
 *   API oficial (Edge Function `hotel-photos`). Nada é copiado para o Storage.
 */

export const GPLACE_PREFIX = "gplace://";

export type ServiceImageOrigin = "uploaded" | "licensed_external" | "google_places" | "fallback";

export interface ResolvedServiceImage {
  /** URL utilizável em <img src>. `null` quando não foi possível resolver. */
  src: string | null;
  origin: ServiceImageOrigin;
  /** Valor persistido (URL do Storage ou referência gplace://). */
  ref: string;
  /** Atribuições obrigatórias retornadas pela API do Google. */
  attributions: string[];
}

export function makeGplaceRef(placeId: string, index: number): string {
  return `${GPLACE_PREFIX}${placeId}/${index}`;
}

export function parseGplaceRef(ref: string): { placeId: string; index: number } | null {
  if (!ref?.startsWith(GPLACE_PREFIX)) return null;
  const rest = ref.slice(GPLACE_PREFIX.length);
  const slash = rest.lastIndexOf("/");
  if (slash <= 0) return null;
  const placeId = rest.slice(0, slash);
  const index = Number(rest.slice(slash + 1));
  if (!placeId || !Number.isFinite(index) || index < 0) return null;
  return { placeId, index };
}

/** URLs temporárias do Google que nunca deveriam ter sido persistidas. */
export function isGooglePhotoUrl(url: string): boolean {
  return /googleusercontent\.com\/place-photos|maps\.googleapis\.com\/maps\/api\/place\/photo/i.test(url || "");
}

export function isGoogleImageRef(ref: string): boolean {
  return !!parseGplaceRef(ref) || isGooglePhotoUrl(ref);
}

export interface PlacePhoto {
  url: string;
  thumb_url: string;
  attributions?: string[];
}

// Cache apenas em memória (sessão), sem persistência — conforme termos do Google.
const placePhotoCache = new Map<string, Promise<PlacePhoto[]>>();

export function fetchPlacePhotos(placeId: string): Promise<PlacePhoto[]> {
  const cached = placePhotoCache.get(placeId);
  if (cached) return cached;
  const p = supabase.functions
    .invoke("hotel-photos", { body: { place_id: placeId } })
    .then(({ data, error }) => {
      if (error) throw error;
      return (data?.photos || []) as PlacePhoto[];
    })
    .catch((e) => {
      console.warn("[serviceImages] falha ao resolver fotos do Google Places", placeId, e?.message || e);
      placePhotoCache.delete(placeId);
      return [] as PlacePhoto[];
    });
  placePhotoCache.set(placeId, p);
  return p;
}

/**
 * Resolve uma lista persistida de imagens para URLs utilizáveis.
 * Referências `gplace://` e URLs legadas do Google são substituídas pelas fotos
 * atuais do lugar; imagens próprias são mantidas como estão.
 */
export async function resolveServiceImages(
  refs: string[],
  placeId?: string | null,
): Promise<ResolvedServiceImage[]> {
  const list = (refs || []).filter(Boolean);
  const needsGoogle = list.some((r) => isGoogleImageRef(r));
  let photos: PlacePhoto[] = [];
  if (needsGoogle && placeId) photos = await fetchPlacePhotos(placeId);

  let legacyCursor = 0;
  const out: ResolvedServiceImage[] = [];
  for (const ref of list) {
    const gp = parseGplaceRef(ref);
    if (gp) {
      const photos2 = gp.placeId === placeId ? photos : await fetchPlacePhotos(gp.placeId);
      const photo = photos2[gp.index];
      out.push({
        ref,
        origin: "google_places",
        src: photo?.url ?? null,
        attributions: photo?.attributions ?? [],
      });
      continue;
    }
    if (isGooglePhotoUrl(ref)) {
      // Legado: tenta re-resolver pela mesma posição; sem place_id, mantém a URL
      // antiga (o componente aplica fallback caso ela falhe).
      const photo = photos[legacyCursor++];
      out.push({
        ref,
        origin: "google_places",
        src: photo?.url ?? (placeId ? null : ref),
        attributions: photo?.attributions ?? [],
      });
      continue;
    }
    out.push({ ref, origin: "uploaded", src: ref, attributions: [] });
  }
  return out;
}
