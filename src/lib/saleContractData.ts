import type {
  AgencyContractTemplate,
  ContractInstallment,
  ContractPassenger,
  ContractPayload,
  ContractReceivedPayment,
  ContractService,
  ContractSigner,
  ContractTemplateSection,
} from '@/types/contracts';
import { PRODUCT_TYPES, type Sale, type SaleProduct, type CustomerPayment } from '@/types/financial';
import type { ScopeProvenanceEntry } from '@/lib/contractScope';
import type { InsuranceFieldProvenance } from '@/lib/insuranceSources';

export interface TravelerRow {
  id: string;
  nome_completo: string;
  data_nascimento: string | null;
  cpf: string | null;
  passaporte: string | null;
  validade_passaporte: string | null;
  nacionalidade: string | null;
  observacoes: string | null;
  is_responsavel: boolean;
}

export interface ClientRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
}

export interface AgencyProfileRow {
  name?: string | null;
  agency_name?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  avatar_url?: string | null;
  logo_url?: string | null;
}

/** Parse "YYYY-MM-DD" as a local date (avoids UTC shift). */
export function parseLocalDate(value?: string | null): Date | null {
  if (!value) return null;
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function formatDateBR(value?: string | null): string {
  const d = parseLocalDate(value);
  if (!d) return '—';
  return d.toLocaleDateString('pt-BR');
}

export function formatMoney(value: number, currency = 'BRL'): string {
  return (Number(value) || 0).toLocaleString('pt-BR', { style: 'currency', currency });
}

export function diffNights(start?: string | null, end?: string | null): number | null {
  const a = parseLocalDate(start);
  const b = parseLocalDate(end);
  if (!a || !b) return null;
  const ms = b.getTime() - a.getTime();
  return ms > 0 ? Math.round(ms / 86400000) : 0;
}

/** Soma meses no calendário real: preserva o dia e ajusta para o último dia do mês quando necessário. */
export function addMonthsKeepingDay(iso: string, months: number): string {
  const base = parseLocalDate(iso);
  if (!base) return iso;
  const day = base.getDate();
  const target = new Date(base.getFullYear(), base.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${target.getFullYear()}-${p(target.getMonth() + 1)}-${p(target.getDate())}`;
}

const round2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

function ageAt(birth?: string | null, refDate?: string | null): number | null {
  const b = parseLocalDate(birth);
  const r = parseLocalDate(refDate) ?? new Date();
  if (!b) return null;
  let age = r.getFullYear() - b.getFullYear();
  const m = r.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && r.getDate() < b.getDate())) age--;
  return age;
}

function categoryFor(age: number | null): ContractPassenger['category'] {
  if (age === null) return 'adulto';
  if (age < 2) return 'bebe';
  if (age < 12) return 'crianca';
  return 'adulto';
}

export function mapTravelerToPassenger(t: TravelerRow, tripDate?: string | null): ContractPassenger {
  const age = ageAt(t.data_nascimento, tripDate);
  return {
    name: t.nome_completo,
    cpf: t.cpf ?? undefined,
    birth_date: t.data_nascimento ?? undefined,
    age_at_trip: age,
    category: categoryFor(age),
    nationality: t.nacionalidade ?? undefined,
    passport: t.passaporte ?? undefined,
    passport_validity: t.validade_passaporte ?? undefined,
    is_minor: age !== null && age < 18,
    notes: t.observacoes ?? undefined,
  };
}

export function mapProductToService(
  p: SaleProduct,
  operatorName?: string | null,
): ContractService {
  const supplier = p.supplier_name?.trim() || undefined;
  const operator = operatorName?.trim() || undefined;
  // Não duplicar quando fornecedor e operadora forem o mesmo nome.
  const sameName =
    !!supplier && !!operator && supplier.toLocaleLowerCase() === operator.toLocaleLowerCase();
  return {
    type: p.product_type,
    type_label: PRODUCT_TYPES[p.product_type] ?? p.product_type,
    description: p.description ?? undefined,
    supplier,
    operator: sameName ? undefined : operator,
    amount: Number(p.sale_price) || 0,
    currency: 'BRL',
    refundable: 'nao_informado',
  };
}

/** Editable fields the agent may complete before generating the contract. */
export interface ContractDraftOverrides {
  client_document?: string;
  client_person_type?: 'fisica' | 'juridica';
  client_address?: string;
  client_birth_date?: string;
  client_nationality?: string;
  client_is_passenger?: boolean;
  financial_responsible?: string;
  emission_city?: string;
  seller_name?: string;
  external_reference?: string;
  trip_title?: string;
  trip_scope?: 'nacional' | 'internacional' | '';
  trip_origin?: string;
  trip_purpose?: string;
  trip_program_note?: string;
  included?: string;
  not_included?: string;
  payment_method?: string;
  installments_count?: number | null;
  installment_value?: number | null;
  /** Data do 1º vencimento das parcelas futuras (YYYY-MM-DD). */
  first_due_date?: string;
  due_dates?: string;
  down_payment?: number;
  paid_to_supplier?: number;
  discounts?: number;
  taxes?: number;
  service_fee?: number;
  financial_notes?: string;
  insurance_contracted?: boolean;
  insurance_insurer?: string;
  insurance_plan?: string;
  insurance_validity?: string;
  insurance_coverage?: string;
  insurance_covered?: string;
  insurance_refusal_ack?: boolean;
  /** Proveniência auditável dos campos de seguro importados de fontes vinculadas. */
  insurance_provenance?: InsuranceFieldProvenance[];
  /** Proveniência auditável dos itens de escopo sugeridos por IA e confirmados pela agência. */
  scope_provenance?: ScopeProvenanceEntry[];
  conditions_penalties?: string;
  conditions_no_show?: string;
  conditions_baggage?: string;
  conditions_destination_fees?: string;
  conditions_documentation?: string;
  conditions_minors?: string;
  conditions_general?: string;
  attachments?: string;
  passenger_ids?: string[];
  /** Passageiros com papel explícito de assinatura, confirmado pela agência. */
  signatory_ids?: string[];
}

export interface BuildContractInput {
  sale: Sale;
  products: SaleProduct[];
  payments: CustomerPayment[];
  client: ClientRow | null;
  travelers: TravelerRow[];
  agencyProfile: AgencyProfileRow | null;
  /** operator_id -> nome da operadora/consolidadora */
  operatorNames?: Record<string, string>;
  template: AgencyContractTemplate | null;
  sections: ContractTemplateSection[];
  overrides: ContractDraftOverrides;
  contractNumber: string;
  revision: number;
}

function splitLines(value?: string): string[] {
  return (value ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * Formata o método de pagamento apenas para leitura humana no documento.
 * Nunca altera o dado persistido no banco.
 */
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: 'PIX',
  credito: 'cartão de crédito',
  credit: 'cartão de crédito',
  cartao_credito: 'cartão de crédito',
  cartao_de_credito: 'cartão de crédito',
  debito: 'cartão de débito',
  cartao_debito: 'cartão de débito',
  transferencia: 'transferência bancária',
  boleto: 'Boleto',
  dinheiro: 'Dinheiro',
};

export function formatPaymentMethodLabel(method?: string | null): string {
  const raw = (method ?? '').trim();
  if (!raw) return '';
  const key = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
  if (PAYMENT_METHOD_LABELS[key]) return PAYMENT_METHOD_LABELS[key];
  const words = key.split('_').filter(Boolean);
  if (!words.length) return raw;
  const pretty = raw.replace(/_/g, ' ').trim();
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}

export interface PaymentPlan {
  received: ContractReceivedPayment[];
  schedule: ContractInstallment[];
  paid: number;
  pending: number;
  installmentsCount: number | null;
  installmentValue: number | null;
  summary: string;
  /** Última data de pagamento já recebido (YYYY-MM-DD) ou null. */
  lastReceivedDate: string | null;
}

/**
 * Constrói o plano de pagamento do contrato exclusivamente a partir de dados registrados:
 * pagamentos efetivamente recebidos (customer_payments) + parcelamento confirmado pela agência.
 * Nunca infere cronograma quando faltam dados — nesse caso `schedule` fica vazio e a validação bloqueia.
 */
export function buildPaymentPlan(args: {
  total: number;
  currency: string;
  payments: { date: string; amount: number; method: string }[];
  installmentsCount?: number | null;
  installmentValue?: number | null;
  firstDueDate?: string;
  manualDueDates?: string;
  paymentMethod?: string;
  paidToSupplier?: number;
}): PaymentPlan {
  const ordered = [...args.payments]
    .filter((p) => !!p.date)
    .sort((a, b) => a.date.localeCompare(b.date));
  const received: ContractReceivedPayment[] = ordered.map((p, i) => ({
    date: p.date.slice(0, 10),
    amount: round2(p.amount),
    method: p.method,
    kind: i === 0 ? 'entrada' : 'adicional',
  }));
  const paid = round2(received.reduce((s, p) => s + p.amount, 0));
  const pending = round2(Math.max(0, args.total - paid));
  const lastReceivedDate = received.length ? received[received.length - 1].date : null;

  const count = args.installmentsCount && args.installmentsCount > 0 ? args.installmentsCount : null;
  const value = args.installmentValue && args.installmentValue > 0 ? round2(args.installmentValue) : null;

  const schedule: ContractInstallment[] = [];
  if (count && value && args.firstDueDate) {
    for (let i = 0; i < count; i++) {
      schedule.push({
        number: i + 1,
        due_date: addMonthsKeepingDay(args.firstDueDate, i),
        amount: value,
      });
    }
  }

  const money = (v: number) => formatMoney(v, args.currency);
  const parts: string[] = [];
  received.forEach((p) => {
    parts.push(
      p.kind === 'entrada'
        ? `Entrada de ${money(p.amount)} recebida${p.method ? ` via ${p.method}` : ''} em ${formatDateBR(p.date)}`
        : `Pagamento adicional de ${money(p.amount)} recebido${p.method ? ` via ${p.method}` : ''} em ${formatDateBR(p.date)}`,
    );
  });
  if (pending > 0) {
    if (count && value) {
      const dates = schedule.length
        ? ` com vencimentos de ${formatDateBR(schedule[0].due_date)} a ${formatDateBR(
            schedule[schedule.length - 1].due_date,
          )}`
        : args.manualDueDates
          ? ` conforme vencimentos informados: ${args.manualDueDates}`
          : '';
      parts.push(`Saldo pendente de ${money(pending)} parcelado em ${count}x de ${money(value)}${dates}`);
    } else {
      parts.push(`Saldo pendente de ${money(pending)}`);
    }
  } else if (received.length) {
    parts.push('Contrato integralmente quitado junto à CONTRATADA');
  }
  if (args.paidToSupplier && args.paidToSupplier > 0) {
    parts.push(
      `Adicionalmente, ${money(round2(args.paidToSupplier))} foram pagos pelo CONTRATANTE diretamente ao fornecedor (informativo; não abate o saldo devido à CONTRATADA)`,
    );
  }
  const prefix = args.paymentMethod ? `${args.paymentMethod.trim().replace(/\.$/, '')}. ` : '';
  const summary = parts.length ? `${prefix}${parts.join('. ')}.` : prefix.trim();

  return {
    received,
    schedule,
    paid,
    pending,
    installmentsCount: count,
    installmentValue: value,
    summary,
    lastReceivedDate,
  };
}

/** Assinantes adicionais: somente adultos com papel explícito marcado pela agência. */
export function buildSigners(
  passengers: ContractPassenger[],
  selectedNames: string[],
): ContractSigner[] {
  const norm = (v: string) => v.trim().toLocaleLowerCase();
  const wanted = new Set(selectedNames.map(norm));
  return passengers
    .filter((p) => !p.is_minor && p.category === 'adulto' && wanted.has(norm(p.name)))
    .map((p) => ({ name: p.name, role: 'anuente' as const, document: p.cpf }));
}

export function buildContractPayload(input: BuildContractInput): ContractPayload {
  const { sale, products, payments, client, travelers, agencyProfile, template, sections, overrides } = input;
  const header = template?.header_config ?? {};

  const selected = overrides.passenger_ids
    ? travelers.filter((t) => overrides.passenger_ids!.includes(t.id))
    : travelers;
  const passengers = selected.map((t) => mapTravelerToPassenger(t, sale.start_date));
  // Menores sempre precisam de responsável identificado: o contratante responde por eles
  // quando o cadastro do viajante não traz um responsável próprio.
  const contractorName = client?.name || sale.client_name || '';
  for (const p of passengers) {
    if (p.is_minor && !p.guardian && contractorName) p.guardian = contractorName;
  }

  const services = products.map((p) =>
    mapProductToService(
      p,
      p.operator_id ? input.operatorNames?.[p.operator_id] : undefined,
    ),
  );
  const gross = services.reduce((s, x) => s + x.amount, 0) || Number(sale.sale_amount) || 0;
  const discounts = Number(overrides.discounts) || 0;
  const taxes = Number(overrides.taxes) || 0;
  const serviceFee = Number(overrides.service_fee) || 0;
  const total = Math.max(0, gross - discounts + taxes + serviceFee);
  const downPayment = Number(overrides.down_payment) || 0;
  const rawPayments = payments.map((p) => ({
    date: p.payment_date,
    amount: Number(p.amount) || 0,
    method: p.payment_method,
  }));
  const plan = buildPaymentPlan({
    total,
    currency: 'BRL',
    payments: rawPayments,
    installmentsCount: overrides.installments_count,
    installmentValue: overrides.installment_value,
    firstDueDate: overrides.first_due_date,
    manualDueDates: overrides.due_dates,
    paymentMethod: overrides.payment_method || sale.payment_method || undefined,
    paidToSupplier: Number(overrides.paid_to_supplier) || 0,
  });

  const selectedSignatoryNames = (overrides.signatory_ids ?? [])
    .map((id) => travelers.find((t) => t.id === id)?.nome_completo)
    .filter((v): v is string => !!v)
    .filter((name) => name.trim().toLocaleLowerCase() !== contractorName.trim().toLocaleLowerCase());
  const signers = buildSigners(passengers, selectedSignatoryNames);

  const nights = diffNights(sale.start_date, sale.end_date);

  return {
    contract_title: template?.contract_title || 'Contrato de Prestação de Serviços Turísticos',
    contract_number: input.contractNumber,
    revision: input.revision,
    emission_city: overrides.emission_city || header.emission_city || agencyProfile?.city || '',
    emitted_at: new Date().toISOString(),
    sale_reference: sale.id,
    external_reference: overrides.external_reference,
    seller_name: overrides.seller_name,
    agency: {
      ...header,
      trade_name: header.trade_name || agencyProfile?.agency_name || agencyProfile?.name || '',
      phone: header.phone || agencyProfile?.phone || '',
      logo_url: template?.logo_url ?? agencyProfile?.logo_url ?? null,
    },
    client: {
      name: client?.name || sale.client_name,
      document: overrides.client_document,
      person_type: overrides.client_person_type ?? 'fisica',
      birth_date: overrides.client_birth_date,
      nationality: overrides.client_nationality,
      email: client?.email ?? undefined,
      phone: client?.phone ?? undefined,
      address: overrides.client_address,
      is_passenger: overrides.client_is_passenger ?? true,
      financial_responsible: overrides.financial_responsible,
    },
    passengers,
    signers,
    trip: {
      title: overrides.trip_title || sale.destination,
      scope: overrides.trip_scope ?? '',
      origin: overrides.trip_origin,
      destination: sale.destination,
      start_date: sale.start_date ?? null,
      end_date: sale.end_date ?? null,
      nights,
      days: nights === null ? null : nights + 1,
      passengers_count: passengers.length,
      purpose: overrides.trip_purpose,
      program_note: overrides.trip_program_note,
    },
    services,
    included: splitLines(overrides.included),
    not_included: splitLines(overrides.not_included),
    financial: {
      gross,
      discounts,
      taxes,
      service_fee: serviceFee,
      total,
      currency: 'BRL',
      down_payment: downPayment,
      balance: Math.max(0, total - downPayment),
      paid: plan.paid,
      pending: plan.pending,
      paid_to_supplier: Number(overrides.paid_to_supplier) || 0,
      payment_method: overrides.payment_method || sale.payment_method || undefined,
      installments_count: plan.installmentsCount,
      installment_value: plan.installmentValue,
      due_dates: overrides.due_dates,
      notes: overrides.financial_notes,
      payments: rawPayments,
      received: plan.received,
      schedule: plan.schedule,
      payment_summary: plan.summary,
    },
    conditions: {
      penalties: overrides.conditions_penalties,
      no_show: overrides.conditions_no_show,
      baggage: overrides.conditions_baggage,
      destination_fees: overrides.conditions_destination_fees,
      documentation: overrides.conditions_documentation,
      minors: overrides.conditions_minors,
      general_notes: overrides.conditions_general,
    },
    insurance: {
      contracted: !!overrides.insurance_contracted,
      insurer: overrides.insurance_insurer,
      plan: overrides.insurance_plan,
      validity: overrides.insurance_validity,
      coverage: overrides.insurance_coverage,
      covered_passengers: overrides.insurance_covered,
      refusal_acknowledged: !!overrides.insurance_refusal_ack,
      provenance: overrides.insurance_provenance?.length
        ? overrides.insurance_provenance
        : undefined,
    },
    attachments: splitLines(overrides.attachments).map((label) => ({ label })),
    legal_body_html: template?.legal_body_html ?? '',
    sections: [...sections]
      .sort((a, b) => a.display_order - b.display_order)
      .map((s) => ({ title: s.title, body_html: s.body_html })),
    signature_config: template?.signature_config ?? {},
    footer_config: template?.footer_config ?? {},
  };
}

export interface ContractValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/** Blocking checks (error) and advisory checks (warning) before generating. */
export function validateContractPayload(payload: ContractPayload): ContractValidationIssue[] {
  const issues: ContractValidationIssue[] = [];
  const push = (field: string, message: string, severity: 'error' | 'warning' = 'error') =>
    issues.push({ field, message, severity });

  if (!payload.agency.trade_name) push('agency', 'Nome da agência não configurado no modelo de contrato.');
  if (!payload.agency.cnpj) push('agency_cnpj', 'CNPJ da agência não informado no modelo.', 'warning');
  if (!payload.client.name) push('client_name', 'Nome do contratante é obrigatório.');
  if (!payload.client.document) push('client_document', 'CPF/CNPJ do contratante é obrigatório.');
  if (!payload.passengers.length) push('passengers', 'Inclua ao menos um passageiro.');
  payload.passengers.forEach((p, i) => {
    if (!p.name) push(`passenger_${i}`, `Passageiro ${i + 1} sem nome.`);
    if (!p.cpf && !p.passport)
      push(`passenger_doc_${i}`, `Passageiro ${p.name || i + 1} sem CPF ou passaporte.`, 'warning');
    if (p.is_minor && !p.guardian)
      push(`passenger_minor_${i}`, `Passageiro menor de idade (${p.name}) sem responsável indicado.`, 'warning');
  });
  if (!payload.services.length) push('services', 'Nenhum serviço vinculado à venda.');
  if (!payload.trip.destination) push('destination', 'Destino é obrigatório.');
  if (!payload.trip.start_date || !payload.trip.end_date)
    push('dates', 'Datas de ida e volta não informadas na venda.', 'warning');
  if (payload.financial.total <= 0) push('total', 'Valor total do contrato deve ser maior que zero.');
  if (!payload.financial.payment_method)
    push('payment_method', 'Forma de pagamento não informada.', 'warning');

  // ── Coerência do parcelamento com os pagamentos registrados ──
  const f = payload.financial;
  const cents = (v: number) => Math.round((Number(v) || 0) * 100);
  if (f.pending > 0) {
    if (!f.installments_count || !f.installment_value) {
      push(
        'installments',
        `Há saldo pendente de ${formatMoney(f.pending, f.currency)}. Informe a quantidade e o valor das parcelas para gerar o cronograma.`,
      );
    } else {
      if (cents(f.installments_count * f.installment_value) !== cents(f.pending)) {
        push(
          'installments_total',
          `O parcelamento (${f.installments_count}x de ${formatMoney(f.installment_value, f.currency)} = ${formatMoney(
            f.installments_count * f.installment_value,
            f.currency,
          )}) não fecha com o saldo pendente de ${formatMoney(f.pending, f.currency)}.`,
        );
      }
      if (!f.schedule.length) {
        push('first_due_date', 'Informe a data do 1º vencimento para gerar o cronograma das parcelas.');
      }
    }
  }
  if (f.schedule.length) {
    const paidDates = new Set(f.received.map((p) => p.date));
    const lastReceived = f.received.length ? f.received[f.received.length - 1].date : null;
    const first = f.schedule[0].due_date;
    if (lastReceived && first <= lastReceived) {
      push(
        'first_due_date',
        `O 1º vencimento (${formatDateBR(first)}) não pode ser anterior ou igual ao último pagamento já recebido (${formatDateBR(lastReceived)}).`,
      );
    }
    const overlap = f.schedule.filter((i) => paidDates.has(i.due_date));
    if (overlap.length)
      push(
        'schedule_overlap',
        `Há parcela com vencimento na mesma data de um pagamento já registrado (${overlap
          .map((i) => formatDateBR(i.due_date))
          .join(', ')}).`,
      );
  }
  if (f.down_payment > 0 && f.received.length && cents(f.down_payment) !== cents(f.received[0].amount))
    push(
      'down_payment',
      `A entrada informada (${formatMoney(f.down_payment, f.currency)}) difere do primeiro pagamento registrado (${formatMoney(
        f.received[0].amount,
        f.currency,
      )}).`,
      'warning',
    );

  if (!payload.insurance.contracted && !payload.insurance.refusal_acknowledged)
    push('insurance', 'Registre a ciência da recusa do seguro viagem.', 'warning');
  if (!payload.legal_body_html && !payload.sections.length)
    push('template', 'O modelo de contrato desta agência ainda não possui texto jurídico.');
  return issues;
}

/** Stable hash of the frozen data, used to detect divergence from the live sale. */
export function hashPayload(payload: unknown): string {
  const json = JSON.stringify(payload);
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < json.length; i++) {
    const c = json.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 + c, 2654435761) >>> 0;
  }
  return `${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}

export function buildContractNumber(saleId: string, revision: number, date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const suffix = saleId.replace(/-/g, '').slice(0, 6).toUpperCase();
  return `CT-${y}${m}-${suffix}-${String(revision).padStart(2, '0')}`;
}