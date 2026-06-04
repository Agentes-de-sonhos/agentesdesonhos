import { CommissionReceivable } from "@/hooks/useCommissionsReceivable";

export const fmt = (v: number) =>
  (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const todayStr = () => new Date().toISOString().slice(0, 10);

export const addDaysStr = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const isActive = (c: CommissionReceivable) =>
  c.status !== "cancelado";

export const isReceived = (c: CommissionReceivable) => c.status === "recebido";

export const isPartial = (c: CommissionReceivable) =>
  c.status === "recebido_parcial" ||
  (isActive(c) && !isReceived(c) && (Number(c.received_amount) || 0) > 0);

export const remainingAmount = (c: CommissionReceivable) =>
  Math.max((Number(c.commission_amount) || 0) - (Number(c.received_amount) || 0), 0);

export const isOverdue = (c: CommissionReceivable) =>
  isActive(c) && !isReceived(c) && remainingAmount(c) > 0 && !!c.expected_date && c.expected_date < todayStr();

export const isDueWithin = (c: CommissionReceivable, days: number) => {
  if (!isActive(c) || isReceived(c) || !c.expected_date) return false;
  const today = todayStr();
  const limit = addDaysStr(days);
  return c.expected_date >= today && c.expected_date <= limit;
};

export const requiresInvoicePending = (c: CommissionReceivable) =>
  isActive(c) && c.requires_invoice && (c.invoice_status === "a_emitir" || c.invoice_status === "emitida");

export const INVOICE_STATUS_LABEL: Record<string, string> = {
  a_emitir: "A Emitir",
  emitida: "Emitida",
  enviada: "Enviada",
  dispensada: "Dispensada",
};

export const PRODUCT_LABEL: Record<string, string> = {
  aereo: "Aéreo",
  hotel: "Hotel",
  seguro: "Seguro",
  cruzeiro: "Cruzeiro",
  transfer: "Transfer",
  atracao: "Atrações",
  locacao: "Locação",
  outro: "Outro",
};