/**
 * Domain used for the new itinerary (roteiro) link format.
 * Old links via /roteiro/:token continue working.
 */
export const ROTEIRO_DOMAIN = "https://seuroteiro.tur.br";

/**
 * Builds the new-format itinerary link.
 */
export function buildRoteiroLink(agencyName: string, publicAccessCode: string): string {
  const slug = agencyNameToSlug(agencyName);
  return `${ROTEIRO_DOMAIN}/${slug}/${publicAccessCode}`;
}

/**
 * Generates a URL-friendly slug from an agency name.
 */
function agencyNameToSlug(agencyName: string): string {
  return agencyName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ============================================================
// Roteiro V2 na Carteira Digital — helpers de vínculo/clone
// ============================================================
import { supabase } from "@/integrations/supabase/client";

export type TripItineraryMode = "none" | "legacy" | "v2";

/**
 * Clona um roteiro existente em uma nova cópia editável e vincula
 * à carteira (trip) informada. Atômico — RPC SECURITY DEFINER.
 * Retorna o id do novo itinerário.
 */
export async function cloneItineraryForTrip(
  sourceItineraryId: string,
  tripId: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("clone_itinerary_for_trip", {
    p_source_itinerary_id: sourceItineraryId,
    p_trip_id: tripId,
  });
  if (error) throw error;
  return data as string;
}

/**
 * Vincula um itinerário já existente (do próprio agente) à carteira,
 * sem clonar. Usado quando criamos um roteiro "do zero" diretamente
 * para esta carteira.
 */
export async function attachItineraryToTrip(
  tripId: string,
  itineraryId: string,
): Promise<void> {
  const { error } = await supabase
    .from("trips")
    .update({ itinerary_id: itineraryId, itinerary_mode: "v2" })
    .eq("id", tripId);
  if (error) throw error;
}

/**
 * Desvincula o roteiro V2 da carteira. Não apaga o itinerário.
 * Se houver dados legados em trip_itinerary_activities, volta para
 * 'legacy'; caso contrário, 'none'.
 */
export async function detachItineraryFromTrip(tripId: string): Promise<void> {
  const { count } = await supabase
    .from("trip_itinerary_activities")
    .select("id", { count: "exact", head: true })
    .eq("trip_id", tripId);

  const nextMode: TripItineraryMode = (count ?? 0) > 0 ? "legacy" : "none";

  const { error } = await supabase
    .from("trips")
    .update({ itinerary_id: null, itinerary_mode: nextMode })
    .eq("id", tripId);
  if (error) throw error;
}
