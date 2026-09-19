/**
 * Sugestões de IA para Ingressos/Atrações em Orçamentos.
 *
 * Reaproveita o padrão já usado em "Outros Serviços": chamada a uma Edge
 * Function, cache em memória por termo normalizado e falha silenciosa (nunca
 * bloqueia o preenchimento manual do formulário).
 *
 * Nada aqui é catálogo oficial nem disponibilidade em tempo real.
 */
import { supabase } from "@/integrations/supabase/client";

export const AI_SUGGESTION_NOTICE =
  "Sugestão gerada por IA — confirme as condições com o fornecedor.";

export const MIN_PRODUCT_QUERY = 3;
export const MAX_PRODUCT_SUGGESTIONS = 6;
export const MAX_TICKET_TYPE_SUGGESTIONS = 8;
/** Limite de fotos sugeridas/selecionáveis — igual ao restante do orçamento. */
export const MAX_ATTRACTION_PHOTOS = 5;

export interface ProductSuggestion {
  name: string;
  location?: string;
}

export interface TicketTypeSuggestion {
  label: string;
}

const norm = (v?: string | null) =>
  String(v || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const cache = new Map<string, unknown>();

async function callAI<T>(key: string, body: Record<string, unknown>, fallback: T): Promise<T> {
  if (cache.has(key)) return cache.get(key) as T;
  try {
    const { data, error } = await supabase.functions.invoke("attraction-ai-suggestions", { body });
    if (error || !data || (data as any).error) return fallback;
    cache.set(key, data as T);
    return data as T;
  } catch {
    return fallback;
  }
}

export async function fetchProductSuggestions(
  query: string,
  destination?: string | null,
): Promise<ProductSuggestion[]> {
  const q = String(query || "").trim();
  if (q.length < MIN_PRODUCT_QUERY) return [];
  const data = await callAI<{ products?: ProductSuggestion[] }>(
    `products|${norm(q)}|${norm(destination)}`,
    { mode: "products", query: q, destination: destination || undefined },
    {},
  );
  return (data.products ?? []).slice(0, MAX_PRODUCT_SUGGESTIONS);
}

export async function fetchTicketTypeSuggestions(
  product: string,
  destination?: string | null,
): Promise<TicketTypeSuggestion[]> {
  const p = String(product || "").trim();
  if (p.length < 2) return [];
  const data = await callAI<{ ticket_types?: TicketTypeSuggestion[] }>(
    `types|${norm(p)}|${norm(destination)}`,
    { mode: "ticket_types", product: p, destination: destination || undefined },
    {},
  );
  return (data.ticket_types ?? []).slice(0, MAX_TICKET_TYPE_SUGGESTIONS);
}

export async function fetchTicketDescription(
  product: string,
  ticketType: string,
  destination?: string | null,
): Promise<string> {
  const p = String(product || "").trim();
  const t = String(ticketType || "").trim();
  if (p.length < 2 || t.length < 2) return "";
  const data = await callAI<{ text?: string }>(
    `desc|${norm(p)}|${norm(t)}|${norm(destination)}`,
    { mode: "description", product: p, ticket_type: t, destination: destination || undefined },
    {},
  );
  return (data.text ?? "").trim();
}
