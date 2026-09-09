/**
 * Helpers PUROS da importação da tela "Gerar Orçamento" > "Novo Orçamento".
 *
 * Cobre dois caminhos:
 * 1) Importar de outro orçamento (duplicação como base, sem tocar no original).
 * 2) Importar de roteiro com IA (serializa o roteiro em texto e reaproveita o
 *    pipeline `import-full-package`, sem integração paralela).
 *
 * Aqui NÃO há acesso a banco: apenas filtragem, montagem de payload e
 * normalização de itens, o que mantém tudo testável e barato.
 */
import type { ServiceType } from "@/types/quote";

/* ─────────── Busca ─────────── */

export interface QuoteSearchItem {
  id: string;
  user_id?: string | null;
  client_name?: string | null;
  destination?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string | null;
}

export interface ItinerarySearchItem {
  id: string;
  userId?: string | null;
  destination?: string | null;
  clientName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string | null;
}

export const IMPORT_SEARCH_LIMIT = 20;

function norm(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function matches(term: string, fields: unknown[]): boolean {
  if (!term) return true;
  const t = norm(term);
  return fields.some((f) => norm(f).includes(t));
}

/**
 * Filtra orçamentos por título/cliente/destino. A lista de entrada já vem do
 * `useQuotes` (RLS por agência), então nunca há dados de outra agência aqui.
 */
export function searchQuoteSources<T extends QuoteSearchItem>(
  list: T[],
  term: string,
  limit = IMPORT_SEARCH_LIMIT,
): T[] {
  return (list || [])
    .filter((q) => matches(term, [q.client_name, q.destination]))
    .slice(0, limit);
}

/** Mesma regra para roteiros (destino ou cliente). */
export function searchItinerarySources<T extends ItinerarySearchItem>(
  list: T[],
  term: string,
  limit = IMPORT_SEARCH_LIMIT,
): T[] {
  return (list || [])
    .filter((i) => matches(term, [i.destination, i.clientName]))
    .slice(0, limit);
}

/* ─────────── Duplicação de orçamento ─────────── */

/** Campos que NUNCA podem ser copiados do orçamento de origem. */
export const IMPORT_FORBIDDEN_QUOTE_FIELDS = [
  "id",
  "share_token",
  "public_access_code",
  "status",
  "created_at",
  "updated_at",
  "opportunity_id",
  "quote_id",
  "user_id",
  "booking_deadline",
] as const;

export interface QuoteImportOverrides {
  client_id: string | null;
  client_name: string;
  destination: string;
  start_date: string;
  end_date: string;
  adults_count: number;
  children_count: number;
  currency?: string | null;
  currency_mode?: string | null;
  exchange_rate?: number | null;
}

/**
 * Monta o payload do NOVO orçamento a partir da origem + dados revisados.
 * Copia apenas conteúdo reaproveitável; identificadores, token público,
 * status/auditoria e vínculos técnicos ficam de fora.
 */
export function buildQuoteDuplicatePayload(
  source: Record<string, any>,
  overrides: QuoteImportOverrides,
): Record<string, any> {
  const s = source || {};
  const payload: Record<string, any> = {
    client_id: overrides.client_id || null,
    client_name: overrides.client_name,
    destination: overrides.destination,
    start_date: overrides.start_date,
    end_date: overrides.end_date,
    adults_count: overrides.adults_count,
    children_count: overrides.children_count,
    status: "draft",
    // Conteúdo reaproveitado
    total_amount: s.total_amount ?? 0,
    pricing_mode: s.pricing_mode ?? "sum",
    package_total_amount: s.package_total_amount ?? null,
    show_detailed_prices: s.show_detailed_prices ?? true,
    hide_investment_total: s.hide_investment_total ?? false,
    payment_terms: s.payment_terms ?? null,
    valid_until: s.valid_until ?? null,
    validity_disclaimer: s.validity_disclaimer ?? null,
    use_service_payment: s.use_service_payment ?? false,
    payment_display_mode: s.payment_display_mode ?? "full_payment",
    installments_count: s.installments_count ?? null,
    entry_percentage: s.entry_percentage ?? null,
    full_payment_discount_percent: s.full_payment_discount_percent ?? null,
    payment_method_label: s.payment_method_label ?? null,
    currency: overrides.currency ?? s.currency ?? "BRL",
    currency_mode: overrides.currency_mode ?? s.currency_mode ?? "fixed",
    exchange_rate: overrides.exchange_rate ?? s.exchange_rate ?? null,
    show_destination_intro: s.show_destination_intro ?? true,
    destination_intro_text: s.destination_intro_text ?? null,
    // Reutiliza as MESMAS referências de imagem: nada é baixado/reenviado.
    destination_intro_images: Array.isArray(s.destination_intro_images)
      ? [...s.destination_intro_images]
      : [],
    investment_summary_layout: s.investment_summary_layout ?? "grouped",
  };
  for (const forbidden of IMPORT_FORBIDDEN_QUOTE_FIELDS) {
    if (forbidden === "status") continue;
    delete payload[forbidden];
  }
  return payload;
}

/* ─────────── Roteiro → texto para a IA ─────────── */

const PERIOD_LABELS: Record<string, string> = {
  madrugada: "Madrugada",
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
};

export interface ItineraryLikeActivity {
  period?: string | null;
  title?: string | null;
  description?: string | null;
  location?: string | null;
  estimatedDuration?: string | null;
  estimatedCost?: string | null;
}

export interface ItineraryLikeDay {
  dayNumber?: number;
  date?: string | null;
  activities?: ItineraryLikeActivity[];
}

export interface ItineraryLike {
  destination?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  travelersCount?: number | null;
  days?: ItineraryLikeDay[];
}

/** Quantidade mínima de atividades com título para valer uma chamada de IA. */
export const MIN_ITINERARY_ACTIVITIES = 1;

export function countItineraryActivities(itinerary: ItineraryLike | null | undefined): number {
  return (itinerary?.days || []).reduce(
    (sum, d) => sum + (d.activities || []).filter((a) => String(a.title || "").trim()).length,
    0,
  );
}

export function hasEnoughItineraryContent(itinerary: ItineraryLike | null | undefined): boolean {
  return countItineraryActivities(itinerary) >= MIN_ITINERARY_ACTIVITIES;
}

/**
 * Serializa o roteiro em texto simples para o pipeline de importação por IA.
 * Não inclui identificadores nem links, apenas conteúdo descritivo.
 */
export function itineraryToImportText(itinerary: ItineraryLike): string {
  const lines: string[] = [];
  lines.push("ROTEIRO DE VIAGEM");
  if (itinerary.destination) lines.push(`Destino: ${itinerary.destination}`);
  if (itinerary.startDate || itinerary.endDate) {
    lines.push(`Período: ${itinerary.startDate ?? "?"} a ${itinerary.endDate ?? "?"}`);
  }
  if (itinerary.travelersCount) lines.push(`Viajantes: ${itinerary.travelersCount}`);
  lines.push("");

  for (const day of itinerary.days || []) {
    const activities = (day.activities || []).filter((a) => String(a.title || "").trim());
    if (!activities.length) continue;
    lines.push(`--- Dia ${day.dayNumber ?? "?"}${day.date ? ` (${day.date})` : ""} ---`);
    for (const a of activities) {
      const period = a.period ? PERIOD_LABELS[a.period] ?? a.period : null;
      const parts = [period, a.title].filter(Boolean).join(" — ");
      lines.push(`• ${parts}`);
      if (a.location) lines.push(`  Local: ${a.location}`);
      if (a.estimatedDuration) lines.push(`  Duração: ${a.estimatedDuration}`);
      if (a.estimatedCost) lines.push(`  Custo estimado: ${a.estimatedCost}`);
      if (a.description) lines.push(`  ${a.description}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

/* ─────────── Itens sugeridos pela IA ─────────── */

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  flight: "Passagem aérea",
  hotel: "Hospedagem",
  car_rental: "Locação",
  transfer: "Traslado/Transfer",
  attraction: "Passeio/Atividade/Ingresso",
  insurance: "Seguro",
  cruise: "Cruzeiro",
  circuit: "Circuito",
  rail_transport: "Trem",
  other: "Outros",
};

const VALID_SERVICE_TYPES = Object.keys(SERVICE_TYPE_LABELS) as ServiceType[];

export interface ImportedItemDraft {
  id: string;
  service_type: ServiceType;
  title: string;
  description: string | null;
  amount: number;
  service_data: Record<string, any>;
  confidence?: number;
}

export interface AiBlockLike {
  id?: string;
  type?: string;
  label?: string;
  confidence?: number;
  data?: Record<string, any> | null;
}

function toAmount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Normaliza os blocos da IA em itens revisáveis. Tipos desconhecidos caem em
 * `other`, e itens sem título nenhum são descartados.
 */
export function normalizeImportedItems(blocks: AiBlockLike[] | null | undefined): ImportedItemDraft[] {
  return (blocks || [])
    .map((b, index) => {
      const data = (b?.data && typeof b.data === "object" ? b.data : {}) as Record<string, any>;
      const type = VALID_SERVICE_TYPES.includes(b?.type as ServiceType)
        ? (b!.type as ServiceType)
        : "other";
      const title = String(
        b?.label || data.title || data.name || data.hotel_name || data.description || "",
      ).trim();
      if (!title) return null;
      return {
        id: String(b?.id || `item-${index}`),
        service_type: type,
        title,
        description: data.description ? String(data.description) : null,
        amount: toAmount(data.amount ?? data.total_price ?? data.price ?? data.total_amount),
        service_data: data,
        confidence: typeof b?.confidence === "number" ? b.confidence : undefined,
      } as ImportedItemDraft;
    })
    .filter((v): v is ImportedItemDraft => !!v);
}

/** Converte o item aprovado em linha de `quote_services`. */
export function importedItemToServiceRow(
  item: ImportedItemDraft,
  quoteId: string,
  orderIndex: number,
): Record<string, any> {
  const data = { ...(item.service_data || {}) };
  if (!data.title) data.title = item.title;
  if (item.description && !data.description) data.description = item.description;
  return {
    quote_id: quoteId,
    service_type: item.service_type,
    service_data: data,
    amount: item.amount || 0,
    order_index: orderIndex,
    description: item.description,
    image_urls: [],
  };
}
