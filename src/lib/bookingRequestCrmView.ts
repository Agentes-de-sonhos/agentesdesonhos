/**
 * Visão de CRM dos serviços de um pedido de reserva.
 *
 * Os SELECIONADOS vêm sempre do snapshot imutável (`quote_booking_request_items`),
 * nunca do estado atual da quote. Os NÃO SELECIONADOS vêm de `quote_services`,
 * apenas para dar contexto do que foi oferecido.
 */
import { serviceTypeLabel } from "@/lib/operationServiceMap";
import {
  bookingItemAmount,
  bookingItemLabel,
  type BookingRequestItemRow,
} from "@/lib/bookingRequestItems";

export interface QuoteServiceRow {
  id: string;
  service_type?: string | null;
  option_label?: string | null;
  amount?: number | string | null;
  selection_mode?: string | null;
  service_data?: Record<string, unknown> | null;
}

export interface RequestedServiceView {
  key: string;
  selected: boolean;
  label: string;
  serviceType: string;
  amount: number;
  quantity: number;
  selectionMode: string | null;
  details: string[];
}

export interface RequestedServicesView {
  selected: RequestedServiceView[];
  unselected: RequestedServiceView[];
  selectedTotal: number;
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/**
 * Rótulo específico do item selecionado, lido do SNAPSHOT imutável.
 * Os snapshots reais gravam `service_name` genérico ("hotel", "flight"),
 * então preferimos o nome comercial guardado no snapshot antes do fallback.
 * Nada aqui altera o snapshot: apenas leitura.
 */
export function requestedItemLabel(item: BookingRequestItemRow): string {
  const snap = ((item as any)?.snapshot || {}) as Record<string, any>;
  const data = (snap.service_data && typeof snap.service_data === "object" ? snap.service_data : {}) as Record<string, any>;
  const generic = new Set([
    "hotel",
    "flight",
    "insurance",
    "transfer",
    "attraction",
    "cruise",
    "car_rental",
    "rail_transport",
    "circuit",
    "other",
  ]);
  const specific = [
    snap.option_label,
    data.custom_title,
    data.name,
    data.hotel_name,
    data.airline,
    data.provider,
    data.rental_company,
    data.ship_name,
    data.circuit_name,
    data.company_name,
    data.product_name,
  ]
    .map(str)
    .find((v) => v.length > 0);
  if (specific) return specific;

  const name = str(item?.service_name);
  // service_name genérico não informa nada: usa o rótulo humano do tipo.
  if (name && !generic.has(name.toLowerCase())) return name;
  const typed = serviceTypeLabel(str(item?.service_type) || undefined);
  return typed || bookingItemLabel(item);
}

function quoteServiceLabel(s: QuoteServiceRow): string {
  const data = (s.service_data || {}) as Record<string, unknown>;
  return (
    str(s.option_label) ||
    str(data.custom_title) ||
    str(data.name) ||
    str(data.hotel_name) ||
    serviceTypeLabel(s.service_type || "") ||
    "Serviço"
  );
}

/** Detalhes curtos e seguros extraídos do snapshot/service_data. */
export function requestedServiceDetails(source: Record<string, unknown> | null | undefined): string[] {
  const raw = (source || {}) as Record<string, any>;
  const data = (raw.service_data && typeof raw.service_data === "object" ? raw.service_data : raw) as Record<string, any>;
  const out: string[] = [];
  const push = (label: string, value: unknown) => {
    const v = typeof value === "number" ? String(value) : str(value);
    if (v) out.push(`${label}: ${v}`);
  };
  push("Fornecedor", data.supplier || data.operator || data.airline);
  push("Local", data.destination || data.city || data.location || data.hotel_name);
  push("Início", data.start_date || data.check_in || data.departure_date);
  push("Fim", data.end_date || data.check_out || data.return_date);
  push("Passageiros", data.passengers || data.pax || data.travelers);
  return out.slice(0, 4);
}

export function buildRequestedServicesView(input: {
  items: BookingRequestItemRow[];
  quoteServices: QuoteServiceRow[];
}): RequestedServicesView {
  const items = input.items || [];
  const services = input.quoteServices || [];

  const selected: RequestedServiceView[] = items.map((it, index) => ({
    key: it.id || `item-${index}`,
    selected: true,
    label: requestedItemLabel(it),
    serviceType: serviceTypeLabel(it.service_type || "") || "Serviço",
    amount: bookingItemAmount(it),
    quantity: Math.max(1, Number(it.quantity) || 1),
    selectionMode: it.selection_mode_snapshot ?? null,
    details: requestedServiceDetails((it as any).snapshot),
  }));

  const selectedSourceIds = new Set(
    items
      .map((it) => str((it as any).source_quote_service_id))
      .filter((v) => v.length > 0),
  );

  const unselected: RequestedServiceView[] = services
    .filter((s) => !selectedSourceIds.has(s.id))
    .map((s) => ({
      key: s.id,
      selected: false,
      label: quoteServiceLabel(s),
      serviceType: serviceTypeLabel(s.service_type || "") || "Serviço",
      amount: Number(s.amount) || 0,
      quantity: 1,
      selectionMode: s.selection_mode ?? null,
      details: requestedServiceDetails(s.service_data),
    }));

  return {
    selected,
    unselected,
    selectedTotal: selected.reduce((acc, s) => acc + s.amount, 0),
  };
}

/** Pedido ativo mais recente: ignora superseded/cancelled/expired. */
export function pickActiveBookingRequest<T extends { status?: string | null; version?: number | null; created_at?: string | null }>(
  requests: T[],
): T | null {
  const inactive = new Set(["superseded", "cancelled", "expired"]);
  const list = (requests || []).filter((r) => !inactive.has(str(r.status)));
  if (list.length === 0) return null;
  return [...list].sort((a, b) => {
    const v = (Number(b.version) || 0) - (Number(a.version) || 0);
    if (v !== 0) return v;
    return str(b.created_at).localeCompare(str(a.created_at));
  })[0];
}