/**
 * Metadados básicos de hotel (modo econômico).
 *
 * Usa o modo `metadata_only` de `places-autocomplete`: uma única consulta de
 * detalhes, SEM pedir `photos` e sem resolver URLs de imagem. A galeria de
 * fotos continua exclusivamente sob demanda (`hotel-photos`).
 */
import { supabase } from "@/integrations/supabase/client";

export interface PlaceMetadata {
  place_id?: string | null;
  name?: string | null;
  address?: string | null;
  raw_data?: Record<string, unknown> | null;
}

/** Extrai a breve descrição (editorial_summary.overview) do payload/cache. */
export function extractPlaceDescription(place: PlaceMetadata | null | undefined): string {
  if (!place) return "";
  const raw = (place.raw_data || {}) as Record<string, unknown>;
  const candidate = raw["editorial_summary"];
  if (typeof candidate === "string") return candidate.trim();
  if (candidate && typeof candidate === "object") {
    const overview = (candidate as { overview?: unknown }).overview;
    if (typeof overview === "string") return overview.trim();
  }
  return "";
}

/** Busca metadados do lugar. Falhas são silenciosas (retorna null). */
export async function fetchPlaceMetadata(placeId: string): Promise<PlaceMetadata | null> {
  if (!placeId) return null;
  try {
    const { data, error } = await supabase.functions.invoke("places-autocomplete", {
      body: { metadata_only: true, place_id: placeId, place_type: "hotel" },
    });
    if (error) return null;
    return (data?.place as PlaceMetadata) ?? null;
  } catch {
    return null;
  }
}
