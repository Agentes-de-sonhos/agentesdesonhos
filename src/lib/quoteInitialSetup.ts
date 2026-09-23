/**
 * Configuração inicial guiada do orçamento.
 *
 * Só o que ainda está incompleto é destacado — título, capa/fotos e descrição
 * do destino. Cliente, destino, datas e passageiros já preenchidos nunca são
 * destacados. O realce usa o azul da interface, suave, para chamar atenção sem
 * parecer erro.
 */

export type InitialSetupItemKey = "title" | "cover" | "intro";

export interface InitialSetupItem {
  key: InitialSetupItemKey;
  label: string;
  hint: string;
}

/** Realce azul suave (não é estado de erro). */
export const INITIAL_SETUP_HIGHLIGHT_CLASS =
  "ring-2 ring-sky-400/60 bg-sky-50/60 shadow-[0_0_0_4px_rgba(56,189,248,0.10)] rounded-lg transition-shadow";

const ITEM_HINTS: Record<InitialSetupItemKey, { label: string; hint: string }> = {
  title: { label: "Título do orçamento", hint: "Adicione um título" },
  cover: { label: "Foto de capa", hint: "Escolha uma foto de capa" },
  intro: { label: "Descrição do destino", hint: "Gere ou escreva a descrição do destino" },
};

export interface QuoteInitialSetupInput {
  trip_title?: string | null;
  destination_intro_text?: string | null;
  destination_intro_images?: string[] | null;
  show_destination_intro?: boolean | null;
}

/** Itens da configuração inicial que ainda faltam. */
export function pendingInitialSetup(quote: QuoteInitialSetupInput | null | undefined): InitialSetupItem[] {
  const pending: InitialSetupItem[] = [];
  if (!quote) return pending;
  const title = (quote.trip_title || "").trim();
  if (!title) pending.push({ key: "title", ...ITEM_HINTS.title });

  // A capa e a descrição só são cobradas quando a apresentação está ativa.
  if (quote.show_destination_intro !== false) {
    const images = Array.isArray(quote.destination_intro_images) ? quote.destination_intro_images : [];
    if (images.length === 0) pending.push({ key: "cover", ...ITEM_HINTS.cover });
    if (!(quote.destination_intro_text || "").trim()) pending.push({ key: "intro", ...ITEM_HINTS.intro });
  }
  return pending;
}

export function isInitialSetupItemPending(
  quote: QuoteInitialSetupInput | null | undefined,
  key: InitialSetupItemKey,
): boolean {
  return pendingInitialSetup(quote).some((item) => item.key === key);
}

/**
 * Sugestão de título montada a partir dos dados já existentes do orçamento.
 * É apenas uma sugestão de um clique — nunca é aplicada automaticamente.
 */
export function suggestQuoteTitle(quote: {
  destination?: string | null;
  adults_count?: number | null;
  children_count?: number | null;
  start_date?: string | null;
  end_date?: string | null;
}): string | null {
  const destination = (quote?.destination || "").trim();
  if (!destination) return null;
  const parts: string[] = [`Viagem para ${destination}`];

  const days = (() => {
    if (!quote?.start_date || !quote?.end_date) return null;
    const parse = (v: string) => {
      const [y, m, d] = v.slice(0, 10).split("-").map(Number);
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d);
    };
    const a = parse(quote.start_date);
    const b = parse(quote.end_date);
    if (!a || !b) return null;
    const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
    return diff > 0 ? diff : null;
  })();
  if (days) parts.push(`${days} dias`);

  const adults = quote?.adults_count || 0;
  const children = quote?.children_count || 0;
  const pax: string[] = [];
  if (adults > 0) pax.push(`${adults} ${adults === 1 ? "adulto" : "adultos"}`);
  if (children > 0) pax.push(`${children} ${children === 1 ? "criança" : "crianças"}`);
  if (pax.length) parts.push(pax.join(" e "));

  return parts.join(" · ");
}

/**
 * Uma sugestão automática de descrição por criação de orçamento: evita chamadas
 * repetidas à IA em rerenders. O retry continua disponível pelo botão.
 */
const autoSuggested = new Set<string>();

export function shouldAutoSuggestIntro(quoteId: string, hasText: boolean): boolean {
  if (!quoteId || hasText) return false;
  if (autoSuggested.has(quoteId)) return false;
  autoSuggested.add(quoteId);
  return true;
}

export function resetAutoSuggestIntro(quoteId?: string): void {
  if (quoteId) autoSuggested.delete(quoteId);
  else autoSuggested.clear();
}
