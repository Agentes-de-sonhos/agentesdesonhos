export type InvoiceStatus = "draft" | "sent" | "partial" | "paid" | "cancelled" | "overdue";
export type InvoiceSourceType = "manual" | "quote" | "trip" | "opportunity" | "operation";
export type InvoiceServiceCategory =
  | "aereo" | "hotel" | "cruzeiro" | "seguro" | "passeio"
  | "transfer" | "ingresso" | "pacote" | "outros";
export type InvoiceInstallmentStatus = "pending" | "paid" | "overdue";

export const INVOICE_SERVICE_CATEGORIES: Record<InvoiceServiceCategory, string> = {
  aereo: "Aéreo",
  hotel: "Hotel",
  cruzeiro: "Cruzeiro",
  seguro: "Seguro",
  passeio: "Passeio",
  transfer: "Transfer",
  ingresso: "Ingresso",
  pacote: "Pacote",
  outros: "Outros",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Rascunho",
  sent: "Enviada",
  partial: "Parcialmente paga",
  paid: "Paga",
  cancelled: "Cancelada",
  overdue: "Vencida",
};

export const INVOICE_PAYMENT_METHODS: Record<string, string> = {
  pix: "PIX",
  cartao: "Cartão",
  dinheiro: "Dinheiro",
  transferencia: "Transferência",
  boleto: "Boleto",
  outros: "Outros",
};

export interface InvoiceService {
  id: string;
  invoice_id: string;
  user_id: string;
  order_index: number;
  category: InvoiceServiceCategory;
  description: string | null;
  fare: number;
  taxes: number;
  discount: number;
  commission: number;
  rav: number;
  net_amount: number;
  final_amount: number;
}

export interface InvoiceInstallment {
  id: string;
  invoice_id: string;
  user_id: string;
  installment_number: number;
  label: string | null;
  amount: number;
  due_date: string | null;
  status: InvoiceInstallmentStatus;
  paid_at: string | null;
}

export interface InvoicePayment {
  id: string;
  invoice_id: string;
  installment_id: string | null;
  user_id: string;
  amount: number;
  payment_date: string;
  method: string;
  notes: string | null;
  receipt_number: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  status: InvoiceStatus;
  source_type: InvoiceSourceType;
  source_id: string | null;

  client_id: string | null;
  client_name: string;
  client_company: string | null;
  client_document: string | null;
  client_email: string | null;
  client_phone: string | null;

  destination: string | null;
  travel_start: string | null;
  travel_end: string | null;
  passengers: Array<{ name?: string; document?: string }> | null;

  subtotal: number;
  taxes_total: number;
  discount_total: number;
  commission_total: number;
  rav_total: number;
  total_amount: number;
  paid_amount: number;
  balance: number;
  estimated_profit: number;

  currency: string;
  notes: string | null;
  terms: string | null;

  pix_key: string | null;
  pix_qr_payload: string | null;

  public_access_code: string | null;
  agency_slug: string | null;

  created_at: string;
  updated_at: string;

  services?: InvoiceService[];
  installments?: InvoiceInstallment[];
  payments?: InvoicePayment[];
}

export interface InvoiceServiceInput {
  category: InvoiceServiceCategory;
  description?: string;
  fare: number;
  taxes: number;
  discount: number;
  commission: number;
  rav: number;
}

export function computeServiceTotals(s: InvoiceServiceInput) {
  const net = (s.fare || 0) - (s.discount || 0);
  const final = net + (s.taxes || 0);
  return { net_amount: net, final_amount: final };
}

export function computeInvoiceTotals(services: InvoiceServiceInput[]) {
  let subtotal = 0, taxes = 0, discount = 0, commission = 0, rav = 0, total = 0;
  for (const s of services) {
    subtotal += s.fare || 0;
    taxes += s.taxes || 0;
    discount += s.discount || 0;
    commission += s.commission || 0;
    rav += s.rav || 0;
    const { final_amount } = computeServiceTotals(s);
    total += final_amount;
  }
  const profit = commission + rav;
  return {
    subtotal,
    taxes_total: taxes,
    discount_total: discount,
    commission_total: commission,
    rav_total: rav,
    total_amount: total,
    estimated_profit: profit,
  };
}