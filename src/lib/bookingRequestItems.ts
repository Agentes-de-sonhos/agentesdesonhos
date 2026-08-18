import { serviceTypeLabel } from "@/lib/operationServiceMap";

/**
 * Formato REAL dos itens de quote_booking_request_items.
 * Nomes de coluna: service_name, amount_snapshot, selection_mode_snapshot.
 */
export interface BookingRequestItemRow {
  id?: string;
  service_type?: string | null;
  service_name?: string | null;
  amount_snapshot?: number | string | null;
  selection_mode_snapshot?: string | null;
  quantity?: number | null;
}

export const BOOKING_ITEMS_SELECT =
  "id, service_type, service_name, amount_snapshot, selection_mode_snapshot, quantity";

export const SELECTION_MODE_LABEL: Record<string, string> = {
  required: "obrigatório",
  optional: "opcional",
  alternative: "alternativa",
  free: "livre",
};

/** Nome do serviço com fallback por service_type. */
export function bookingItemLabel(item: BookingRequestItemRow): string {
  const name = (item?.service_name ?? "").trim();
  if (name) return name;
  return serviceTypeLabel(item?.service_type || "") || "Serviço";
}

/** Valor do snapshot multiplicado pela quantidade (mínimo 1). */
export function bookingItemAmount(item: BookingRequestItemRow): number {
  const amount = Number(item?.amount_snapshot) || 0;
  const qty = Math.max(1, Number(item?.quantity) || 1);
  return amount * qty;
}
