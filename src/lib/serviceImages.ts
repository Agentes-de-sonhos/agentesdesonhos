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
// Chave: place_id + índice + tamanho, para nunca repetir uma chamada cobrada.
const placePhotoCache = new Map<string, Promise<PlacePhoto | null>>();

const DISPLAY_WIDTH = 1600;

/**
 * Resolve UMA foto persistida (`gplace://place/index`) com no máximo uma
 * chamada cobrada de Places Photo — nunca o lote inteiro do lugar.
 */
export function fetchPlacePhoto(
  placeId: string,
  index: number,
  size: number = DISPLAY_WIDTH,
): Promise<PlacePhoto | null> {
  const key = `${placeId}|${index}|${size}`;
  const cached = placePhotoCache.get(key);
  if (cached) return cached;
  const p = supabase.functions
    .invoke("hotel-photos", { body: { place_id: placeId, photo_index: index, size } })
    .then(({ data, error }) => {
      if (error) throw error;
      return (data?.photo ?? null) as PlacePhoto | null;
    })
    .catch((e) => {
      console.warn("[serviceImages] falha ao resolver foto do Google Places", placeId, index, e?.message || e);
      placePhotoCache.delete(key);
      return null;
    });
  placePhotoCache.set(key, p);
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

  let legacyCursor = 0;
  const out: ResolvedServiceImage[] = [];
  for (const ref of list) {
    const gp = parseGplaceRef(ref);
    if (gp) {
      const photo = await fetchPlacePhoto(gp.placeId, gp.index);
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
      const photo = placeId ? await fetchPlacePhoto(placeId, legacyCursor) : null;
      legacyCursor += 1;
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

/**
 * Deriva o place_id de um serviço de viagem/orçamento, considerando a coluna de
 * primeira classe e os campos legados dentro de `service_data`.
 */
export function resolveServicePlaceId(service: any): string | null {
  return (
    service?.place_id ??
    service?.service_data?.place_id ??
    service?.service_data?.google_place_id ??
    null
  );
}
