/**
 * Regras compartilhadas da importação de orçamentos no CRM.
 *
 * Objetivo 1: criar oportunidade a partir de um orçamento existente.
 * Objetivo 2: importar os serviços de um orçamento para uma operação.
 *
 * Tudo aqui é puro (sem rede) para permitir teste direto. O isolamento por
 * agência/tenant continua sendo feito na consulta (RLS + user_id do titular).
 */
import { mapServiceDataToOperationService } from "@/lib/operationServiceMap";

export interface ImportableQuote {
  id: string;
  trip_title?: string | null;
  destination?: string | null;
  client_name?: string | null;
  client_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  adults_count?: number | null;
  children_count?: number | null;
  total_amount?: number | null;
  opportunity_id?: string | null;
  created_at?: string | null;
}

const normalize = (v: unknown) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/** Busca por título, destino ou cliente. Opera somente sobre a lista recebida. */
export function searchImportableQuotes<T extends ImportableQuote>(
  quotes: T[],
  term: string,
  limit = 30,
): T[] {
  const q = normalize(term);
  const list = !q
    ? quotes
    : quotes.filter((item) =>
        [item.trip_title, item.destination, item.client_name].some((field) =>
          normalize(field).includes(q),
        ),
      );
  return list.slice(0, limit);
}

export interface OpportunityDraftFromQuote {
  client_id: string;
  destination: string;
  start_date: string;
  end_date: string;
  adults_count: number;
  children_count: number;
  passengers_count: number;
  estimated_value: number;
  notes: string;
}

/** Pré-preenche a oportunidade com os campos disponíveis no orçamento. */
export function buildOpportunityDraftFromQuote(quote: ImportableQuote): OpportunityDraftFromQuote {
  const adults = Math.max(0, Number(quote.adults_count ?? 0) || 0);
  const children = Math.max(0, Number(quote.children_count ?? 0) || 0);
  const passengers = adults + children;
  return {
    client_id: quote.client_id || "",
    destination: (quote.destination || quote.trip_title || "").trim(),
    start_date: quote.start_date || "",
    end_date: quote.end_date || "",
    adults_count: adults || 1,
    children_count: children,
    passengers_count: passengers > 0 ? passengers : 1,
    estimated_value: Number(quote.total_amount ?? 0) || 0,
    notes: "",
  };
}

/** Campos obrigatórios ainda ausentes; a UI pede o preenchimento antes de criar. */
export function missingOpportunityFields(draft: OpportunityDraftFromQuote): string[] {
  const missing: string[] = [];
  if (!draft.client_id) missing.push("client_id");
  if (!draft.destination.trim()) missing.push("destination");
  return missing;
}

export function quoteLabel(quote: ImportableQuote): string {
  return (
    [quote.trip_title, quote.destination].find((v) => typeof v === "string" && v.trim()) ||
    "Orçamento"
  ).toString().trim();
}

export interface ImportableQuoteService {
  id: string;
  service_type?: string | null;
  service_data?: Record<string, any> | null;
  amount?: number | null;
  description?: string | null;
  order_index?: number | null;
}

/** Separa o que ainda pode entrar na operação do que já foi importado antes. */
export function splitAlreadyImportedServices(
  quoteServices: ImportableQuoteService[],
  existingSourceIds: (string | null | undefined)[],
) {
  const already = new Set(existingSourceIds.filter(Boolean) as string[]);
  const duplicates = quoteServices.filter((s) => already.has(s.id));
  const pending = quoteServices.filter((s) => !already.has(s.id));
  return { pending, duplicates };
}

interface RowContext {
  operationId: string;
  userId: string;
  quoteId: string;
  opportunityId?: string | null;
  startPosition?: number;
}

/**
 * Converte serviços do orçamento em serviços da operação preservando tipo,
 * descrição, datas, valores e ordem, com vínculo rastreável de origem para a
 * futura Central de Reservas. O orçamento original nunca é alterado.
 */
export function mapQuoteServicesToOperationRows(
  quoteServices: ImportableQuoteService[],
  ctx: RowContext,
) {
  const base = ctx.startPosition ?? 0;
  return quoteServices.map((s, idx) => {
    const data = (s.service_data || {}) as Record<string, any>;
    const mapped = mapServiceDataToOperationService(
      s.service_type || "other",
      data,
      Number(s.amount) || 0,
    );
    return {
      operation_id: ctx.operationId,
      user_id: ctx.userId,
      source_quote_service_id: s.id,
      service_type: mapped.service_type,
      name: mapped.name,
      supplier: mapped.supplier,
      destination: mapped.destination,
      start_date: mapped.start_date,
      end_date: mapped.end_date,
      amount: Number(s.amount) || mapped.amount || 0,
      notes: s.description ?? null,
      service_data: {
        ...data,
        imported_from: {
          quote_id: ctx.quoteId,
          quote_service_id: s.id,
          opportunity_id: ctx.opportunityId ?? null,
          operation_id: ctx.operationId,
        },
      },
      position: typeof s.order_index === "number" ? s.order_index : base + idx,
    };
  });
}
