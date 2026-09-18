/**
 * Sugestão de descrição comercial curta para um serviço vinculado a um lugar.
 *
 * Reaproveita os mecanismos já existentes da plataforma, na ordem:
 *  1. metadados reais do Google Places (`editorial_summary`), via `fetchPlaceMetadata`;
 *  2. IA já existente (`generate-destination-intro`), apenas com o nome/localidade
 *     reais do lugar selecionado.
 *
 * Nunca inventa endereço, nota, preço, duração ou característica: o texto é
 * sempre sugerido e editável pelo usuário. Falhas são silenciosas (retorna "").
 */
import { supabase } from "@/integrations/supabase/client";
import { extractPlaceDescription, fetchPlaceMetadata } from "@/lib/hotelMetadata";

export const MAX_SUGGESTED_DESCRIPTION = 600;

export interface SuggestServiceDescriptionInput {
  placeId: string;
  name: string;
  /** Texto secundário do Places ("Rua X, Cidade, País") ou destino do orçamento. */
  context?: string | null;
}

export function buildDescriptionPrompt(input: SuggestServiceDescriptionInput): string {
  const place = [input.name?.trim(), input.context?.trim()].filter(Boolean).join(", ");
  return place;
}

async function generateWithAI(prompt: string): Promise<string> {
  if (!prompt || prompt.length < 2) return "";
  try {
    const { data, error } = await supabase.functions.invoke("generate-destination-intro", {
      body: { destination: prompt },
    });
    if (error) return "";
    const text = typeof data?.text === "string" ? data.text.trim() : "";
    return text.slice(0, MAX_SUGGESTED_DESCRIPTION);
  } catch {
    return "";
  }
}

export async function suggestServiceDescription(
  input: SuggestServiceDescriptionInput,
): Promise<string> {
  if (!input?.placeId) return "";
  const place = await fetchPlaceMetadata(input.placeId);
  const fromPlaces = extractPlaceDescription(place);
  if (fromPlaces) return fromPlaces.slice(0, MAX_SUGGESTED_DESCRIPTION);
  return generateWithAI(buildDescriptionPrompt(input));
}
