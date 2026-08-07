import type { OperationPaymentStatus } from "@/types/operations";

export interface PayableServiceLike {
  amount?: number | null;
  is_paid?: boolean | null;
  service_data?: Record<string, any> | null;
}

const CANCELLED = ["cancelado", "cancelled", "canceled"];

/** Serviço entra no cálculo financeiro apenas se tiver valor e não estiver cancelado. */
export function isPayableService(s: PayableServiceLike): boolean {
  if (!(Number(s.amount) > 0)) return false;
  const data = s.service_data || {};
  if (data.cancelled === true || data.cancelled === "true") return false;
  const status = String(data.status ?? "").toLowerCase();
  if (CANCELLED.includes(status)) return false;
  return true;
}

/**
 * Mesma regra aplicada no backend (compute_operation_payment_status):
 * nenhum pago = pendente, todos pagos = pago, caso contrário parcial.
 */
export function computeOperationPaymentStatus(
  services: PayableServiceLike[],
): OperationPaymentStatus {
  const payable = (services || []).filter(isPayableService);
  if (payable.length === 0) return "pendente";
  const paid = payable.filter((s) => !!s.is_paid).length;
  if (paid === 0) return "pendente";
  if (paid === payable.length) return "pago";
  return "parcial";
}

export const PAYMENT_STATUS_LABELS: Record<OperationPaymentStatus, string> = {
  pendente: "Pendente",
  parcial: "Parcial",
  pago: "Pago",
};